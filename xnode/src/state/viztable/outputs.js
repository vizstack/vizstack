import { VizTableState } from './reducers';

/** Unique identifier of a viz from a snapshot in time. */
export type VizId = string;

/** Specification of a viz from a snapshot in time.
 *
 *  Invariant
 *  ---------
 *  Will always have less detailed model slots filled, so filled state can be:
 *
 *      1) summaryModel
 *      2) summaryModel + compactModel
 *      3) summaryModel + compactModel + fullModel
 *
 *  This allows storage/transmission efficiency, and looking at the filled stated implicit
 *  communicated the default model to render.
 */
export type VizSpec = {
    /** Absolute path of the file in which this viz was viewed. */
    filePath: string,

    /** Line number of view statement within file at `filePath`. */
    lineNumber: number,

    /** Model that is just string summary of the object and does not allow references (i.e. it
     *  "bottoms-out"). */
    summaryModel: VizModel,

    /** Model that visualizes a tiny subset of the object data and allows references. */
    compactModel?: VizModel,

    /** Model that visualizes all the object data and allows references. */
    fullModel?: VizModel,
};

/** A mode of visualization for a viz. */
export type VizModel = PrimitiveModel | LayoutModel;

// =================================================================================================
// Viz primitives
// --------------
// Visual "building blocks".

/** Any primitive model. */
export type PrimitiveModel = TextPrimitiveModel | ImagePrimitiveModel;

/** Token primitive is __. */
export type TextPrimitiveModel = {
    type: 'TextPrimitive',
    contents: {
        text: string,
        color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
        variant?: 'plain' | 'token',
    },
};

/** Image primitive is __. */
export type ImagePrimitiveModel = {
    type: 'ImagePrimitive',
    contents: {
        filePath: string,
    },
};

// =================================================================================================
// Viz layouts
// -----------
// Visual "configurations" of "building blocks".

/** Any layout model. */
export type LayoutModel = GridLayoutModel | DagLayoutModel | FlowLayoutModel;

/** Grid layout is __. */
export type GridLayoutModel = {
    type: 'GridLayout',
    contents: {
        elements: Array<{
            vizId: VizId,
            col: number,
            row: number,
            width: number,
            height: number,
        }>,
    },
};

export type FlowLayoutModel = {
    type: 'FlowLayout',
    contents: {
        elements: Array<VizId>,
    },
};

/** Dag layout is ___. */
export type DagNodeId = string;
export type DagNodeSpec = {
    vizId: VizId,
    children: Array<DagNodeId>,
    flowDirection?: 'north' | 'south' | 'east' | 'west',
    alignChildren?: boolean,
    ports?: {
        [string]: {
            side?: 'north' | 'south' | 'east' | 'west',
            order?: number,
        },
    },
    isExpanded?: boolean,
    isInteractive?: boolean,
    isVisible?: boolean,
};
export type DagEdgeId = string;
export type DagEdgeSpec = {
    startId: DagNodeId,
    endId: DagNodeId,
    startPort?: string,
    endPort?: string,
    // TODO: Edge have Viz?
};
export type DagLayoutModel = {
    type: 'DagLayout',
    contents: {
        nodes: {
            [DagNodeId]: DagNodeSpec,
        },
        edges: {
            [DagEdgeId]: DagEdgeSpec,
        },
        alignments?: Array<Array<DagNodeId>>,
        flowDirection?: 'north' | 'south' | 'east' | 'west',
        flowSpacing?: number,
        alignChildren?: boolean,
    },
};

// =================================================================================================
// Public functions

/**
 * Get the entire viz table.
 * @param state
 * @returns
 *     Table mapping `VizId` to `VizSpec`.
 */
export function getVizTable(state: VizTableState): { [VizId]: VizSpec } {
    return state.vizTable;
}

/**
 * Get the `VizSpec` corresponding to the specified `VizId`, or undefined if not found.
 * @param state
 * @param vizId
 * @returns {VizSpec | undefined}
 */
export function getVizSpec(state: VizTableState, vizId: VizId): VizSpec | undefined {
    return state.vizTable[vizId];
}

/**
 * Whether the `VizSpec` corresponding to the specified `VizId` exists.
 * @param state
 * @param vizId
 * @returns {boolean}
 */
export function hasVizSpec(state: VizTableState, vizId: VizId): boolean {
    return vizId in state.vizTable;
}
