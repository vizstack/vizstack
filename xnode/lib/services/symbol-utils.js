'use babel';

/**
 * To capture changing object state at multiple points in a program execution, we introduce the concept of "freezing".
 * When the Python program sends information about a watched symbol, it also sends an ID number unique to that watch
 * statement. Before the symbol information is put into the symbol table, it is "frozen", replacing all symbol IDs which
 * appear in the object with versions modified with the unique ID number. This "frozen" version of the symbol table
 * slice is then put into the symbol table, and a viewer is opened pointing to the frozen symbol. New viewers cannot be
 * opened by interacting with frozen viewers, as doing so would require information that may no longer exist (since the
 * program state might have changed). If a user wants to interact with a frozen symbol, it must first be "unfrozen",
 * sending the object's state at the program's termination to the symbol table and pointing the viewer to the unfrozen
 * symbol ID.
 * TODO: Remove freeze nomenclature
 * TODO: Factor out symbolId template.
 * TODO: Use Regex for testing type.
 */

/** This string prefix marks special strings that are interpreted as symbol IDs. */
export const ID_PREFIX = "@id:";


/**
 * Creates a frozen version of a symbol ID, which will not be altered by subsequent updates to the symbol table.
 *
 * The original symbol ID can be extracted from the frozen ID, but it is unique among all all symbol IDs and
 * frozen IDs.
 *
 * @param {string} symbolId
 *      The symbol ID to be frozen.
 * @param {int} uid
 *      A number unique to this particular snapshot of the symbol among all snapshots of the symbol.
 * @returns {string}
 *      The frozen symbol ID.
 */
export function freezeSymbolId(symbolId, uid) {
    return `${symbolId}!${uid}!`;
}

/**
 * Extracts the raw symbol ID from a frozen symbol ID.
 *
 * @param {string} frozenSymbolId
 *      The frozen version of the symbol ID, as produced by `freezeSymbolId()`.
 * @returns {string}
 *      The original symbol ID.
 */
export function unfreezeSymbolId(frozenSymbolId) {
    return frozenSymbolId.substring(0, frozenSymbolId.indexOf('!'));
}

/**
 * Determines if a value is a symbol ID string.
 *
 * @param {*} symbolId
 *      A potential symbol ID string.
 * @returns {boolean}
 *      Whether the supplied string symbol ID is a symbol ID.
 */
export function isSymbolId(symbolId) {
    return typeof(symbolId) === 'string' && symbolId.startsWith(ID_PREFIX);
}

/**
 * Determines if a symbol ID is frozen or not.
 *
 * @param {string} symbolId
 *      A symbol ID, potentially frozen by `freezeSymbolId()`.
 * @returns {boolean}
 *      Whether the supplied symbol ID is frozen.
 */
export function isSymbolIdFrozen(symbolId) {
    return typeof(symbolId) === 'string' && symbolId.endsWith('!');
}

/**
 *
 * @param symbolTableSlice
 * @param nonce
 * @returns {{}}
 */
export function freezeSymbolTableSlice(symbolTableSlice, nonce) {
    const frozenSymbolTableSlice = {};
    Object.entries(symbolTableSlice).forEach(([symbolId, symbolSchema]) => {
        if (symbolSchema.data !== null) {
            symbolSchema.data = freezeSymbolData(symbolSchema.data, nonce);
        }
        if (symbolSchema.attributes !== null) {
            symbolSchema.attributes = freezeSymbolData(symbolSchema.attributes, nonce);
        }
        frozenSymbolTableSlice[freezeSymbolId(symbolId, nonce)] = symbolSchema;
    });
    return frozenSymbolTableSlice;
}

/**
 * Freezes all symbol IDs in a symbol's data object, in-place.
 *
 * Operations are performed in-place to prevent wasteful duplication of large data structures, like tensors.
 *
 * @param {object} symbolData
 *      A symbol's data object.
 * @param {int} nonce
 *      A number unique to this particular snapshot of the program state among all snapshots of the program state.
 *      Generally, this means that `nonce` should be unique to the watch statement that produced this data object. Note
 *      that `nonce` must match the `nonce` supplied to `freezeSymbolShells()` for the same watch statement.
 * @returns {object}
 *      `symbolData` with all symbol IDs contained therein frozen.
 */
export function freezeSymbolData(symbolData, nonce) {
    _freezeSymbolDataRecurse(symbolData, nonce);
    return symbolData;
}

/**
 * Freezes any symbol IDs found in a supplied variable, and recurses to any objects or arrays contained therein.
 *
 * Operations are performed in-place.
 *
 * @param {object | array} item
 *      An object or array that may contain symbol IDs to be frozen.
 * @param {int} nonce
 *      The `nonce` to use in freezing the symbol IDs.
 */
function _freezeSymbolDataRecurse(item, nonce) {
    if (item === null) {
        return;
    }
    switch(typeof(item)) {
        case 'array':
            item.forEach((elem, i) => {
                if (isSymbolId(elem)) {
                    item[i] = freezeSymbolId(elem, nonce);
                } else {
                    _freezeSymbolDataRecurse(elem, nonce);
                }
            });
            break;
        case 'object':
            Object.entries(item).forEach(([key, value]) => {
                if (isSymbolId(key)) {
                    delete item[key];
                    item[freezeSymbolId(key, nonce)] = value;
                    key = freezeSymbolId(key, nonce);
                }
                if (isSymbolId(value)) {
                    item[key] = freezeSymbolId(value, nonce);
                } else {
                    _freezeSymbolDataRecurse(value, nonce);
                }
            });
            break;
        default: break;
    }
}
