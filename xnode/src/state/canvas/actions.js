import type {VizId} from "../viztable/outputs";
import type {ExpansionState} from "../canvas/outputs";

/** Action type definitions. */
export const CanvasActions = Object.freeze({
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
        type: CanvasActions.CLEAR_CANVAS,
    }
}

/**
 * Action creator to add a viewer to the Canvas for the viz with the given `vizId`. For a given backend
 * symbol/expression, there may be many snapshots of it from different points in time, each with a unique `vizId`.
 *
 * @param vizId
 *     VizId for top-level viz in this ViewerSpec.
 * @param addToCanvas
 *     Whether to show the new viewer as a top-level viewer in the canvas.
 * @param insertAfter
 *     ViewerId of viewer in Canvas layout after which to add new a viewer. (Default of -1 means add to end).
 * @returns {object}
 */
export function addViewerAction(vizId: VizId, expansionState: ExpansionState, addToCanvas: boolean,
                                insertAfter: number = -1) {
    return {
        type: CanvasActions.ADD_VIEWER,
        vizId,
        addToCanvas,
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
        type: CanvasActions.REMOVE_VIEWER,
        viewerId,
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
        type: CanvasActions.REORDER_VIEWER,
        startIdx,
        endIdx,
    };
}
