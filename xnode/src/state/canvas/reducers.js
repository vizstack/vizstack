import Immutable from 'seamless-immutable';
import { CanvasActions } from './actions';
import type { Viewer } from './outputs';

/** Root reducer's state slice shape. */
export type CanvasState = {
    // Unique viewer ID, incremented on each add.
    currentViewerId: number,

    // Map from viewer ID to viewer objects.
    viewerObjects: {
        [viewerId: string]: Viewer,
    },

    // List of viewer ID strings in order of display.
    viewerPositions: Array<string>,
};

/** Root reducer's initial state slice. */
const initialState: CanvasState = Immutable({
    currentViewerId: 0,
    viewerObjects: {},
    viewerPositions: [],
});

/**
 * Root reducer for updating the canvas view state.
 */
export function canvasReducer(state: CanvasState = initialState, action = {}) {
    const { type } = action;
    switch(type) {
        case CanvasActions.ADD_VIEWER:          return addViewerReducer(state, action);
        case CanvasActions.REMOVE_VIEWER:       return removeViewerReducer(state, action);
        case CanvasActions.REORDER_VIEWER:      return reorderViewerReducer(state, action);
        case CanvasActions.CLEAR_CANVAS:        return clearCanvasReducer(state, action);
    }
    return state;  // No effect by default
};

/**
 * Resets the canvas, removing all viewers.
 */
function clearCanvasReducer(state, action) {
    return initialState;
}

/**
 * Adds a viewer to the canvas. Assumes `data` for symbol object is already loaded.
 */
function addViewerReducer(state, action) {
    const { viewerObj, insertAfter } = action;
    const { currentViewerId } = state;
    if(insertAfter < -1) {
        console.error("Invalid `insertAfter` parameter to `addViewerReducer`; got ", insertAfter);
        return state;
    }
    const insertAfterIdx = insertAfter === -1 ? -1 : state.viewerPositions.findIndex((elem) => elem === insertAfter);
    return (
        state
        .setIn(['viewerObjects', `${currentViewerId}`], viewerObj, {deep: true})
        .update('viewerPositions', (prev) => Immutable([]).concat(
            insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
            [`${state.currentViewerId}`],
            insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
        ))
        .update('currentViewerId', (prev) => prev + 1)
    );
}

/**
 * Removes a viewer from the canvas.
 */
function removeViewerReducer(state, action) {
    const { viewerId } = action;
    const removeIdx = state.viewerPositions.findIndex((elem) => elem === viewerId);
    if(removeIdx === -1) {
        console.error("Could not find viewer with specified `viewerId` to remove; got ", viewerId);
        return state;
    }
    return (
        state
        .update('viewerPositions', (arr) => arr.slice(0, removeIdx).concat(arr.slice(removeIdx + 1)))
        .setIn(['viewerObjects', viewerId], undefined)
    );
}

/**
 * Moves a viewer from the start to end position in the canvas layout.
 */
function reorderViewerReducer(state, action) {
    const { startIdx, endIdx } = action;
    return (
        state
        .update('viewerPositions', (viewerPositions) => {
            const arr = viewerPositions.asMutable();
            const [removed] = arr.splice(startIdx, 1);
            arr.splice(endIdx, 0, removed);
            return arr;
        })
    );
}
