import { StructuredStorage, StagedLayout, fromSchema, toSchema,
    generateNodePortConstraints,
    generateCompactnessForces,
    generateSpringForces,
    constrainNodeOffset,
    generateNodeChildrenConstraints,
    generateNodeAlignmentConstraints,
    constrainNodeNonoverlap,
    BasicOptimizer,
    Vector,
    NodeSchema,
    EdgeSchema,
    NodeId,
} from 'nodal';

type CardinalDirection = "north" | "south" | "east" | "west";

export type LayoutMessage = {
    data: {
        nodeSchemas: NodeSchema[],
        edgeSchemas: EdgeSchema[],
        nodeExpanded: { [nodeId: string]: boolean },
        graphFlowDirection?: CardinalDirection,
        alignments: { axis: "x" | "y", nodes: NodeId[], justify?: "center" | CardinalDirection }[],
    }
}

// const ctx: Worker = self as any;
//     ctx.addEventListener('message', (e) => {
export default function(msg: LayoutMessage) {
        const { nodeSchemas, edgeSchemas, nodeExpanded, graphFlowDirection, alignments } = msg.data;
        const {nodes, edges} = fromSchema(nodeSchemas, edgeSchemas);
        const storage = new StructuredStorage(nodes, edges);
        const shownNodes: NodeSchema[] = [];
        const shownNodeIds = new Set();
        const ordering: any = [];

        const traverse = (u: any) => {
            shownNodes.push(u);
            shownNodeIds.add(u.id);
            ordering.push({ type: 'node', id: u.id });
            if (nodeExpanded[u.id]) {
                u.children.forEach((v: any) => traverse(v));
            }
            else {
                u.children = [];  // Hide children if not expanded.
            }
        }

        storage.roots().forEach((node) => traverse(node));

        const shownEdges = storage.edges().filter(({ source, target}) => shownNodeIds.has(source.id) && shownNodeIds.has(target.id));  // TODO: use edge flags for when compound collapsed
        shownEdges.forEach((edge) => ordering.push({ type: 'edge', id: edge.id }));

        const setEdgeDirection = (e: any) => {
            const lca = storage.leastCommonAncestor(e.source.node, e.target.node);
            if (lca !== undefined) {
                e.meta.flowDirection = lca.meta!.flowDirection;
            }
            else {
                e.meta.flowDirection = graphFlowDirection;
            }
        }
        storage.edges().forEach((edge) => setEdgeDirection(edge));

        const alignmentSets: {x: Set<NodeId>[], y: Set<NodeId>[]} = {
            x: [],
            y: [],
        };
        alignments.forEach((alignment: any) => {
            const sets = alignmentSets[alignment.axis as 'x' | 'y'];
            let found = false;
            for (let set of sets) {
                if (alignment.nodes.some((nodeId: any) => set.has(nodeId))) {
                    found = true;
                    alignment.nodes.forEach((nodeId: any) => set.add(nodeId));
                    break;
                }
            }
            if (!found) {
                sets.push(new Set(alignment.nodes));
            }
        });

        const shownStorage = new StructuredStorage(shownNodes as any, shownEdges);
        const shortestPath = shownStorage.shortestPaths();
        const layout = new StagedLayout(
            storage,
            { steps: 200 },
            {
                iterations: 1,
                optimizer: new BasicOptimizer(0.5),
                generator: function* (storage) {
                    yield* generateSpringForces(
                        storage as StructuredStorage,
                        20,
                        shortestPath,
                        { maxAttraction: 100 },
                    );
                    yield* generateCompactnessForces(storage, 0);
                }
            },
            {
                iterations: 5,
                optimizer: new BasicOptimizer(1),
                generator: function* (storage, step) {

                    if (step > 10) {
                        for (let {source, target, meta} of storage.edges()) {
                            if ((storage as StructuredStorage).hasAncestorOrDescendant(source.node, target.node)) {
                                continue;
                            }
                            let axis: any;
                            let alignmentKey: 'x' | 'y' = 'x';
                            switch(meta!.flowDirection) {
                                case "north":
                                    axis = [0, -1];
                                    alignmentKey = 'x';
                                    break;
                                case "south":
                                    axis = [0, 1];
                                    alignmentKey = 'x';
                                    break;
                                case "west":
                                    axis = [-1, 0];
                                    alignmentKey = 'y';
                                    break;
                                case "east":
                                    axis = [1, 0];
                                    alignmentKey = 'y';
                                    break;
                            }
                            if (!alignmentSets[alignmentKey].some((set) => set.has(target.id)) && (storage as StructuredStorage).siblings(source.node).has(target.node)) {
                                yield constrainNodeOffset(source.node, target.node, ">=", 30, axis);
                            }

                        }
                        for (let alignment of alignments) {
                            const shownNodes = alignment.nodes.filter((nodeId: any) => shownNodeIds.has(nodeId)).map((nodeId: any) => storage.node(nodeId));
                            const axis = alignment.axis === 'x' ? [1, 0] : [0, 1];
                            yield* generateNodeAlignmentConstraints(shownNodes, axis as any, alignment.justify);
                        }
                    }
                    for (let u of storage.nodes()) {
                        // HACK: this needs to come before `constrainShapeCompact`, otherwise the groups will not be the correct size
                        if(step > 100) {
                            for(let sibling of (storage as StructuredStorage).siblings(u)) {
                                yield constrainNodeNonoverlap(u, sibling, 20);
                            }
                        }
                        yield* generateNodeChildrenConstraints(u, 10);
                        yield* generateNodePortConstraints(u);
                    }
                }
            }
        )
        layout.start();
        for (let edge of storage.edges()) {
            const start = edge.path[0];
            const end = edge.path[edge.path.length - 1];
            if (edge.source.node.ports[edge.source.port].location === 'center') {
                start.copy(edge.source.node.shape.boundary((new Vector()).subVectors(end, start)));
            }
            if (edge.target.node.ports[edge.target.port].location === 'center') {
                end.copy(edge.target.node.shape.boundary((new Vector()).subVectors(start, end)));
            }
        }
        return {data: {...toSchema(Array.from(storage.nodes()), Array.from(storage.edges())), bounds: storage.bounds(), ordering}};
        // const {nodeSchemas, edgeSchemas} = toSchema(Array.from(storage.nodes()), Array.from(storage.edges()));
        // ctx.postMessage(({nodeSchemas, edgeSchemas, bounds: elems.bounds(), ordering}));
    };