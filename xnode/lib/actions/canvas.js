'use babel';

/** Action type definitions. */
export const CanvasActions = Object.freeze({
    CLEAR_CANVAS:        "CANVAS::CLEAR_CANVAS",
    ADD_VIEWER:          "CANVAS::ADD_VIEWER",
    REMOVE_VIEWER:       "CANVAS::REMOVE_VIEWER",
    UPDATE_LAYOUT:       "CANVAS::UPDATE_LAYOUT",
});

export const ViewerTypes = Object.freeze({
    SNAPSHOT:            "CANVAS:VIEWER_SNAPSHOT",
    LIVE:                "CANVAS:VIEWER_LIVE",
    PRINT:               "CANVAS:VIEWER_PRINT",
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
 * Action creator to add a snapshot viewer to the Canvas for the symbol with the given `snapshotSymbolId`. For a given
 * symbol, there may be many snapshots of it (each at a different point in time).
 *
 * @param {string} snapshotSymbolId
 *     Symbol ID (with snapshot formatting) for backing symbol of this viewer.
 * @param {int} (optional) insertAfter
 *     Zero-indexed position in Canvas layout after which to add new viewer, e.g. to add after element `5`, pass
 *     `5`. (Default of -1 means add to end).
 * @returns {object}
 */
export function addSnapshotViewerAction(snapshotSymbolId, insertAfter = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        viewerObj: {
            type: ViewerTypes.SNAPSHOT,
            symbolId: snapshotSymbolId
        },
        insertAfter,
    };
}

/**
 * Action creator to add a live viewer to the Canvas for the symbol with the given `liveSymbolId`. For a given
 * symbol, there may be many live inspections of it.
 *
 * @param {string} liveSymbolId
 *     Symbol ID (with live formatting) for backing symbol of this viewer.
 * @param {int} (optional) insertAfter
 * @returns {object}
 */
export function addLiveViewerAction(liveSymbolId, insertAfter = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        viewerObj: {
            type: ViewerTypes.LIVE,
            symbolId: liveSymbolId
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
 * @param {int} (optional) insertAfter
 * @returns {object}
 */
export function addPrintViewerAction(text, insertAfter = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        viewerObj: {
            type: ViewerTypes.PRINT,
            text: text
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
