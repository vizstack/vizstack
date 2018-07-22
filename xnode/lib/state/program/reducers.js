'use babel';

import Immutable from 'seamless-immutable';
import { SymbolTableActions } from './actions';

/**
 * State slice structure for `program`: {
 *     symbolTable: {
 *         "@id:12345" : {
 *             type: "number",
 *             str:  "86",
 *             name: "myInt",
 *             attributes: { ... }
 *             data: null | { ... }
 *         }
 *     }
 * }
 */

/** Root reducer's initial state slice. */
const initialState = Immutable({
    symbolTable: {},
});

/**
 * Root reducer for state related to the paused program's state and symbols that have been loaded.
 */
export default function rootReducer(state = initialState, action) {
    const { type } = action;
    switch(type) {
        case SymbolTableActions.ADD_SYMBOLS:   return addSymbolTableSlice(state, action);
        case SymbolTableActions.CLEAR_TABLE:   return clearSymbolTableReducer(state, action);
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
        if (symbolSchema.data || !(symbolId in state)) {
            state = Immutable.setIn(state, ['symbolTable', symbolId], symbolSchema);
        }
    });
    return state;
}
