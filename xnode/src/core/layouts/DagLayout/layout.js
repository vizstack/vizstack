// @flow
/**
 * Layout engine for a directed acyclic graph (DAG).
 *
 * This layout engine takes in specifications of graph node/edge dimensions and properties, and it
 * positions the graph elements in a visually appealing way.
 */

import * as cola from 'webcola';
import { arr2obj, obj2obj } from '../../../utils/data-utils';

export type NodeId = string;
export type NodeIn = {
    /** String ID unique among all nodes in a graph. */
    id: NodeId,

    /** IDs of nodes that are strictly contained within this node. */
    children: Array<NodeId>,

    /** Direction in which the immediate children of this node will be arranged. */
    flowDirection?: 'north' | 'south' | 'east' | 'west',

    /** Whether to ensure that all immediate children of this node are strictly aligned along the
     *  axis of the flow direction. */
    alignChildren?: boolean,

    /** Named points on node boundaries that serve as the source/destination of edges. */
    ports?: {
        [string]: {
            /** Absolute location of side on which port resides. */
            side: 'north' | 'south' | 'east' | 'west',

            /** Order of port on its specified side. If undefined, any order will work. */
            order?: number,
        },
    },

    /** Size dimensions of leaf nodes with fixed sizes; parent node dimensions will be populated. */
    width?: number,
    height?: number,
};
export type NodeOut = {
    ...NodeIn,

    flowDirection: 'north' | 'south' | 'east' | 'west',
    alignChildren: boolean,
    ports?: {
        [string]: {
            side: 'north' | 'south' | 'east' | 'west',
            order: number,

            /** Port coordinates populated by layout engine. */
            x: number,
            y: number,
        },
    },

    /** Size dimensions populated by layout engine. */
    width: number,
    height: number,

    /** Layout coordinates populated by layout engine. */
    x: number,
    y: number,
    z: number,
};

// TODO: Expansion, caching + identity fn

export type EdgeId = string;
export type EdgeIn = {
    /** String ID unique among all edges in a graph. */
    id: EdgeId,

    /** IDs of nodes that an edge starts and ends at. */
    startId: NodeId,
    endId: NodeId,

    /** Name of ports to connect to. If undefined, any side will work. */
    startPort?: string,
    endPort?: string,
};
export type EdgeOut = {
    ...EdgeIn,

    /** Layout coordinates populated by layout engine. */
    points: { x: number, y: number }[],
    z: number,
};

/**
 *
 * @param nodes
 * @param edges
 * @param callback
 * @param alignments
 */
