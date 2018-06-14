'use babel';

import Immutable from 'seamless-immutable';
import { SymbolTableActions } from '../actions/program';
import { freezeSymbolShells, freezeSymbolId, freezeSymbolData, freezeSymbolSomethings } from '../services/symbol-utils';

/**
 * State slice structure for `program`: {
 *     symbolTable: {
 *         "@id:12345" : {
 *             type: "number",
 *             name: "myInt",
 *             str:  "86",
 *             data: null | {viewer:{}, attributes:{}}
 *         }
 *     }
 *     stackFrame: [{
 *         fileName: "c:\\...",
 *         lineNo: 37,
 *         functionName: "myFn"
 *         args: "(arg1, arg2)",
 *         returningTo: "myFn2" | null,
 *         line: "return 10",
 *     }, ...] | null,
 *     programState: "waiting" | "running" | "disconnected",
 * }
 */

/** Root reducer's initial state slice. */
const initialState = Immutable({
    symbolTable: {},
    context: null,
    programState: 'disconnected',
});

/**
 * Root reducer for state related to the paused program's state and symbols that have been loaded.
 */
export default function rootReducer(state = initialState, action) {
    const { type } = action;
    switch(type) {
        case SymbolTableActions.ADD_SYMBOLS:   return addSymbolsReducer(state, action);
        case SymbolTableActions.ADD_SHELLS:    return addSymbolShellsReducer(state, action);
        case SymbolTableActions.ADD_DATA:      return addSymbolDataReducer(state, action);
        case SymbolTableActions.CLEAR_TABLE:   return clearSymbolTableReducer(state, action);
    }
    return state;  // No effect by default
};

function clearSymbolTableReducer(state, action) {
    return state.setIn(['symbolTable'], {});
}

function addSymbolsReducer(state, action) {
    const { symbolShells, freezeNonce } = action;
    // if (freezeNonce >= 0) {
    //     return Immutable.merge({symbolTable: freezeSymbolSomethings(symbolShells, freezeNonce)}, state, {deep: true});
    // }
    // else {
        Object.entries(symbolShells).forEach(([symbolId, shell]) => {
            if (shell.data || !(symbolId in state)) {
                state = Immutable.setIn(state, ['symbolTable', symbolId], shell);
            }
        });
        return state;
    // }
}

function addSymbolShellsReducer(state, action) {
    const { symbolShells, freezeNonce } = action;
    if (freezeNonce >= 0) {
        return Immutable.merge({symbolTable: freezeSymbolShells(symbolShells, freezeNonce)}, state, {deep: true});
    }
    else {
        return Immutable.merge({symbolTable: symbolShells}, state, {deep: true});
    }
}

function addSymbolDataReducer(state, action) {
    const { symbolId, symbolData, freezeNonce } = action;
    if (freezeNonce >= 0) {
        return state.setIn(['symbolTable', freezeSymbolId(symbolId, freezeNonce), 'data'],  freezeSymbolData(symbolData, freezeNonce));
    }
    return state.setIn(['symbolTable', symbolId, 'data'], symbolData);
}

// /**
//  * Given the newly-acquired data for a particular symbol and an object containing the shells referenced by it, add the
//  * new shells and fill in the symbol's data field.
//  */
// function ensureSymbolDataLoadedReducer(state, action) {
//     const { symbolId, data, shells } = action;
//     // It's important that `shells` be the first argument, so existing symbols are not overwritten
//     return Immutable.merge({symbolTable: shells}, state, {deep: true}).setIn(['symbolTable', symbolId, 'data'], data);
// }
//
// /**
//  * Given a new namespace dict, reset the entire symbol table to only contain that namespace.
//  * TODO be smarter with updating; don't wipe data that you don't need to.
//  */
// function updateNamespaceReducer(state, action) {
//     const { programState, stackFrame, namespace } = action;
//     return Immutable({
//         symbolTable: namespace,
//         stackFrame,
//         programState,
//     });
// }
