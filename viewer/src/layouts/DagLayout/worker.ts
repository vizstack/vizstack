import {
    StructuredStorage,
    StagedLayout,
    fromSchema,
    toSchema,
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
    Node,
    Edge,
    NodeId,
    EdgeId,
} from 'nodal';

type CardinalDirection = "north" | "south" | "east" | "west";

export type LayoutMessage = {
    data: {
        nodeSchemas: NodeSchema[],
        edgeSchemas: EdgeSchema[],
        alignments: { axis: "x" | "y", nodes: NodeId[], justify?: "center" | CardinalDirection }[],
    }
}

// const ctx: Worker = self as any;
//     ctx.addEventListener('message', (e) => {
export default function(msg: LayoutMessage) {
        const { nodeSchemas, edgeSchemas, alignments } = msg.data;
        const { nodes: allNodes, edges: allEdges } = fromSchema(nodeSchemas, edgeSchemas);
        const allStorage = new StructuredStorage(allNodes, allEdges);
        
        // TODO: This should work with only the visible nodes.
        const alignmentSets: {x: Set<NodeId>[], y: Set<NodeId>[]} = {
            x: [],
            y: [],
        };
        // alignments.forEach((alignment: any) => {
        //     const sets = alignmentSets[alignment.axis as 'x' | 'y'];
        //     let found = false;
        //     for (let set of sets) {
        //         if (alignment.nodes.some((nodeId: any) => set.has(nodeId))) {
        //             found = true;
        //             alignment.nodes.forEach((nodeId: any) => set.add(nodeId));
        //             break;
        //         }
        //     }
        //     if (!found) {
        //         sets.push(new Set(alignment.nodes));
        //     }
        // });

        // =========================================================================================
        // Perform layout.

        const visibleStorage = new StructuredStorage(allNodes, allEdges);
        const shortestPath = visibleStorage.shortestPaths();
        const layout = new StagedLayout(
            visibleStorage,
            { steps: 200 },
            {
                iterations: 1,
                optimizer: new BasicOptimizer(0.5),
                generator: function* (storage) {
                    const elems = storage as StructuredStorage;
                    yield* generateSpringForces(elems, 20, shortestPath, { maxAttraction: 100 });
                    yield* generateCompactnessForces(storage, 0);
                }
            },
            {
                iterations: 5,
                optimizer: new BasicOptimizer(1),
                generator: function* (storage, step) {
                    const elems = storage as StructuredStorage;
                    if (step > 10) {
                        for (let {source, target, meta} of storage.edges()) {
                            if (elems.hasAncestorOrDescendant(source.node, target.node)) {
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
                            yield constrainNodeOffset(source.node, target.node, ">=", 30, axis);
                            // if (!alignmentSets[alignmentKey].some((set) => set.has(target.id)) && elems.siblings(source.node).has(target.node)) {
                            //     yield constrainNodeOffset(source.node, target.node, ">=", 30, axis);
                            // }

                        }
                        // for (let alignment of alignments) {
                        //     const shownNodes = alignment.nodes.filter((nodeId: any) => visibleNodeIds.has(nodeId)).map((nodeId: any) => storage.node(nodeId));
                        //     const axis = alignment.axis === 'x' ? [1, 0] : [0, 1];
                        //     yield* generateNodeAlignmentConstraints(shownNodes, axis as any, alignment.justify);
                        // }
                    }
                    for (let u of storage.nodes()) {
                        // HACK: this needs to come before `constrainShapeCompact`, otherwise the groups will not be the correct size
                        if(step > 100) {
                            for(let sibling of elems.siblings(u)) {
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

        // =========================================================================================
        // Retarget edges from center points to boundary points.

        for (let edge of visibleStorage.edges()) {
            const start = edge.path[0];
            const end = edge.path[edge.path.length - 1];
            if (edge.source.node.ports[edge.source.port].location === 'center') {
                start.copy(edge.source.node.shape.boundary((new Vector()).subVectors(end, start)));
            }
            if (edge.target.node.ports[edge.target.port].location === 'center') {
                end.copy(edge.target.node.shape.boundary((new Vector()).subVectors(start, end)));
            }
        }

        return {
            data: {
                ...toSchema(visibleStorage.nodes(), visibleStorage.edges()),
                bounds: visibleStorage.bounds(),
            }
        };
        // const {nodeSchemas, edgeSchemas} = toSchema(Array.from(storage.nodes()), Array.from(storage.edges()));
        // ctx.postMessage(({nodeSchemas, edgeSchemas, bounds: elems.bounds(), ordering}));
    };