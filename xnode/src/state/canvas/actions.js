import { ViewerTypes } from './constants';

/** Action type definitions. */
export const CanvasActions = Object.freeze({
    CLEAR_CANVAS:        "CANVAS::CLEAR_CANVAS",
    ADD_VIEWER:          "CANVAS::ADD_VIEWER",
    REMOVE_VIEWER:       "CANVAS::REMOVE_VIEWER",
    UPDATE_LAYOUT:       "CANVAS::UPDATE_LAYOUT",
});

/**
 * Action creator to clear the canvas of all viewers.
 */
export function clearCanvasAction() {
    return {
        type: CanvasActions.CLEAR_CANVAS,
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
export function addSnapshotViewerAction(symbolId, insertAfter = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        viewerObj: {
            type: ViewerTypes.SNAPSHOT,
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
export function addPrintViewerAction(text, insertAfter = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        viewerObj: {
            type: ViewerTypes.PRINT,
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
export function removeViewerAction(viewerId) {
    return {
        type: CanvasActions.REMOVE_VIEWER,
        viewerId
    };
}

/**
 * Action created to update the layout of the Canvas.
 *
 * @param layout
 * @returns {object}
 */
export function updateLayoutAction(layout) {
    return {
        type: CanvasActions.UPDATE_LAYOUT,
        layout
    };
}
