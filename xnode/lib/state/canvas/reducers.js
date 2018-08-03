'use babel';

import Immutable from 'seamless-immutable';
import { CanvasActions } from './actions';
import { ViewerTypes } from './constants';

/**
 * State slice structure for `canvas`:
 * {
 *     'currentViewerId': 35,
 *     'viewerObjects': {
 *         '32': {
 *             type: ViewerTypes.SNAPSHOT
 *             symbolId: "@id:12345!0!"
 *         },
 *         '33': {
 *             type: ViewerTypes.LIVE
 *             symbolId: "@id:12345"
 *         }
 *         '34': {
 *             type: ViewerTypes.PRINT
 *             text: "The quick brown fox ..."
 *         }
 *     },
 *     'viewerPositions': [{
 *         i, x, y, w, h, ...
 *     }],
 * }
 */

/** Root reducer's initial state slice. */
const initialState = Immutable({
    currentViewerId: 0,
    viewerObjects: {},
    viewerPositions: [],
});

/**
 * Root reducer for updating the canvas view state.
 */
export default function rootReducer(state = initialState, action) {
    const { type } = action;
    switch(type) {
        case CanvasActions.ADD_VIEWER:          return addViewerReducer(state, action);
        case CanvasActions.REMOVE_VIEWER:       return removeViewerReducer(state, action);
        case CanvasActions.UPDATE_LAYOUT:       return updateLayoutReducer(state, action);
        case CanvasActions.CLEAR_CANVAS:        return clearCanvasReducer(state, action);
    }
    return state;  // No effect by default
};

/* Constants for default React Grid Layout element sizes. */
const DEFAULT_H = 3;
const DEFAULT_MIN_H = 2;

/**
 * Reset the canvas, removing all viewers.
 */
function clearCanvasReducer(state, action) {
    return initialState;
}

/**
 * Add a viewer to Canvas. Assumes `data` for symbol is already loaded.
 */
function addViewerReducer(state, action) {
    const { viewerObj, insertAfter } = action;
    const { currentViewerId } = state;
    if(insertAfter < -1) {
        console.error("Invalid `insertAfter` parameter to `addViewerReducer`; got ", insertAfter);
        return state;
    }
    const insertAfterIdx = insertAfter === -1 ? -1 : state.viewerPositions.findIndex((elem) => elem.i === insertAfter);
    console.log(viewerObj);
    return (
        state
        .setIn(['viewerObjects', `${currentViewerId}`], viewerObj, {deep: true})
        .update('viewerPositions', (prev) => Immutable([]).concat(
            insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
            [{
                i:    `${state.currentViewerId}`,  // Required by API to be string
                x:    0,
                y:    Infinity,
                w:    1,
                h:    DEFAULT_H,
                minW: 1,
                maxW: 1,
                minH: DEFAULT_MIN_H,
            }],
            insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
        ))
        .update('currentViewerId', (prev) => prev + 1)
    );
}

/**
 * Remove a viewer from `Canvas`.
 */
function removeViewerReducer(state, action) {
    const { viewerId } = action;
    const removeIdx = state.viewerPositions.findIndex((elem) => elem.i === viewerId);
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
 * Update the `viewerPositions` in `canvas`.
 */
function updateLayoutReducer(state, action) {
    const { layout } = action;
    return state.set('viewerPositions', layout);
}
