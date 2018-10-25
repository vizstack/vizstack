import Immutable from 'seamless-immutable';
import { kSymbolTableActions } from './actions';
import type { SymbolId, SymbolObject } from './outputs';

/** Root reducer's state slice shape. */
export type ProgramState = {
    // Map of symbol IDs to symbol objects.
    symbolTable: {
        [SymbolId]: SymbolObject,
    }
}

/** Root reducer's initial state slice. */
const initialState = Immutable({
    symbolTable: {},
});

/**
 * Root reducer for state related to the paused program's state and symbols that have been loaded.
 */
export function programReducer(state = initialState, action = {}) {
    const { type } = action;
    switch(type) {
        case kSymbolTableActions.ADD_SYMBOLS:   return addSymbolTableSlice(state, action);
        case kSymbolTableActions.CLEAR_TABLE:   return clearSymbolTableReducer(state, action);
    }
    return state;  // No effect by default
};

/**
 * Removes all entries from the symbol table.
 */
function clearSymbolTableReducer(state, action) {
    return state.setIn(['symbolTable'], {});
}

/**
 * Adds a new slice (mapping of symbol IDs to their schema objects) to the symbol table.
 */
function addSymbolTableSlice(state, action) {
    const { symbolTableSlice } = action;
    Object.entries(symbolTableSlice).forEach(([symbolId, symbolSchema]) => {
        if (symbolSchema.data !== null || !(symbolId in state.symbolTable)) {
            state = Immutable.setIn(state, ['symbolTable', symbolId], symbolSchema);
        }
    });
    return state;
}
