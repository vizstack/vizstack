import { combineReducers } from 'redux-seamless-immutable';
import { viztableReducer } from './viztable';
import { canvasReducer } from './canvas';

/** Highest-level reducer for store root. Simply dispatches to other reducers. */
export default combineReducers({
    viztable: viztableReducer,
    canvas: canvasReducer,
});
