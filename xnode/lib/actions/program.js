'use babel';


/** Action type definitions. */
export const SymbolTableActions = Object.freeze({
    ADD_SYMBOLS:   "SYMBOLTABLE::ADD_SYMBOLS",
    CLEAR_TABLE:   "SYMBOLTABLE::CLEAR_TABLE",
});

/**
 * Action creator to remove all entries from the symbol table.
 *
 * @returns {{type: string}}
 */
export function clearSymbolTableAction() {
    return {
        type: SymbolTableActions.CLEAR_TABLE,
    }
}

/**
 * Action creator to add a slice of symbol schemas to the symbol table.
 *
 * @param {{string: {}}} symbolTableSlice
 *      A mapping of symbol IDs to symbol schemas, which may or may not contain data objects.
 * @returns {{type: string, symbolTableSlice: {string: {}}, freezeUid: *}}
 */
export function addSymbolsAction(symbolTableSlice) {
    return {
        type: SymbolTableActions.ADD_SYMBOLS,
        symbolTableSlice,
    }
}
