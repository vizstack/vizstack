import { VizTableState } from './reducers';
import { ViewId, ViewSpec } from "../../core/schema";

/** Unique identifier of a viz from a snapshot in time. */
export type VizId = ViewId;

/** Specification of a viz from a snapshot in time. */
export type VizSpec = {
    /** Absolute path of the file in which this viz was viewed. */
    filePath: string,

    /** Line number of view statement within file at `filePath`. */
    lineNumber: number,

    /** Normalized specification of all models in a view. */
    viewSpec: ViewSpec,
};

// =================================================================================================
// Public functions

/**
 * @param state
 * @returns
 *     Table mapping `VizId` to `VizSpec`.
 */
export function getVizTable(state: VizTableState): { [VizId]: VizSpec } {
    return state.vizTable;
}

/**
 * @param state
 * @param vizId
 * @returns
 *     `VizSpec` corresponding to the specified `VizId`, or undefined if not found.
 */
export function getVizSpec(state: VizTableState, vizId: VizId): VizSpec | undefined {
    return state.vizTable[vizId];
}

/**
 * @param state
 * @param vizId
 * @returns
 *     Whether the `VizSpec` corresponding to the specified `VizId` exists.
 */
export function hasVizSpec(state: VizTableState, vizId: VizId): boolean {
    return vizId in state.vizTable;
}