export default function layout(
    nodes: NodeIn[],
    edges: EdgeIn[],
    callback: (width: number, height: number, nodes: NodeOut[], edges: EdgeOut[]) => void,
    config: {
        alignments?: Array<Array<NodeId>>,
        flowDirection?: 'north' | 'south' | 'east' | 'west',
        alignChildren?: boolean,
        flowSpacing?: number,
        nodeMargin?: number,
        edgeMargin?: number,
    } = {},
) {
    // =============================================================================================
    // Constants.

    const {
        // Default direction of flow for node with children.
        flowDirection: kFlowDirection = 'south',

        // Distance between adjacent objects in a flow.
        flowSpacing: kFlowSpacing = 75,

        // Whether all children in a flow are aligned.
        alignChildren: kAlignChildren = false,
    } = config;

    const kDefaultNodeSize = 0; // Default node width/height if not specified.
    const kGroupPadding = 10; // Interior padding between group boundary and contents.
    const kGroupMargin = 20; // Distance between adjacent group boundaries.
    const kNodeMargin = 20; // Distance between adjacent node boundaries.
    const kEdgeMargin = 5; // Distance between adjacent edges.

    // =============================================================================================
    // Preliminary information gathering.

    // Build lookup tables and record useful info by traversing the entire graph's node component
    // hierarchy (not edges, but containment relations).
    type NodeIdx = number;
    const nodeIdxLookup: { [NodeId]: NodeIdx } = arr2obj(nodes, (node, idx) => [node.id, idx]);
    const parentIdLookup: { [NodeId]: NodeId } = {};
    let numLeafNodes = 0;
    function traverseNode(nodeId: NodeId, processed: Set<NodeId>) {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);
        const node = nodes[nodeIdxLookup[nodeId]];
        if (node.children.length === 0) {
            numLeafNodes += 1;
            return;
        }
        for (let childId of node.children) {
            parentIdLookup[childId] = node.id;
            traverseNode(childId, processed);
        }
    }
    const traverseSet: Set<NodeId> = new Set();
    nodes.forEach((node) => traverseNode(node.id, traverseSet));

    const targetIdLookup: { [NodeId]: Array<NodeId> } = {};
    function traverseEdge(node) {}

    // TODO: Use topoligical sort finish_time to order nodes in terms of nesting. This allows
    // z-position calculations later?

    // =============================================================================================
    // Build up data structures for Cola layout.

    // The "real" elements relate to actual user-defined elements.
    // The "fake" elements relate to elements inserted by this code for the sake of layout.
    const graph = {
        vertices: [],
        links: [],
        linksReal: [],
        constraints: [],
        groups: [],
    };

    type VertexIdx = number;
    let vertexIdxLookup: { [NodeId]: VertexIdx } = {};

    function addVertex(nodeId: NodeId, vertex: Vertex): VertexIdx {
        let idx: VertexIdx = graph.vertices.length;
        vertexIdxLookup[nodeId] = idx;
        graph.vertices.push(vertex);
        return idx;
    }

    type GroupIdx = number;
    const groupIdxLookup: { [NodeId]: GroupIdx } = {};
    // Note: This `idx` is 0-indexed, but the computed `index` by WebCola starts after the largest
    // vertex `index`.

    function addGroup(
        nodeId: NodeId,
        subgroups: Array<GroupIdx>,
        leaves: Array<VertexIdx>,
    ): GroupIdx {
        const idx: GroupIdx = graph.groups.length;
        groupIdxLookup[nodeId] = idx;
        graph.groups.push({ leaves: leaves, groups: subgroups, padding: kGroupPadding });
        return idx;
    }

    function getNodeInfo(
        nodeId: NodeId,
    ):
        | {|
              type: 'vertex',
              idx: VertexIdx,
              obj: Vertex,
          |}
        | {|
              type: 'group',
              idx: GroupIdx,
              obj: Group,
          |}
        | null {
        if (vertexIdxLookup[nodeId] !== undefined) {
            return {
                type: 'vertex',
                idx: vertexIdxLookup[nodeId],
                obj: graph.vertices[vertexIdxLookup[nodeId]],
            };
        } else if (groupIdxLookup[nodeId] !== undefined) {
            return {
                type: 'group',
                idx: groupIdxLookup[nodeId],
                obj: graph.groups[groupIdxLookup[nodeId]],
            };
        }
        return null;
    }

    const linkLookup: Set<string> = new Set();
    function addLink(startIdx: VertexIdx | GroupIdx, endIdx: VertexIdx | GroupIdx): void {
        const key = `${startIdx}->${endIdx}`;
        if (linkLookup.has(key)) return;
        linkLookup.add(key);
        graph.links.push({ source: startIdx, target: endIdx });
    }

    const separationConstraintLookup: Set<string> = new Set();
    function addSeparationConstraint(
        startIdx: VertexIdx,
        endIdx: VertexIdx,
        flowDirection: 'north' | 'south' | 'east' | 'west' = kFlowDirection,
        kwargs: {
            gap?: number,
            equality?: boolean,
        } = {},
    ): void {
        const key = `${startIdx}-${flowDirection}->${endIdx}`;
        if (separationConstraintLookup.has(key)) return;
        separationConstraintLookup.add(key);

        // Note: Negative gaps were found NOT to work, even on simple cases of 2 nodes. Instead,
        // we must reverse the left and right terms in the constraint inequality.
        let options;
        switch (flowDirection) {
            case 'west':
                options = { axis: 'x', left: endIdx, right: startIdx };
                break;
            case 'north':
                options = { axis: 'y', left: endIdx, right: startIdx };
                break;
            case 'east':
                options = { axis: 'x', left: startIdx, right: endIdx };
                break;
            case 'south':
            default:
                options = { axis: 'y', left: startIdx, right: endIdx };
                break;
        }

        const { gap = kFlowSpacing, equality = false } = kwargs;
        const constraint = {
            type: 'separation',
            ...options,
            gap,
            equality,
        };
        graph.constraints.push(constraint);
    }

    function processNode(
        nodeId: NodeId,
        processed: { [NodeId]: { vertexIdx: VertexIdx } | { groupIdx: GroupIdx } },
    ): { vertexIdx: VertexIdx } | { groupIdx: GroupIdx } {
        if (processed[nodeId]) return processed[nodeId];
        const node = nodes[nodeIdxLookup[nodeId]];

        // NodeIn has no children, so build a leaf `Vertex`.
        if (node.children.length === 0) {
            const vertexIdx: VertexIdx = addVertex(nodeId, {
                width: node.width || kDefaultNodeSize,
                height: node.height || kDefaultNodeSize,
            });
            processed[nodeId] = { vertexIdx };
            return processed[nodeId];
        }

        // Create all children. Make a dummy `Vertex` to act as group center by add `Link` from
        // it to each of the children. Make `Group` only for nodes with children.
        const leaves: Array<VertexIdx> = [];
        const subgroups: Array<GroupIdx> = [];
        for (let childId of node.children) {
            const { vertexIdx: childVertexIdx, groupIdx: childGroupIdx } = processNode(
                childId,
                processed,
            );

            // Update `Group` according to whether child is leaf or group.
            if (childGroupIdx !== undefined) {
                subgroups.push(childGroupIdx);
            }
            if (childVertexIdx !== undefined) {
                leaves.push(childVertexIdx);
            }
        }
        const groupIdx: GroupIdx = addGroup(nodeId, subgroups, leaves);

        // TODO: Add `AlignConstraint` if specified to align children.

        processed[nodeId] = { groupIdx };
        return processed[nodeId];
    }
    const processCache: { [NodeId]: { vertexIdx: VertexIdx } | { groupIdx: GroupIdx } } = {};
    nodes.forEach((node) => processNode(node.id, processCache));

    function findLeafDescendants(startId: NodeId): Array<NodeId> {
        const leaves = [];
        function dfs(nodeId: NodeId) {
            const node = nodes[nodeIdxLookup[nodeId]];
            if (node.children.length === 0) {
                leaves.push(nodeId);
                return;
            }
            for (let childId of node.children) {
                dfs(childId);
            }
        }
        dfs(startId);
        return leaves;
    }

    function processEdge(startId: NodeId, endId: NodeId) {
        // Add `Link` and `SeparationConstraint between *all pairs* leaf descendants of start and
        // leaf descendants of end to enforce flow in direction of least common ancestor. This is
        // needed since a `NodeIn` can translate to either a `Vertex` or a `Group`, but a
        // `SeparationConstraint` must be between two `Vertex`. Also, in practice, it seems that
        // it is required to have a `Link` between two `Vertex` in order to constrain them.
        const lcaId: NodeId | null = findLowestCommonAncestor(parentIdLookup, startId, endId);
        let lcaFlowDirection = kFlowDirection;
        if (lcaId) lcaFlowDirection = nodes[nodeIdxLookup[lcaId]].flowDirection || lcaFlowDirection;

        // Add dummy nodes to separate left and right groups.
        // const dummyA: Vertex = { width: 0, height: 0 };
        // // const dummyB: Vertex = { width: 0, height: 0 };
        // const dummyAIdx: VertexIdx = graph.vertices.length;
        // // const dummyBIdx: VertexIdx = graph.vertices.length + 1;
        // // graph.vertices.push(dummyA, dummyB);
        // // addLink(dummyAIdx, dummyBIdx);
        // // addSeparationConstraint(dummyAIdx, dummyBIdx, lcaFlowDirection, { equality: true })
        // graph.vertices.push(dummyA);
        // if (lcaId) graph.groups[groupIdxLookup[lcaId] - numLeafNodes].leaves.push(dummyAIdx)
        // graph.links.push({ source: getNodeInfo(startId).obj, target: getNodeInfo(endId).obj });

        // for (let startLeafId of findLeafDescendants(startId)) {
        //     const startLeafIdx: VertexIdx = vertexIdxLookup[startLeafId];
        //     addLink(startLeafIdx, dummyAIdx);
        //     addSeparationConstraint(startLeafIdx, dummyAIdx, lcaFlowDirection, {gap: kFlowSpacing/2});
        // }
        // for (let endLeafId of findLeafDescendants(endId)) {
        //     const endLeafIdx: VertexIdx = vertexIdxLookup[endLeafId];
        //     addLink(dummyAIdx, endLeafIdx);
        //     addSeparationConstraint(dummyAIdx, endLeafIdx, lcaFlowDirection, {gap: kFlowSpacing/2});
        // }

        // TODO: Make not hacky
        graph.linksReal.push({
            sourceId: startId,
            targetId: endId,
        });

        for (let startLeafId of findLeafDescendants(startId)) {
            const startLeafIdx: VertexIdx = vertexIdxLookup[startLeafId];
            for (let endLeafId of findLeafDescendants(endId)) {
                const endLeafIdx: VertexIdx = vertexIdxLookup[endLeafId];
                addLink(startLeafIdx, endLeafIdx);
                addSeparationConstraint(startLeafIdx, endLeafIdx, lcaFlowDirection);
            }
        }
    }
    edges.forEach((edge) => processEdge(edge.startId, edge.endId));

    // TODO: Alignment constraint for orthogonal edges (for single item edges)
    // TODO: BFS layer-wise alignment constraint (offset so start flow at same level)

    // function processAlignment(alignment: Array<NodeId>) {
    //     // TODO: Add `AlignConstraint` for alignments (but need to specify direction)
    // }
    // if(alignments) alignments.forEach((alignment) => processAlignment(alignment));

    console.log('layout.js -- Done building up graph data structures.', graph);

    // =============================================================================================
    // Run Cola layout algorithms.

    // Step 1: Graph layout.
    // ---------------------
    // Calculate the relative positions of `Vertex` and `Groups` by applying all the `Constraint`s
    // and with dummy `Links`. Overlap is not allowed.

    let layout = new cola.Layout()
        .avoidOverlaps(true)
        .handleDisconnected(true)
        .nodes(graph.vertices)
        .links(graph.links)
        .constraints(graph.constraints)
        .groups(graph.groups)
        .groupCompactness(1e-5) // TODO: Choose
        .linkDistance(kFlowSpacing)
        .convergenceThreshold(1e-3) // TODO: Choose
        .start(
            10 /* unconstrained iters */,
            20 /* user constraints iters */,
            30 /* user + overlap constraints iters */,
            0 /* container snap" iters using nodes[0].width */,
            false /* run async */,
            false /* center grpah on restart */,
        );

    console.log('layout.js -- Done with preliminary layout.', graph);

    // Step 3: Retarget to ports.
    // --------------------------
    // Add port dummy `Vertex`. Retarget edges to use these port `Vertex` and `Group`.

    // TODO

    // Step 4: Route edges within gridified positions.
    // -----------------------------------------------

    // After layout, there are several changes in the `Vertex` and `Group`  objects.
    type Bounds = {
        x: number,
        y: number,
        width: () => number,
        height: () => number,
        inflate: (number) => Bounds,
    };
    type VertexPopulated = {
        ...Vertex,
        index: number,
        bounds: Bounds,
    };
    type GroupPopulated = {
        ...Group,
        index: number,
        bounds: Bounds,
        leaves: VertexPopulated[],
        groups: GroupPopulated[],
        children?: number[],
    };

    // Add margin around the vertices and groups, and perpare for routing.
    ((graph.vertices: any[]): VertexPopulated[]).forEach((v) => {
        // v.bounds = v.bounds.inflate(-kNodeMargin);
    });
    ((graph.groups: any[]): GroupPopulated[]).forEach((g) => {
        // g.bounds = g.bounds.inflate(-kGroupMargin);
        g.children = g.groups.map((sg) => sg.index).concat(g.leaves.map((l) => l.index));
    });
    const router = new cola.GridRouter(
        graph.vertices.concat(graph.groups),
        {
            getChildren: (v) => v.children,
            getBounds: (v) => v.bounds,
        },
        kNodeMargin, // TODO: - kGroupMargin?
    );
    graph.linksReal = graph.linksReal.map((e) => {
        const sourceInfo = getNodeInfo(e.sourceId);
        const targetInfo = getNodeInfo(e.targetId);
        return {
            source: sourceInfo.obj,
            target: targetInfo.obj,
        };
    });

    console.log('B');
    const routes = router.routeEdges(
        graph.linksReal,
        kEdgeMargin,
        (e) => e.source.index,
        (e) => e.target.index,
    );
    const points = routes.map((route) => [route[0][0]].concat(...route.map((seg) => seg[1])));
    console.log('C');

    // Step 5: Translate back to user format.
    // --------------------------------------

    type Dims = {
        x: number,
        y: number,
        z: number,
        width: number,
        height: number,
    };

    function getGroupDims(nodeId: NodeId): Dims {
        const g: Group = graph.groups[groupIdxLookup[nodeId]];
        return {
            x: g.bounds.x,
            y: g.bounds.y,
            z: 1, // TODO
            width: g.bounds.width(),
            height: g.bounds.height(),
        };
    }
    function getVertexDims(nodeId: NodeId): Dims {
        const v: Vertex = graph.vertices[vertexIdxLookup[nodeId]];
        return {
            x: v.x - v.width / 2, // TODO: +pad?
            y: v.y - v.height / 2,
            z: 1, // TODO
            width: v.width,
            height: v.height,
        };
    }

    let minX, minY, maxX, maxY;
    const nodeDimsLookup: { [NodeId]: Dims } = {};
    for (let node of nodes) {
        const { id } = node;
        let dims: Dims;
        if (groupIdxLookup[id] !== undefined) {
            dims = getGroupDims(id);
        } else {
            dims = getVertexDims(id);
        }
        nodeDimsLookup[id] = dims;

        // Update bounds, if applicable.
        minX = minX === undefined ? dims.x : Math.min(minX, dims.x);
        minY = minY === undefined ? dims.y : Math.min(minY, dims.y);
        maxX = maxX === undefined ? dims.x + dims.width : Math.max(maxX, dims.x + dims.width);
        maxY = maxY === undefined ? dims.y + dims.height : Math.max(maxY, dims.y + dims.height);
    }

    if (minX === undefined || minY === undefined || maxX === undefined || maxY === undefined) {
        console.error('Cannot calculate one of minX, minY, maxX, maxY for graph.');
        return;
    }

    callback(
        maxX - minX, // width
        maxY - minY, // height
        nodes.map((node) => {
            const { id } = node;
            const dims: Dims = nodeDimsLookup[id];
            return {
                ...node,
                x: dims.x - minX,
                y: dims.y - minY,
                z: dims.z,
                width: dims.width,
                height: dims.height,
            };
        }),
        edges.map((edge, i) => {
            const { startId, endId } = edge;
            const start: Dims = nodeDimsLookup[startId];
            const end: Dims = nodeDimsLookup[endId];
            return {
                ...edge,
                points: points[i].map((point) => [point.x - minX, point.y - minY]),
                // points: [
                //     [start.x - minX + start.width / 2, start.y - minY + start.height / 2],
                //     [end.x - minX + end.width / 2, end.y - minY + end.height / 2],
                // ],
                z: Math.max(start.z, end.z) + 0.5, // Edges appear above nodes.
            };
        }),
    );
}

