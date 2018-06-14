'use babel';

import { ensureSymbolDataLoadedActionThunk } from "./program";
import { isSymbolIdFrozen } from '../services/symbol-utils';

/** Action type definitions. */
export const CanvasActions = {
    ADD_VIEWER:          "CANVAS::ADD_VIEWER",
    REMOVE_VIEWER:       "CANVAS::REMOVE_VIEWER",
    UPDATE_LAYOUT:       "CANVAS::UPDATE_LAYOUT",
    SET_IN_PAYLOAD:      "CANVAS::SET_IN_PAYLOAD",
    CLEAR_CANVAS:        "CANVAS::CLEAR_CANVAS",
};


export function clearCanvasAction() {
    return {
        type: CanvasActions.CLEAR_CANVAS,
    }
}



/**
 * Action creator thunk to add a viewer to the canvas for the symbol with the given `symbolId`. It is possible to have
 * multiple viewers with the same `symbolId` -- each will have a viewer with linked properties to the others.
 *
 * @param symbolId
 *     Symbol to create new viewer for.
 * @param {int} freezeNonce:
 *      A positive number to be used for freezing the viewer, or -1 if the viewer is not frozen.
 * @returns {{type: string, symbolId: *}}
 *
 */
export function addViewerAction(symbolId) {
    return {
        type: CanvasActions.ADD_VIEWER,
        symbolId,
    };
}

/**
 * Action creator to remove a viewer from the data canvas.
 *
 * @param {int} viewerId
 * @returns {{type: string, viewerId: int}}
 */
export function removeViewerAction(viewerId) {
    return {
        type: CanvasActions.REMOVE_VIEWER,
        viewerId
    };
}

/**
 * Action created to update the layout of the canvas.
 *
 * @param layout
 * @returns {{type: string, layout: *}}
 */
export function updateLayoutAction(layout) {
    return {
        type: CanvasActions.UPDATE_LAYOUT,
        layout
    };
}

/**
 * Action creator to setIn `value` at the location of `keyArray` in the viewer's payload object.
 */
export function setInViewerPayloadAction(viewerId, keyArray, value) {
    return {
        type: CanvasActions.SET_IN_PAYLOAD,
        viewerId,
        keyArray,
        value,
    }
}
