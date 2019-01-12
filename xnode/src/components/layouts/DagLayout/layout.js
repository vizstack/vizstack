/**
 * Layout engine for a directed acyclic graph (DAG).
 *
 * This layout engine takes in specifications of graph node/edge dimensions and properties, and it
 * positions the graph elements in a visually appealing way.
 */

import webcola from 'webcola';

export type NodeId = string;
export type Node = {
    /** Node config specified by client. */
    id: NodeId,
    children?: Array<NodeId>,

    ports?: {
        [string]: {
            side?: 'north' | 'south' | 'east' | 'west',
            order?: number,
        },
    },

    flowDirection?: 'north' | 'south' | 'east' | 'west',
    alignChildren?: boolean,

    /** Size dimensions populated after rendering. Can be specified by client (for childless nodes),
     *  but might be overwritten by layout engine. */
    width?: number,
    height?: number,

    /** Layout coordinates populated by layout engine. If supplied, won't change them? */
    x?: number,
    y?: number,
    z?: number,
};

export type EdgeId = string;
export type Edge = {
    /** Edge config specified by client. */
    id: EdgeId,

    startId: NodeId,
    endId: NodeId,

    // TODO: Is this populated automatically if not specified?
    startPort?: string,
    endPort?: string,

    /** Layout coordinates populated by layout engine. */
    points?: Array<[number, number]>,
    z?: number,
};

export default function layout(
    nodes: Array<Node>,
    edges: Array<Edge>,
    callback: (width: number, height: number, nodes: Array<Node>, edges: Array<Edge>) => void,
    alignments?: Array<Array<NodeId>>,
) {

}
