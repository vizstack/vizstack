// @flow
/**
 * Layout engine for a directed acyclic graph (DAG).
 *
 * This layout engine takes in specifications of graph node/edge dimensions and properties, and it
 * positions the graph elements in a visually appealing way.
 */

import * as cola from 'webcola';
import { arr2obj, obj2obj } from '../../../services/data-utils';

export type NodeId = string;
export type Node = {
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
            // Absolute location of side on which port resides. If undefined, any side will work.
            side?: 'north' | 'south' | 'east' | 'west',

            // Determines ordering of ports on the same side. If undefined, any ordering will work.
            order?: number,

            // Layout coordinates populated by layout engine.
            x?: number,
            y?: number,
        },
    },

    /** Size dimensions populated after rendering. Can be specified by client (for childless nodes),
     *  but might be overwritten by layout engine. */
    width?: number,
    height?: number,

    /** Layout coordinates populated by layout engine. */
    x?: number,
    y?: number,
    z?: number,
};

// TODO: Expansion, caching + identity fn

export type EdgeId = string;
export type Edge = {
    /** String ID unique among all edges in a graph. */
    id: EdgeId,

    /** IDs of nodes that an edge starts and ends at. */
    startId: NodeId,
    endId: NodeId,

    /** Name of ports to connect to. If undefined, any side will work. */
    startPort?: string,
    endPort?: string,

    /** Layout coordinates populated by layout engine. */
    points?: Array<[number, number]>,
    z?: number,
};

/**
 *
 * @param nodes
 * @param edges
 * @param callback
 * @param alignments
 */
