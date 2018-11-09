import Immutable from 'seamless-immutable';
import { VizTableActions } from './actions';
import type { VizId, VizSpec } from './outputs';

/** Root reducer's state slice shape. */
export type VizTableState = {

    // Map of symbol IDs to symbol objects.
    vizTable: {
        [VizId]: VizSpec,
    }
}

/** Root reducer's initial state slice. */
const initialState = Immutable({
    vizTable: {},
});

/**
 * Root reducer for state related to the paused program's state and symbols that have been loaded.
 * @param state
 * @param action
 */
export function viztableReducer(state = initialState, action = {}) {
    const { type } = action;
    switch(type) {
        case VizTableActions.CLEAR_TABLE:  return clearVizTable(state, action);
        case VizTableActions.ADD_SLICE:    return addVizTableSlice(state, action);
    }
    return state;  // No effect by default
};

/**
 * Removes all entries from the VizTable.
 * @param state
 * @param action
 */
function clearVizTable(state, action) {
    return state.set('vizTable', {});
}

/**
 * Adds a new VizTable slice to the VizTable, replacing existing VizSpecs with new ones if necessary.
 * @param state
 * @param action
 */
function addVizTableSlice(state, action) {
    const { vizTableSlice } = action;
    return state.set('vizTable', Immutable.merge(state.vizTable, vizTableSlice));
}
