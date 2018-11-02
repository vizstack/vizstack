import type { CanvasState } from './reducers';
import type { VizId } from '../viztable/outputs';

/** Creates derived data structure for viewers. */
export type Viewer = {
    // Symbol ID of snapshot symbol.
    symbolId: VizId,
}

export function getViewerPositions(state: CanvasState): string[] {
    return state.viewerPositions;
}

export function getViewers(state: CanvasState): { [string]: Viewer } {
    return state.viewerObjects;
}

export function getViewer(state: CanvasState, viewerId: string): Viewer | undefined {
    return state.viewerObjects[viewerId];
}