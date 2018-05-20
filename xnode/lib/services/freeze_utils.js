'use babel';

/**
 * TODO: explainer on frozen symbols
 */

/**
 * Creates a frozen version of a symbol ID, which will not be altered by subsequent updates to the symbol table.
 *
 * The original symbol ID can be extracted from the frozen ID, but it is unique among all all symbol IDs and
 * frozen IDs.
 *
 * @param {string} symbolId:
 *      The symbol ID to be frozen.
 * @param {int} nonce:
 *      A number unique to this particular snapshot of the symbol among all snapshots of the symbol.
 * @returns {string}:
 *      The frozen symbol ID.
 */
export function freezeSymbolId(symbolId, nonce) {
    return `${symbolId}!${nonce}!`;
}

/**
 * Extracts the raw symbol ID from a frozen symbol ID.
 *
 * @param {string} frozenSymbolId:
 *      The frozen version of the symbol ID, as produced by `freezeSymbolId()`.
 * @returns {string}:
 *      The original symbol ID.
 */
export function unfreezeSymbolId(frozenSymbolId) {
    return frozenSymbolId.substring(0, frozenSymbolId.indexOf('!'));
}

/**
 * Determines if a symbol ID is frozen or not.
 *
 * @param {string} symbolId;
 *      A symbol ID, potentially frozen by `freezeSymbolId()`.
 * @returns {boolean}:
 *      Whether the supplied symbol ID is frozen.
 */
export function isSymbolIdFrozen(symbolId) {
    return symbolId.endsWith('!');
}

/**
 * Creates a frozen version of a mapping of symbol IDs to symbol shells that will not be altered by subsequent updates
 * to the symbol table.
 *
 * All symbol IDs in the mapping and in the shells will be frozen.
 *
 * @param {object} symbolShells:
 *      A mapping of {symbolId: symbolShell}.
 * @param {int} nonce:
 *      A number unique to this particular snapshot of the program state among all snapshots of the program state.
 *      Generally, this means that `nonce` should be unique to the watch statement that produced these shells. Note
 *      that `nonce` must match the `nonce` supplied to `freezeSymbolData()` for the same watch statement.
 * @returns {object}:
 *      The frozen {symbolId: symbolShell} mapping.
 */
export function freezeSymbolShells(symbolShells, nonce) {
    const frozenSymbolShells = {};
    Object.entries(symbolShells).forEach(([symbolId, symbolShell]) => {
        frozenSymbolShells[freezeSymbolId(symbolId, nonce)] = symbolShell;
    });
    return frozenSymbolShells;
}

/**
 * Freezes all symbol IDs in a symbol's data object, in-place.
 *
 * Operations are performed in-place to prevent wasteful duplication of large data structures, like tensors.
 *
 * @param {object} symbolData:
 *      A symbol's data object.
 * @param {int} nonce:
 *      A number unique to this particular snapshot of the program state among all snapshots of the program state.
 *      Generally, this means that `nonce` should be unique to the watch statement that produced this data object. Note
 *      that `nonce` must match the `nonce` supplied to `freezeSymbolShells()` for the same watch statement.
 * @returns {object}:
 *      `symbolData` with all symbol IDs contained therein frozen.
 */
export function freezeSymbolData(symbolData, nonce) {
    freezeSymbolDataRecurse(symbolData, nonce);
    return symbolData;
}

/**
 * Determines if a given variable is a symbol ID string.
 *
 * Returns `true` for both frozen and unfrozen symbol IDs.
 *
 * @param {*} value:
 *      The variable to be checked.
 * @returns {boolean}:
 *      Whether `value` is a symbol ID string.
 */
function isSymbolId(value) {
    // TODO: un-hardcode @id
    return typeof(value) === 'string' && value.startsWith('@id:');
}

/**
 * Freezes any symbol IDs found in a supplied variable, and recurses to any objects or arrays contained therein.
 *
 * Operations are performed in-place.
 *
 * @param {object | array} item:
 *      An object or array that may contain symbol IDs to be frozen.
 * @param {int} nonce:
 *      The `nonce` to use in freezing the symbol IDs.
 */
function freezeSymbolDataRecurse(item, nonce) {
    switch(typeof(item)) {
        case 'array':
            item.forEach((elem, i) => {
                if (isSymbolId(elem)) {
                    item[i] = freezeSymbolId(elem, nonce);
                }
                else {
                    freezeSymbolDataRecurse(elem, nonce);
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
                }
                else {
                    freezeSymbolDataRecurse(value, nonce);
                }
            });
            break;
        default: break;
    }
}
