import { StructuredStorage, ForceConstraintLayout, fromSchema, toSchema,
    nudgePair,
    constrainNodePorts,
    constrainNodeOffset,
    constrainNodeChildren,
    constrainNodeNonoverlap,
    BasicOptimizer,
    Vector,
} from 'nodal';


function* forceSpringModel(
    elems,
    shortestPath,
    idealLength,
    compactness,
) {
    const visited = new Set();
    for(let u of elems.nodes()) {
        visited.add(u);
        // Compound nodes should pull children closer.
        if(u.children.length > 0) {
            for(let child of u.children) {
                yield nudgePair(u.center, child.center, -compactness*(u.center.distanceTo(child.center)));
            };
        }
        for(let v of elems.nodes()) {
            if(visited.has(v)) continue;
            if(u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Spring force. Attempt to reach ideal distance between all pairs,
            // except unconnected pairs that are farther away than ideal.
            const uvPath = shortestPath(u, v);
            if(uvPath === undefined) continue; // Ignore disconnected components.
            const idealDistance = idealLength * uvPath;
            const axis = (new Vector()).subVectors(v.center, u.center);
            const actualDistance = axis.length() > 0 ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate())) : 0;
            if(elems.existsEdge(u, v, true) && actualDistance > idealDistance) {
                // Attractive force between edges if too far.
                const delta = actualDistance - idealDistance;
                yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
            } else if (!elems.hasAncestor(u, v)) {
                // Repulsive force between node pairs if too close.
                if(actualDistance < idealDistance) {
                    const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                    yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
                }
            }
        }
    }
}

function* constrainNodes(elems, step) {
    for (let u of elems.nodes()) {
        // Apply no-overlap to all siblings.
        if(step > 300) {
            for(let sibling of elems.siblings(u)) {
                yield constrainNodeNonoverlap(u, sibling);
            }
        }
        yield constrainNodeChildren(u, 10);
        yield constrainNodePorts(u);
    }
}

const configForceElectrical = {
    numSteps: 500, numConstraintIters: 5, numForceIters: 1,
    forceOptimizer: new BasicOptimizer(0.5),
};

onmessage = (e) => {
    const { nodeSchemas, edgeSchemas, nodeExpanded, graphFlowDirection } = e.data;
    
    const {nodes, edges} = fromSchema(nodeSchemas, edgeSchemas);
    const storage = new StructuredStorage(nodes, edges);
    const shownNodes = [];
    const shownNodeIds = new Set();
    const ordering = [];

    const traverse = (u) => {
        shownNodes.push(u);
        shownNodeIds.add(u.id);
        ordering.push({ type: 'node', id: u.id });
        if (nodeExpanded[u.id]) {
            u.children.forEach((v) => traverse(v));
        }
        else {
            u.children = [];  // Hide children if not expanded.
        }
    }

    storage.roots().forEach((node) => traverse(node));

    const shownEdges = storage.edges().filter(({ source, target}) => shownNodeIds.has(source.id) && shownNodeIds.has(target.id));  // TODO: use edge flags for when compound collapsed
    shownEdges.forEach((edge) => ordering.push({ type: 'edge', id: edge.id }));

    const shownStorage = new StructuredStorage(shownNodes, shownEdges);
    const shortestPath = shownStorage.shortestPaths();
    const layout = new ForceConstraintLayout(
        shownStorage,
        function*(storage) {
            const elems = storage;
            yield* forceSpringModel(elems, shortestPath, 20, 0);
        },
        function*(elems, step) {
            yield* constrainNodes(elems, step);

            if (step > 0) {
                for (let {source, target} of elems.edges()) {
                    yield constrainNodeOffset(source.node, target.node, ">=", 30, [0, 1])
                }
            }
        },
        configForceElectrical,
    );
    layout.onEnd((elems) => {
        const {nodeSchemas, edgeSchemas} = toSchema(Array.from(elems.nodes()), Array.from(elems.edges()));
        postMessage(({nodeSchemas, edgeSchemas, bounds: elems.bounds(), ordering}));
    });
    layout.start();
}
