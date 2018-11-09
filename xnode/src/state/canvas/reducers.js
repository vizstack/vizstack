import Immutable from 'seamless-immutable';
import { CanvasActions } from './actions';
import type { ViewerId, ViewerSpec } from './outputs';

/** Root reducer's state slice shape. */
export type CanvasState = {

    // Map from viewer IDs to `ViewerSpec` specifications.
    viewerTable: {
        [ViewerId]: ViewerSpec,
    },

    // List of ViewerIds in order of display.
    layout: Array<ViewerId>,
};

/** Root reducer's initial state slice. */
const initialState: CanvasState = Immutable({
    viewerTable: {},
    layout: [],
});

/**
 * Root reducer for updating the canvas view state.
 * @param state
 * @param action
 */
export function canvasReducer(state: CanvasState = initialState, action = {}) {
    const { type } = action;
    switch(type) {
        case CanvasActions.CLEAR_CANVAS:                return clearCanvasReducer(state, action);
        case CanvasActions.CREATE_VIEWER:               return createViewerReducer(state, action);
        case CanvasActions.DESTROY_VIEWER:              return destroyViewerReducer(state, action);
        case CanvasActions.SHOW_VIEWER_IN_CANVAS:       return showViewerInCanvasReducer(state, action);
        case CanvasActions.HIDE_VIEWER_IN_CANVAS:       return hideViewerInCanvasReducer(state, action);
        case CanvasActions.REORDER_VIEWER_IN_CANVAS:    return reorderViewerInCanvasReducer(state, action);
    }
    return state;  // No effect by default
};


/**
 * Resets all information related to the Canvas.
 * @param state
 * @param action
 */
function clearCanvasReducer(state, action) {
    return initialState;
}

/**
 * Creates a new `ViewerSpec` and adds it to the `viewerTable`. If applicable, registers self with parent.
 * `ViewerSpec`.
 * @param state
 * @param action
 */
function createViewerReducer(state, action) {
    const { viewerId, vizId, expansionState, parentViewerId } = action;
    const viewerSpec: ViewerSpec = {
        vizId,
        viewerState: expansionState,
        childViewerTable: {},
    };
    state = state.setIn(['viewerTable', viewerId], viewerSpec, { deep: true });
    if(parentViewerId) {
        state = state.setIn(['viewerTable', parentViewerId, 'childViewerTable', vizId], viewerId);
    }
    return state;
}

/**
 * Removes the viewer from the `viewerTable`.
 * @param state
 * @param action
 */
function destroyViewerReducer(state, action) {
    const { viewerId } = action;
    return state.setIn(['viewerTable', viewerId], undefined);
}

/**
 * Show a top-level viewer in the Canvas layout.
 * @param state
 * @param action
 */
function showViewerInCanvasReducer(state, action) {
    const { viewerId, insertAfterIdx } = action;
    return state.setIn('layout', (prev) => Immutable([]).concat(
        insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
        [ viewerId ],
        insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
    ));
}

/**
 * Hides a top-level viewer from the Canvas layout.
 * @param state
 * @param action
 */
function hideViewerInCanvasReducer(state, action) {
    const { viewerId } = action;
    const removeIdx = state.layout.findIndex((elem) => elem === viewerId);
    if(removeIdx === -1) {
        console.error("Could not hide viewer; no viewer with `viewerId` ", viewerId);
        return state;
    }
    return state.update('layout', (arr) => arr.slice(0, removeIdx).concat(arr.slice(removeIdx + 1)));
}

/**
 * Moves a viewer from the start to end position in the canvas layout.
 * @param state
 * @param action
 */
function reorderViewerInCanvasReducer(state, action) {
    const { startIdx, endIdx } = action;
    return (
        state
        .update('layout', (viewerPositions) => {
            const arr = viewerPositions.asMutable();
            const [removed] = arr.splice(startIdx, 1);
            arr.splice(endIdx, 0, removed);
            return arr;
        })
    );
}