export function findLowestCommonAncestor(
    parents: { [NodeId]: NodeId },
    leftId: NodeId,
    rightId: NodeId,
): NodeId | null {
    const visited: Set<NodeId> = new Set();
    let left: NodeId = leftId;
    let right: NodeId = rightId;

    while (left || right) {
        // Advance left pointer if still defined, checking for already visited.
        if (left) {
            if (visited.has(left)) return left;
            visited.add(left);
            left = parents[left];
        }

        // Advance right pointer if still defined, checking for already visited.
        if (right) {
            if (visited.has(right)) return right;
            visited.add(right);
            right = parents[right];
        }
    }

    // In graph with root node, this should not happen.
    return null;
}

// =================================================================================================

type Vertex = {
    width: number,
    height: number,
    x?: number,
    y?: number,
};

type Group = {
    leaves: number[], // Idxs of vertices directly within group.
    groups: number[], // Idxs of other groups nested within group.
    padding?: number, // Interior padding of group.
};

type Link = {
    // Idx of vertex in input array, or inlined `Vertex`/`Group` objects.
    source: number | Vertex | Group,
    target: number | Vertex | Group,
};

type SeparationConstraint = {
    // nodes[left][axis] + gap <= nodes[right][axis]
    type: 'separation',
    axis: 'x' | 'y',
    left: number, // Idx of vertex in input array.
    right: number, // Idx of vertex in input array.
    gap: number, // Separation between boundaries of vertices.
    equality?: boolean, // Whether to enforce equality.
};

type AlignConstraint = {
    type: 'alignment',
    axis: 'x' | 'y',
    offsets: {
        node: number, // Idx of vertex in input array.
        offset: number, // Offset from alignment axis (in px).
    }[],
};

type Constraint = SeparationConstraint | AlignConstraint;
