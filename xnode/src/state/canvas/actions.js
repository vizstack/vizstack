import { kViewerType } from './outputs';

/** Action type definitions. */
export const kCanvasActions = Object.freeze({
    CLEAR_CANVAS:        'canvas::CLEAR_CANVAS',
    ADD_VIEWER:          'canvas::ADD_VIEWER',
    REMOVE_VIEWER:       'canvas::REMOVE_VIEWER',
    REORDER_VIEWER:      'canvas::REORDER_VIEWER',
});

/**
 * Action creator to clear the canvas of all viewers.
 */
export function clearCanvasAction() {
    return {
        type: kCanvasActions.CLEAR_CANVAS,
    }
}

/**
 * Action creator to add a snapshot viewer to the Canvas for the symbol with the given `symbolId`. For a given
 * object, there may be many snapshots of it; each at a different point in time, and each with a different `symbolId`.
 *
 * @param {string} symbolId
 *     Symbol ID for backing symbol of this viewer.
 * @param {int} insertAfter
 *     Viewer ID of viewer in Canvas layout after which to add new a viewer. (Default of -1 means add to end).
 * @returns {object}
 */
export function addSnapshotViewerAction(symbolId: string, insertAfter = -1) {
    return {
        type: kCanvasActions.ADD_VIEWER,
        viewerObj: {
            type: kViewerType.SNAPSHOT,
            symbolId,
        },
        insertAfter,
    };
}

/**
 * Action creator to add a snapshot viewer to the Canvas for the symbol with the given `snapshotSymbolId`. For a given
 * symbol, there may be many snapshots of it (each at a different point in time).
 *
 * @param {string} text
 *     The text string to print.
 * @param {int} insertAfter
 * @returns {object}
 */
export function addPrintViewerAction(text: string, insertAfter = -1) {
    return {
        type: kCanvasActions.ADD_VIEWER,
        viewerObj: {
            type: kViewerType.PRINT,
            text,
        },
        insertAfter,
    };
}


/**
 * Action creator to remove a viewer from the Canvas.
 *
 * @param {int} viewerId
 * @returns {object}
 */
export function removeViewerAction(viewerId: number) {
    return {
        type: kCanvasActions.REMOVE_VIEWER,
        viewerId
    };
}

/**
 * Action creator to move a viewer from the original `startIdx` to the updated `endIdx`.
 *
 * @param startIdx
 * @param endIdx
 * @returns {object}
 */
export function reorderViewerAction(startIdx: number, endIdx: number) {
    return {
        type: kCanvasActions.REORDER_VIEWER,
        startIdx,
        endIdx,
    };
}
