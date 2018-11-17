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
 *  This allows storage/transmission efficiency, and looking at the filled stated implicit communicated the default
 *  model to render.
 */
export type VizSpec = {
    /** Absolute path of the file in which this viz was viewed. */
    filePath: string,

    /** Line number of view statement within file at `filePath`. */
    lineNumber: number,

    /** Model that is just string summary of the object and does not allow references (i.e. it "bottoms-out"). */
    summaryModel: VizModel,

    /** Model that visualizes a tiny subset of the object data and allows references. */
    compactModel?: VizModel,

    /** Model that visualizes all the object data and allows references. */
    fullModel?: VizModel,
};

/** A mode of visualization for a viz. */
export type VizModel = PrimitiveModel | LayoutModel;

// =====================================================================================================================
// Viz primitives
// --------------
// Visual "building blocks".

/** Any primitive model. */
export type PrimitiveModel = TokenPrimitiveModel;

/** Token primitive is __. */
export type TokenPrimitiveModel = {
    type: 'TokenPrimitive',
    contents: {
        text: string,
    },
};

// =====================================================================================================================
// Viz layouts
// -----------
// Visual "configurations" of "building blocks".

/** Any layout model. */
export type LayoutModel = SequenceLayoutModel | KeyValueLayoutModel;

/** Sequence layout is __. */
export type SequenceLayoutModel = {
    type: 'SequenceLayout',
    contents: {
        elements: Array<VizId>,
        orientation?: 'horizontal' | 'vertical',
    },
};

/** KeyValue layout is __. */
export type KeyValueLayoutModel = {
    type: 'KeyValueLayout',
    contents: {
        elements: {
            [VizId]: VizId,
        },
    },
};

// =====================================================================================================================
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
