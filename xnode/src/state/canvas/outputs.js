import type { CanvasState } from './reducers';
import type { VizId } from '../viztable/outputs';

/** Unique identifier of a viz from a snapshot in time. */
export type ViewerId = string;

/** Specification of a viz from a snapshot in time. */
export type ViewerSpec = {

    // VizId of the top-level viz rendered by this viewer.
    vizId: VizId,
}

export function getViewerPositions(state: CanvasState): Array<ViewerId> {
    return state.viewerPositions;
}

export function getViewerTable(state: CanvasState): { [ViewerId]: ViewerSpec } {
    return state.viewerTable;
}

export function getViewer(state: CanvasState, viewerId: ViewerId): ViewerSpec | undefined {
    return state.viewerTable[viewerId];
}