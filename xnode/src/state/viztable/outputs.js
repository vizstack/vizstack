import { VizTableState } from './reducers';

/** Unique identifier of a viz from a snapshot in time. */
export type VizId = string;

/** Specification of a viz from a snapshot in time. */
export type VizSpec = {

    // Absolute path of the file in which this viz was viewed.
    filePath: string,

    // Line number of view statement within file at `filePath`.
    lineNumber: number,

    // Model of viz that "bottoms-out" the nested references.
    compactModel: VizModel,

    // Model of viz that makes use of nested references to other vizzes.
    fullModel: VizModel,
};

/** Type declaration for symbol type. */
export type Primitive = (
    'TokenPrimitive'
    );

export type Layout = (
    'SequenceLayout' |
    'KeyValueLayout'
    );

export type VizModel = {
    type: Primitive | Layout,
    contents: {},
};

/**
 * Get the entire viz table.
 * @param state
 * @returns Table mapping VizId to VizSpec.
 */
export function getVizTable(state: VizTableState): { [VizId]: VizSpec } {
    return state.vizTable;
}

/**
 * Get the symbol object corresponding to the specified symbol ID.
 * @param state
 * @param vizId
 * @returns Specified VizSpec object, or undefined if not found.
 */
export function getVizSpec(state: VizTableState, vizId: VizId): VizSpec | undefined {
    return state.vizTable[vizId];
}