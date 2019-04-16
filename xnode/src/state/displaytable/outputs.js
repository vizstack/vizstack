import { DisplayTableState } from './reducers';
import { ViewId, ViewSpec } from "../../core/schema";

/** Specification of a viz from a snapshot in time. */
export type DisplaySpec = {
    /** Absolute path of the file in which this viz was viewed. */
    filePath: string,

    /** Line number of view statement within file at `filePath`. */
    lineNumber: number,

    /** Normalized specification of all models in a view. */
    viewSpec: ViewSpec,
};

export type DisplayId = string;

// =================================================================================================
// Public functions

/**
 * @param state
 * @returns
 *     Table mapping `VizId` to `DisplaySpec`.
 */
export function getDisplaySpecs(state: DisplayTableState): {[DisplayId]: DisplaySpec} {
    return state.displaySpecs;
}

/**
 * @param state
 * @param vizId
 * @returns
 *     `DisplaySpec` corresponding to the specified `VizId`, or undefined if not found.
 */
export function getDisplaySpec(state: DisplayTableState, displayId: DisplayId): DisplaySpec | undefined {
    return state.displaySpecs[displayId];
}
