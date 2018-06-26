'use babel';

import { ensureSymbolDataLoadedActionThunk } from "./program";
import { isSymbolIdFrozen } from '../services/symbol-utils';

/** Action type definitions. */
export const CanvasActions = {
    ADD_VIEWER:          "CANVAS::ADD_VIEWER",
    REMOVE_VIEWER:       "CANVAS::REMOVE_VIEWER",
    UPDATE_LAYOUT:       "CANVAS::UPDATE_LAYOUT",
    CLEAR_CANVAS:        "CANVAS::CLEAR_CANVAS",
};

/**
 * Action creator to clear the canvas of all viewers.
 *
 * @returns {{type: string}}
 */
export function clearCanvasAction() {
    return {
        type: CanvasActions.CLEAR_CANVAS,
    }
}

/**
 * Action creator to add a viewer to the canvas for the symbol with the given `symbolId`. It is possible to have
 * multiple viewers with the same `symbolId` -- each will have a viewer with linked properties to the others.
 *
 * @param {string} symbolId
 *     Symbol to create new viewer for.
 * @returns {{type: string, symbolId: string}}
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
