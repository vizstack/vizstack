import { combineReducers } from 'redux-seamless-immutable';
import snapshotTableReducer from './snapshot-table';
import canvasReducer from './canvas';

/** Highest-level reducer for store root. Simply dispatches to other reducers. */
export default combineReducers({
    snapshots: snapshotTableReducer,
    canvas: canvasReducer,
});
