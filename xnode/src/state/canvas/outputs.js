import type { CanvasState } from './reducers';
import type { SymbolId } from '../program/outputs';

/** Constants for viewer types. */
export const kViewerType = Object.freeze({
    SNAPSHOT: 'canvas/kViewerType::SNAPSHOT',
    PRINT:    'canvas/kViewerType::PRINT',
});


/** Creates derived data structure for viewers. */
export type SnapshotViewerObject = {
    // Viewer type enum.
    type: kViewerType.SNAPSHOT,

    // Symbol ID of snapshot symbol.
    symbolId: SymbolId,
}
export type PrintViewerObject = {
    // Viewer type enum.
    type: kViewerType.PRINT,

    // Text string to print.
    text: string,
}
export type ViewerObject = SnapshotViewerObject | PrintViewerObject;

export function getViewerPositions(state: CanvasState): string[] {
    return state.viewerPositions;
}

export function getViewerObjects(state: CanvasState): { [string]: ViewerObject } {
    return state.viewerObjects;
}

export function getViewerObject(state: CanvasState, viewerId: string): ViewerObject | undefined {
    return state.viewerObjects[viewerId];
}