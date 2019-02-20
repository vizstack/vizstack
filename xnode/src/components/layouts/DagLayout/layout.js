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
    children?: Array<NodeId>,

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
    // TODO: Handle defaults

    const kFlowGap = 30; // Distance between adjacent objects in a flow.
    const kDefaultNodeSize = 0; // Default node width/height if not specified.
    const kGroupPadding = 10; // Interior padding between group boundary and contents.

    // Build lookup tables and record stats by traversing the entire graph once.
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

    const graph = {
        vertices: {
            real: [],
            dummy: [],
        },
        links: {
            real: [],
            dummy: [],
        },
        constraints: {
            real: [],
            dummy: [],
        },
        groups: [],
    };

    // Index into *combined* array of real and dummy `Vertex`.
    // [  real  ][  dummy  ]
    //  0    N-1  N
    type VertexIdx = number;
    let vertexIdxLookup: { [NodeId]: { idx: VertexIdx, type: 'real' | 'dummy' } } = {};

    function addVertex(nodeId: NodeId, vertex: Vertex, type: 'real' | 'dummy'): VertexIdx {
        let idx: VertexIdx = graph.vertices[type].length;
        if (type === 'dummy') idx += numChildlessNodes;
        vertexIdxLookup[nodeId] = { idx, type };
        graph.vertices[type].push(vertex);
        return idx;
    }

    type GroupIdx = number;
    const groupIdxLookup: { [NodeId]: GroupIdx } = {};

    function addGroup(nodeId: NodeId, group: Group): GroupIdx {
        const idx: GroupIdx = graph.groups.length;
        groupIdxLookup[nodeId] = idx;
        graph.groups.push(group);
        return idx;
    }

    function addLink(link: Link, types: ['real' | 'dummy', 'real' | 'dummy']) {
        if (types.every((type) => type === 'real')) {
            graph.links.real.push(link);
        } else {
            graph.links.dummy.push(link);
        }
    }

    function addConstraint(constraint: Constraint, types: Array<'real' | 'dummy'>) {
        if (types.every((type) => type === 'real')) {
            graph.constraints.real.push(constraint);
        } else {
            graph.constraints.dummy.push(constraint);
        }
    }

    /**
     *
     * @param nodeId
     * @param processed
     * @returns {obj} Either the created `VertexIdx` (if no children) or `GroupIdx` (has children).
     */
    function processNode(
        nodeId: NodeId,
        processed: { [NodeId]: {} },
    ):
        | {
              type: 'real',
              vertexIdx: VertexIdx, // Actual vertex.
          }
        | {
              type: 'dummy',
              vertexIdx: VertexIdx, // Dummy vertex.
              groupIdx: GroupIdx,
          } {
        if (processed[nodeId]) return processed[nodeId];
        const node = nodes[nodeIdxLookup[nodeId]];

        // Node has no children, so build a leaf `Vertex`.
        if (node.children.length === 0) {
            const vertexIdx: VertexIdx = addVertex(
                nodeId,
                { width: node.width || kDefaultNodeSize, height: node.height || kDefaultNodeSize },
                'real',
            );
            const result = { type: 'real', vertexIdx };
            processed[nodeId] = result;
            return result;
        }

        // Create all children. Make a dummy `Vertex` to act as group center by add `Link` from
        // it to each of the children. Make `Group` only for nodes with children.
        const dummyIdx: VertexIdx = addVertex(nodeId, { width: 0, height: 0 }, 'dummy');
        const group: Group = { leaves: [], groups: [], padding: kGroupPadding };
        for (let childId of node.children) {
            const {
                vertexIdx: childVertexIdx,
                groupIdx: childGroupIdx,
                type: childType,
            } = processNode(childId, processed);
            addLink({ source: dummyIdx, target: childVertexIdx }, ['dummy', childType]);
            if (childType === 'dummy') {
                group.groups.push(childGroupIdx);
            } else {
                group.leaves.push(childVertexIdx);
            }
        }
        const groupIdx: GroupIdx = addGroup(nodeId, group);

        // TODO: Add `AlignConstraint` if specified to align children.

        const result = { type: 'dummy', vertexIdx: dummyIdx, groupIdx };
        processed[nodeId] = result;
        return result;
    }
    const processCache: { [NodeId]: {} } = {};
    console.log('layout.js -- nodes = ', nodes, 'edges = ', edges);
    nodes.forEach((node) => processNode(node.id, processCache));

    function processEdge(startId: NodeId, endId: NodeId) {
        const { idx: startVertexIdx, type: startVertexType } = vertexIdxLookup[startId];
        const { idx: endVertexIdx, type: endVertexType } = vertexIdxLookup[endId];

        // Add `Link` between created start and end `Vertex`.
        addLink({ source: startVertexIdx, target: endVertexIdx }, [startVertexType, endVertexType]);

        // Add `SeparationConstraint` to enforce flow, according to least common ancestor.
        const lcaId: NodeId = findLowestCommonAncestor(parentIdLookup, startId, endId);
        if (lcaId === null) return;
        const lca: Node = nodes[nodeIdxLookup[lcaId]];
        let options: { axis: 'x' | 'y', gap: number };
        switch (lca.flowDirection) {
            case 'east':
                options = { axis: 'x', gap: kFlowGap };
                break;
            case 'west':
                options = { axis: 'x', gap: -kFlowGap };
                break;
            case 'north':
                options = { axis: 'y', gap: -kFlowGap };
                break;
            case 'south':
            default:
                options = { axis: 'y', gap: kFlowGap };
                break;
        }
        addConstraint(
            {
                type: 'separation',
                left: startVertexIdx,
                right: endVertexIdx,
                ...options,
            },
            [startVertexType, endVertexType],
        );
    }
    edges.forEach((edge) => processEdge(edge.startId, edge.endId));

    console.log('layout.js -- Done processing input nodes/edges.', graph);

    // function processAlignment(alignment: Array<NodeId>) {
    //     // TODO: Add `AlignConstraint` for alignments (but need to specify direction)
    // }
    // if(alignments) alignments.forEach((alignment) => processAlignment(alignment))

    // Step 1: Preliminary layout.
    // ---------------------------
    // Preliminary layout using dummy `Vertex` (instead of `Group`) and extra `Link` to
    // promote clustering and constraint satisfaction. Overlap is allowed, since only the rough
    // positions are required. After this step, real `Vertex` will keep the rough positions to
    // use at the start of the next layout process.

    // Use both real and dummy `Vertex`, and no `Group`. The `Link`s
    new cola.Layout()
        .avoidOverlaps(false)
        .nodes(graph.vertices.real.concat(graph.vertices.dummy))
        .links(graph.links.real.concat(graph.links.dummy))
        .constraints(graph.constraints.real.concat(graph.constraints.dummy))
        .linkDistance(100) // TODO: choose
        .symmetricDiffLinkLengths(100) // TODO: Choose
        .convergenceThreshold(1e-4) // TODO: Choose
        .start(100, 0, 0, 0, false); // TODO: Choose

    // Step 2: Secondary layout.
    // -------------------------
    // Secondary layout with only the real `Vertex` (i.e., nodes with no children) and `Link`s
    // (between real `Vertex`). Nested `Group` replace the dummy `Vertex`. Overlap is not
    // allowed. Positions are gridified.

    new cola.Layout()
        .avoidOverlaps(true)
        .nodes(graph.vertices.real)
        .links(graph.links.real)
        .constraints(graph.constraints.real)
        .groups(graph.groups)
        .groupCompactness(1e-5) // TODO: Choose
        .linkDistance(100) // TODO: Choose
        .symmetricDiffLinkLengths(100) // TODO: Choose
        .convergenceThreshold(1e-3) // TODO: Choose
        .start(50, 0, 100, 0, false); // TODO: Choose

    // Step 3: Retarget to ports.
    // --------------------------
    // Add port dummy `Vertex`. Retarget edges to use these port `Vertex` and `Group`.

    // TODO

    // Step 4: Route edges within gridified positions.

    // TODO

    // Step 5: Translate back to user format.

    type Dims = {
        x: number,
        y: number,
        z: number,
        width: number,
        height: number,
    };

    function getGroupDims(nodeId: NodeId): Dims {
        const g: Group = graph.groups[groupIdxLookup[nodeId]];
        console.log('layout.js -- getGroupDims', nodeId);
        return {
            x: g.bounds.x,
            y: g.bounds.y,
            z: 1, // TODO
            width: g.bounds.width(),
            height: g.bounds.height(),
        };
    }
    function getVertexDims(nodeId: NodeId): Dims {
        const v: Vertex = graph.vertices.real[vertexIdxLookup[nodeId].idx];
        console.log('layout.js -- getVertexDims', nodeId, vertexIdxLookup, graph.vertices.real, v);
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
        if (vertexIdxLookup[id].type === 'dummy') {
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
