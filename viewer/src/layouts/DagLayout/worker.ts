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
} from 'nodal';

// const ctx: Worker = self as any;
//     ctx.addEventListener('message', (e) => {
export default function(e: any) {
        const { nodeSchemas, edgeSchemas, nodeExpanded, graphFlowDirection, alignments } = e.data;
        
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
                    );
                    yield* generateCompactnessForces(storage, 0);
                }
            },
            {
                iterations: 5,
                optimizer: new BasicOptimizer(1),
                generator: function* (storage, step) {
                    for (let u of storage.nodes()) {
                        // HACK: this needs to come before `constrainShapeCompact`, otherwise the groups will not be the correct size
                        if(step > 50) {
                            for(let sibling of (storage as StructuredStorage).siblings(u)) {
                                yield constrainNodeNonoverlap(u, sibling);
                            }
                        }
                        yield* generateNodeChildrenConstraints(u, 10);
                        yield* generateNodePortConstraints(u);
                        if (step > 10) {
                            for (let {source, target, meta} of storage.edges()) {
                                if (!(storage as StructuredStorage).hasAncestor(source.node, target.node) && !(storage as StructuredStorage).hasAncestor(target.node, source.node)) {
                                    let axis: any;
                                    switch(meta!.flowDirection) {
                                        case "north":
                                            axis = [0, -1];
                                            break;
                                        case "south":
                                            axis = [0, 1];
                                            break;
                                        case "west":
                                            axis = [-1, 0];
                                            break;
                                        case "east":
                                            axis = [1, 0];
                                            break;
                                    }
                                    yield constrainNodeOffset(source.node, target.node, ">=", 30, axis)
                                }
                            }
                            for (let alignment of alignments) {
                                const shownNodes = alignment.nodes.filter((nodeId: any) => shownNodeIds.has(nodeId)).map((nodeId: any) => storage.node(nodeId));
                                const axis = alignment.axis === 'x' ? [1, 0] : [0, 1];
                                yield* generateNodeAlignmentConstraints(shownNodes, axis as any, alignment.justify);
                            }
                        }
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