import { combineReducers } from 'redux-seamless-immutable';
import displaytableReducer from './displaytable';
import canvasReducer from './canvas';

/** Highest-level reducer for store root. Simply dispatches to other reducers. */
export default combineReducers({
    viztable: displaytableReducer,
    canvas: canvasReducer,
});
