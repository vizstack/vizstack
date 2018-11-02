import { combineReducers } from 'redux-seamless-immutable';
import { programReducer }  from './program';
import { canvasReducer }   from './canvas';

/** Highest-level reducer for store root. Simply dispatches to other reducers. */
export default combineReducers({
    program:    programReducer,
    canvas:     canvasReducer,
});
