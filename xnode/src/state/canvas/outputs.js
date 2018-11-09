import type { CanvasState } from './reducers';
import type {VizId, VizSpec} from '../viztable/outputs';
import {createSelector} from "reselect";
import {getVizTable} from "../viztable/outputs";

/** Unique identifier of a viz from a snapshot in time. */
export type ViewerId = string;

/** Specification of a viz from a snapshot in time. */
export type ViewerSpec = {

    // VizId of the top-level viz rendered by this viewer.
    vizId: VizId,

    // Whether the viewer displays a summary, compact, or full model.
    viewerState: 'summary' | 'compact' | 'full',

    // Map from direct child `Viewer`'s top-level `VizId` to its `ViewerId`.
    childViewerTable: {
        [VizId]: ViewerId,
    }
}

/**
 * Returns an array of `ViewerId`s in order of layout in the canvas.
 * @param state
 * @returns Array<ViewerId>
 */
export function getCanvasLayout(state: CanvasState): Array<ViewerId> {
    return state.layout;
}

/**
 * Returns a table of all `ViewerSpec`s, keyed by their `ViewerId`.
 * @param state
 * @returns {{[p: ViewerId]: ViewerSpec}}
 */
export function getViewerTable(state: CanvasState): { [ViewerId]: ViewerSpec } {
    return state.viewerTable;
}

/**
 * Returns the `ViewerSpec` for specified viewer.
 * @param state
 * @param viewerId
 * @returns {ViewerSpec}
 */
export function getViewer(state: CanvasState, viewerId: ViewerId): ViewerSpec | undefined {
    return state.viewerTable[viewerId];
}