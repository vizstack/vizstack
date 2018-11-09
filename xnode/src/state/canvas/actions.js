import type {VizId} from "../viztable/outputs";
import type {ViewerId} from "./outputs";

/** Action type definitions. */
export const CanvasActions = Object.freeze({
    CLEAR_CANVAS:                'canvas::CLEAR_CANVAS',
    CREATE_VIEWER:               'canvas::CREATE_VIEWER',
    DESTROY_VIEWER:              'canvas::DESTROY_VIEWER',
    SHOW_VIEWER_IN_CANVAS:       'canvas::SHOW_VIEWER_IN_CANVAS',
    HIDE_VIEWER_IN_CANVAS:       'canvas::HIDE_VIEWER_IN_CANVAS',
    REORDER_VIEWER_IN_CANVAS:    'canvas::REORDER_VIEWER_IN_CANVAS',
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
 * Action creator to add a viewer (at any level of nesting) for a particular top-level Viz.
 * @param viewerId
 *     A string ID that uniquely identifies the created viewer.
 * @param vizId
 *     `VizId` for top-level Viz rendered by the viewer.
 * @param expansionState?
 *     Whether in 'summary', 'compact', or 'full' display expansion state. (Optional)
 * @param parentViewerId?
 *     The unique ID of the parent viewer, this viewer is nested. (Optional)
 * @returns {object}
 */
export function createViewerAction(viewerId: string,
                                   vizId: VizId,
                                   expansionState?: 'summary' | 'compact' | 'full',
                                   parentViewerId?: string) {
    return {
        type: CanvasActions.CREATE_VIEWER,
        viewerId,
        vizId,
        expansionState,
        parentViewerId,
    };
}

/**
 * Action creator to destroy a viewer (at any level of nesting) and all its related information.
 * @param viewerId
 * @returns {object}
 */
export function destroyViewerAction(viewerId: string | ViewerId) {
    return {
        type: CanvasActions.DESTROY_VIEWER,
        viewerId,
    };
}

/**
 * Action creator to show a (top-level) viewer in the Canvas.
 * @param viewerId
 * @param insertAfterIdx
 *     Index in layout after which to add the new viewer. (Optional, default: -1 adds to end).
 * @returns {object}
 */
export function showViewerInCanvasAction(viewerId: string | ViewerId,
                                         insertAfterIdx?: number = -1) {
    return {
        type: CanvasActions.SHOW_VIEWER_IN_CANVAS,
        viewerId,
        insertAfterIdx,
    };
}

/**
 * Action creator to hide a single (top-level) viewer currently in the Canvas.
 * @param viewerId
 * @returns {object}
 */
export function hideViewerInCanvasAction(viewerId: string | ViewerId) {
    return {
        type: CanvasActions.HIDE_VIEWER_IN_CANVAS,
        viewerId,
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
