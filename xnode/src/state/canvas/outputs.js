import type { CanvasState } from './reducers';
import type {VizId, VizSpec} from '../viztable/outputs';
import {createSelector} from "reselect";
import {getVizTable} from "../viztable/outputs";

/** Unique identifier of a viz from a snapshot in time. */
export type ViewerId = string;

export type ExpansionState = 'summary' | 'compact' | 'full';

/** Specification of a viz from a snapshot in time. */
export type ViewerSpec = {

    // VizId of the top-level viz rendered by this viewer.
    vizId: VizId,

    // Whether the viewer is a summary, compact, or full.
    expansionState: ExpansionState,

    children: {
        [VizId]: ViewerId,
    }
}

export type ViewerModel = {

    // Unique ViewerId that identifies this viewer.
    viewerId: ViewerId,

    // Unique VizId of top-level viz.
    vizId: VizId,

    // Specification of
    vizSpec: VizSpec,

    expansionState: ExpansionState,
}

/**
 * Selector to assemble a Viewer object from the current Redux state.
 * @param state
 */
export const getCanvasViewers: ({}) => Array<ViewerModel> = createSelector(
    (state) => getViewerPositions(state.canvas),
    (state) => getViewerTable(state.canvas),
    (state) => getVizTable(state.viztable),
    (viewerPositions: Array<ViewerId>,
     viewerTable : {[ViewerId]: ViewerSpec},
     vizTable: {[VizId]: VizSpec}): Array<ViewerModel> => {
        return viewerPositions.map((viewerId) => {
            const { vizId, expansionState } = viewerTable[viewerId];
            const vizSpec = vizTable[vizId];
            return {
                viewerId,
                vizId,
                vizSpec,
                expansionState,
            };

        });
    }
);

export function getViewerPositions(state: CanvasState): Array<ViewerId> {
    return state.viewerPositions;
}

export function getViewerTable(state: CanvasState): { [ViewerId]: ViewerSpec } {
    return state.viewerTable;
}

export function getViewer(state: CanvasState, viewerId: ViewerId): ViewerSpec | undefined {
    return state.viewerTable[viewerId];
}