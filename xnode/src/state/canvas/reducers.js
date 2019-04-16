import Immutable from 'seamless-immutable';
import { CanvasActions } from './actions';
import type { VizId } from '../viztable/outputs';

/** Root reducer's state slice shape. */
export type CanvasState = {
    // List of VizIds in order of display.
    layout: Array<VizId>,
};

/** Root reducer's initial state slice. */
const initialState: CanvasState = Immutable({
    layout: [],
});

/**
 * Root reducer for updating the canvas view state.
 * @param state
 * @param action
 */
export function canvasReducer(state: CanvasState = initialState, action = {}) {
    const { type } = action;
    switch (type) {
        case CanvasActions.CLEAR_CANVAS:
            return clearCanvasReducer(state, action);
        case CanvasActions.SHOW_VIEWER_IN_CANVAS:
            return showViewerInCanvasReducer(state, action);
        case CanvasActions.HIDE_VIEWER_IN_CANVAS:
            return hideViewerInCanvasReducer(state, action);
        case CanvasActions.REORDER_VIEWER_IN_CANVAS:
            return reorderViewerInCanvasReducer(state, action);
    }
    return state; // No effect by default
}

/**
 * Resets all information related to the Canvas.
 * @param state
 * @param action
 */
function clearCanvasReducer(state, action) {
    return initialState;
}

/**
 * Show a top-level viewer in the Canvas layout.
 * @param state
 * @param action
 */
function showViewerInCanvasReducer(state, action) {
    const { vizId, insertAfterIdx } = action;
    return state.update('layout', (prev) =>
        Immutable([]).concat(
            insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
            [vizId],
            insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
        ),
    );
}

/**
 * Hides a top-level viewer from the Canvas layout.
 * @param state
 * @param action
 */
function hideViewerInCanvasReducer(state, action) {
    const { vizId } = action;
    const removeIdx = state.layout.findIndex((id) => id === vizId);
    if (removeIdx === -1) {
        console.error('Could not hide viewer; no viewer with `viewId` ', vizId);
        return state;
    }
    return state.update('layout', (arr) =>
        arr.slice(0, removeIdx).concat(arr.slice(removeIdx + 1)),
    );
}

/**
 * Moves a viewer from the start to end position in the canvas layout.
 * @param state
 * @param action
 */
function reorderViewerInCanvasReducer(state, action) {
    const { startIdx, endIdx } = action;
    return state.update('layout', (viewerPositions) => {
        const arr = viewerPositions.asMutable();
        const [removed] = arr.splice(startIdx, 1);
        arr.splice(endIdx, 0, removed);
        return arr;
    });
}
