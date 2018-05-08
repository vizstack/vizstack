'use babel';

import { combineReducers } from 'redux-seamless-immutable';
import programReducer      from './program.js';
import canvasReducer       from './canvas.js';

/** Highest-level reducer for store root. Simply dispatches to other reducers. */
export default combineReducers({
    program:        programReducer,
    canvas:         canvasReducer,
});