export default function layout(
    nodes: Array<Node>,
    edges: Array<Edge>,
    callback: (width: number, height: number, nodes: Array<Node>, edges: Array<Edge>) => void,
    config?: {
        alignments?: Array<Array<NodeId>>,
        flowDirection?: 'north' | 'south' | 'east' | 'west',
        flowSpacing?: number,
        alignChildren?: boolean,
    },
) {
    // =============================================================================================
    // Constants.

    const {
        // Default direction of flow for node with children.
        flowDirection: kFlowDirection = 'south',

        // Distance between adjacent objects in a flow.
        flowSpacing: kFlowSpacing = 75,
    } = config || {};

    const kDefaultNodeSize = 0; // Default node width/height if not specified.
    const kGroupPadding = 10; // Interior padding between group boundary and contents.

    // =============================================================================================
    // Preliminary information gathering.

    // Build lookup tables and record useful info by traversing the entire graph's node component
    // hierarchy (not edges, but containment relations).
    type NodeIdx = number;
    const nodeIdxLookup: { [NodeId]: NodeIdx } = arr2obj(nodes, (node, idx) => [node.id, idx]);
    const parentIdLookup: { [NodeId]: NodeId } = {};
    let numChildlessNodes = 0;
    function traverseNode(nodeId: NodeId, processed: Set<NodeId>) {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);
        const node = nodes[nodeIdxLookup[nodeId]];
        if (node.children.length === 0) {
            numChildlessNodes += 1;
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
    function traverseEdge(node) {

    }

    // TODO: Use topoligical sort finish_time to order nodes in terms of nesting. This allows
    // z-position calculations later?

    // =============================================================================================
    // Build up data structures for Cola layout.

    // The "real" elements relate to actual user-defined elements.
    // The "dummy" elements relate to dummy elements inserted by this code for the sake of layout.
    const graph = {
        vertices: [],
        links: [],
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

    function addGroup(nodeId: NodeId, subgroups: Array<GroupIdx>, leaves: Array<VertexIdx>): GroupIdx {
        const idx: GroupIdx = graph.groups.length;
        groupIdxLookup[nodeId] = idx;
        graph.groups.push({ leaves: leaves, groups: subgroups, padding: kGroupPadding });
        return idx;
    }

    const linkLookup: Set<string> = new Set();

    function addLink(startIdx: VertexIdx, endIdx: VertexIdx): void {
        const key = `${startIdx}->${endIdx}`;
        if(linkLookup.has(key)) return;
        linkLookup.add(key);
        graph.links.push({ source: startIdx, target: endIdx });
    }

    const separationConstraintLookup: Set<string> = new Set();

    function addSeparationConstraint(
        startIdx: VertexIdx,
        endIdx: VertexIdx,
        flowDirection: 'north' | 'south' | 'east' | 'west' = kFlowDirection,
    ): void {
        const key = `${startIdx}-${flowDirection}->${endIdx}`;
        if(separationConstraintLookup.has(key)) return;
        separationConstraintLookup.add(key);

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
        const constraint = {
            type: 'separation',
            ...options,
            gap: kFlowSpacing,
        };
        graph.constraints.push(constraint);
    }

    function processNode(
        nodeId: NodeId,
        processed: { [NodeId]: { vertexIdx: VertexIdx } | { groupIdx: GroupIdx } },
    ): { vertexIdx: VertexIdx } | { groupIdx: GroupIdx } {
        if (processed[nodeId]) return processed[nodeId];
        const node = nodes[nodeIdxLookup[nodeId]];

        // Node has no children, so build a leaf `Vertex`.
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
            const {
                vertexIdx: childVertexIdx,
                groupIdx: childGroupIdx,
            } = processNode(childId, processed);

            // Update `Group` according to whether child is leaf or group.
            if (childGroupIdx !== undefined) {
                subgroups.push(childGroupIdx);
            } else {
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
        // needed since a `Node` can translate to either a `Vertex` or a `Group`, but a
        // `SeparationConstraint` must be between two `Vertex`. Also, in practice, it seems that
        // it is required to have a `Link` between two `Vertex` in order to constrain them.
        const lcaId: NodeId = findLowestCommonAncestor(parentIdLookup, startId, endId);
        let lcaFlowDirection = kFlowDirection;
        if (lcaId) lcaFlowDirection = nodes[nodeIdxLookup[lcaId]].flowDirection || lcaFlowDirection;

        for (let startLeafId of findLeafDescendants(startId)) {
            for (let endLeafId of findLeafDescendants(endId)) {
                const startLeafIdx: VertexIdx = vertexIdxLookup[startLeafId];
                const endLeafIdx: VertexIdx = vertexIdxLookup[endLeafId];
                addSeparationConstraint(startLeafIdx, endLeafIdx, lcaFlowDirection);
                addLink(startLeafIdx, endLeafIdx);
            }
        }
    }
    edges.forEach((edge) => processEdge(edge.startId, edge.endId));

    // TODO: Alignment constraint for orthogonal edges?

    // function processAlignment(alignment: Array<NodeId>) {
    //     // TODO: Add `AlignConstraint` for alignments (but need to specify direction)
    // }
    // if(alignments) alignments.forEach((alignment) => processAlignment(alignment));

    console.log('layout.js -- Done building up graph data structures.', graph);

    // =============================================================================================
    // Run Cola layout algorithms.
    // start(unconstrained iters, user constraints iters, user + overlap constraints iters,
    // "grid snap" iters using nodes[0].width, run async?)

    // Step 1: Preliminary layout.
    // ---------------------------
    // Calculate the relative positions of `Vertex` and `Groups` by applying all the `Constraint`s
    // and with dummy `Links`. Overlap is not allowed. Positions are gridified.

    // TODO: Gridify positions?

    new cola.Layout()
        .avoidOverlaps(true)
        .handleDisconnected(true)
        .nodes(graph.vertices)
        .links(graph.links)
        .constraints(graph.constraints)
        .groups(graph.groups)
        .groupCompactness(1e-5) // TODO: Choose
        .linkDistance(kFlowSpacing)
        .convergenceThreshold(1e-3) // TODO: Choose
        .start(10, 20, 30, 0, false, false);

    // Step 3: Retarget to ports.
    // --------------------------
    // Add port dummy `Vertex`. Retarget edges to use these port `Vertex` and `Group`.

    // TODO

    // Step 4: Route edges within gridified positions.
    // -----------------------------------------------

    // TODO

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

    let minX = null,
        minY = null,
        maxX = null,
        maxY = null;
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
        minX = minX === null ? dims.x : Math.min(minX, dims.x);
        minY = minY === null ? dims.y : Math.min(minY, dims.y);
        maxX = maxX === null ? dims.x + dims.width : Math.max(maxX, dims.x + dims.width);
        maxY = maxY === null ? dims.y + dims.height : Math.max(maxY, dims.y + dims.height);
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
        edges.map((edge) => {
            const { startId, endId } = edge;
            const start: Dims = nodeDimsLookup[startId];
            const end: Dims = nodeDimsLookup[endId];
            return {
                ...edge,
                points: [
                    [start.x - minX + start.width / 2, start.y - minY + start.height / 2],
                    [end.x - minX + end.width / 2, end.y - minY + end.height / 2],
                ],
                z: 0, // TODO
            };
        }),
    );
}

export function findLowestCommonAncestor(
    parents: { [NodeId]: NodeId },
    leftId: NodeId,
    rightId: NodeId,
): NodeId {
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
    leaves?: number[], // Idxs of vertices directly within group.
    groups?: number[], // Idxs of other groups nested within group.
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
    offsets: Array<{
        node: number, // Idx of vertex in input array.
        offset: number, // Offset from alignment axis (in px).
    }>,
};

type Constraint = SeparationConstraint | AlignConstraint;
