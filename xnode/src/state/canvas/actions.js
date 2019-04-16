import type { Display } from './outputs';

/** Action type definitions. */
export const CanvasActions = Object.freeze({
    CLEAR_CANVAS: 'canvas::CLEAR_CANVAS',
    SHOW_VIEWER_IN_CANVAS: 'canvas::SHOW_VIEWER_IN_CANVAS',
    HIDE_VIEWER_IN_CANVAS: 'canvas::HIDE_VIEWER_IN_CANVAS',
    REORDER_VIEWER_IN_CANVAS: 'canvas::REORDER_VIEWER_IN_CANVAS',
});

/**
 * Action creator to reset all state related to the current canvas.
 * @returns {object}
 */
export function clearCanvasAction() {
    return {
        type: CanvasActions.CLEAR_CANVAS,
    };
}

/**
 * Action creator to show a (top-level) viz viewer in the Canvas.
 * @param vizId
 * @param insertAfterIdx
 *     Index in layout after which to add the new viewer. (Optional, default: -1 adds to end).
 * @returns {object}
 */
export function showViewerInCanvasAction(display: Display, insertAfterIdx?: number = -1) {
    return {
        type: CanvasActions.SHOW_VIEWER_IN_CANVAS,
        display,
        insertAfterIdx,
    };
}

/**
 * Action creator to hide a single (top-level) viz viewer in the Canvas.
 * @param vizId
 * @returns {object}
 */
export function hideViewerInCanvasAction(display: Display) {
    return {
        type: CanvasActions.HIDE_VIEWER_IN_CANVAS,
        display,
    };
}

/**
 * Action creator to move a viewer from the original `startIdx` to the updated `endIdx`.
 * @param startIdx
 * @param endIdx
 * @returns {object}
 */
export function reorderViewerInCanvasAction(startIdx: number, endIdx: number) {
    return {
        type: CanvasActions.REORDER_VIEWER_IN_CANVAS,
        startIdx,
        endIdx,
    };
}
