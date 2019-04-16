// @flow

import Immutable from 'seamless-immutable';
import { DisplayTableActions } from './actions';
import type { DisplayId, DisplaySpec } from './outputs';

/** Root reducer's state slice shape. */
export type DisplayTableState = {
    displaySpecs: {[DisplayId]: DisplaySpec},
};

/** Root reducer's initial state slice. */
const initialState: DisplayTableState = Immutable({
    displaySpecs: {},
});

/**
 * Root reducer for state related to the paused program's state and symbols that have been loaded.
 * @param state
 * @param action
 */
export function displaytableReducer(state: DisplayTableState = initialState, action: {type?: string} = {}) {
    const { type } = action;
    switch (type) {
        case DisplayTableActions.CLEAR_TABLE:
            return clearDisplayTable(state, action);
        case DisplayTableActions.ADD_SPEC:
            return addDisplaySpec(state, action);
    }
    return state; // No effect by default
}

/**
 * Removes all entries from the VizTable.
 * @param state
 * @param action
 */
function clearDisplayTable(state, action) {
    return state.set('displaySpecs', {});
}

/**
 * Adds a new VizTable slice to the VizTable, replacing existing VizSpecs with new ones if necessary.
 * @param state
 * @param action
 */
function addDisplaySpec(state, action) {
    const { displayId, displaySpec } = action;
    return state.set('displaySpecs', Immutable.merge(state.displaySpecs, {[displayId]: displaySpec}));
}
