
/** Action type definitions. */
export const kSymbolTableActions = Object.freeze({
    ADD_SYMBOLS:   'symboltable::ADD_SYMBOLS',
    CLEAR_TABLE:   'symboltable::CLEAR_TABLE',
});

/**
 * Action creator to remove all entries from the symbol table.
 *
 * @returns {{type: string}}
 */
export function clearSymbolTableAction() {
    return {
        type: kSymbolTableActions.CLEAR_TABLE,
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
        type: kSymbolTableActions.ADD_SYMBOLS,
        symbolTableSlice,
    }
}
