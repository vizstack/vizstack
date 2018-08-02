'use babel';

/**
 * A symbol can change values during program execution. (Note that this is different from changing a variable name to
 * point to a different symbol.) To capture a symbol's value at a given point in time, the symbol can be turned into a
 * "snapshot symbol" by associating it with a "snapshot UID". All symbols referenced within its representation are
 * also turned into "snapshot symbols". This allows the snapshot symbol to be stored in a symbol table without
 * clashing with other versions of itself.
 *
 * Any symbol that is still within scope at the end of the program is an eligible "live symbol". These symbols have much
 * more information available for inspection, since digging deeper simply means request more information on-demand
 * from the program execution engine. In contrast, "snapshot symbols" only have 1 level of inspection by default, since
 * it is unknown which ones the user will want to inspect and sending all possible information is highly inefficient.
 */

/**
 * A live symbol ID takes the form:
 *     "@id:<symbolUid>"
 * where <symbolUid> is an int that uniquely identifies the symbol.
 */
const kLiveSymbolIdRegex = /^@id:(\d+)$/;
const kLiveSymbolIdTemplate = (symbolUid) => `@id:${symbolUid}`;

/**
 * A snapshot symbol ID:
 *     "@id:<symbolUid>!<snapshotUid>!"
 * where <symbolUid> is an int that uniquely identifies the symbol,
 *       <snapshotUid> is an int that uniquely identifies a snapshot (version of the symbol during execution).
 */
const kSnapshotSymbolIdRegex = /^@id:(\d+)!(\d+)!$/;
const kSnapshotSymbolIdTemplate = (symbolUid, snapshotUid) => `@id:${symbolUid}!${snapshotUid}!`;

/**
 * Determines if the input (of unconstrained type) is a live symbol ID.
 * @param {*} x
 * @returns {boolean}
 */
export function isLiveSymbolId(x) {
    return typeof(x) === 'string' && kLiveSymbolIdRegex.test(x);
}

/**
 * Determines if the input (of unconstrained type) is a snapshot symbol ID.
 * @param {*} x
 * @returns {boolean}
 */
export function isSnapshotSymbolId(x) {
    return typeof(x) === 'string' && kSnapshotSymbolIdRegex.test(x);
}

/**
 * Determines if input (of unconstrained type) is any type of symbol ID.
 * @param {*} x
 * @returns {boolean}
 */
export function isAnySymbolId(x) {
    return isSnapshotSymbolId(x) || isLiveSymbolId(x);
}

/**
 * Creates a live symbol ID from the specified parameters.
 * @param {int} symbolUid
 * @returns {string}
 */
export function makeLiveSymbolId(symbolUid) {
    return kLiveSymbolIdTemplate(symbolUid);
}

/**
 * Creates a snapshot symbol ID from the specified parameters.
 * @param {int} symbolUid
 * @param {int} snapshotUid
 * @returns {string}
 */
export function makeSnapshotSymbolId(symbolUid, snapshotUid) {
    return kSnapshotSymbolIdTemplate(symbolUid, snapshotUid);
}

/**
 * Returns the parameters used to make the live symbol ID.
 * @param {string} liveSymbolId
 * @returns {{symbolUid: int}}
 */
export function parseLiveSymbolId(liveSymbolId) {
    if(!isLiveSymbolId(liveSymbolId)) throw TypeError(`Invalid liveSymbolId; got ${liveSymbolId}`);
    const [ , symbolUid ] = kLiveSymbolIdRegex.exec(liveSymbolId);

    return { symbolUid: parseInt(symbolUid) };
}

/**
 * Returns the parameters used to make the snapshot symbol ID.
 * @param {string} liveSymbolId
 * @returns {{symbolUid: int, snapshotUid: int}}
 */
export function parseSnapshotSymbolId(snapshotSymbolId) {
    if(!isSnapshotSymbolId(snapshotSymbolId)) throw TypeError(`Invalid snapshotSymbolId; got ${snapshotSymbolId}`);
    const [ , symbolUid, snapshotUid ] = kSnapshotSymbolIdRegex.exec(snapshotSymbolId);
    return { symbolUid: parseInt(symbolUid), snapshotUid: parseInt(snapshotUid) };
}

/**
 * Converts a live symbol ID into a snapshot ID for the same symbol, using the specified snapshot UID.
 * @param {string} liveSymbolId
 * @param {int} snapshotUid
 * @returns {string}
 */
export function liveToSnapshotSymbolId(liveSymbolId, snapshotUid) {
    if(!isLiveSymbolId(liveSymbolId)) throw TypeError(`Invalid liveSymbolId; got ${liveSymbolId}`);
    const { symbolUid } = parseLiveSymbolId(liveSymbolId);
    return makeSnapshotSymbolId(symbolUid, snapshotUid);
}

/**
 * Converts a snapshot symbol ID into a live symbol ID for the same symbol.
 * @param {string} snapshotSymbolId
 * @returns {string}
 */
export function snapshotToLiveSymbolId(snapshotSymbolId) {
    if(!isSnapshotSymbolId(snapshotSymbolId)) throw TypeError(`Invalid snapshotSymbolId; got ${snapshotSymbolId}`);
    const { symbolUid  } = parseSnapshotSymbolId(snapshotSymbolId);
    return makeLiveSymbolId(symbolUid);
}

/**
 * Converts all symbols within a symbol table slice to snapshot symbols.
 * @param {{[liveSymbolId]: {...symbolObj...}}} symbolTableSlice
 * @param snapshotUid
 * @returns {{[snapshotSymbolId]: {...symbolObj...}}}
 */
export function snapshotSymbolTableSlice(symbolTableSlice, snapshotUid) {
    const frozenSymbolTableSlice = {};
    Object.entries(symbolTableSlice).forEach(([liveSymbolId, symbolSchema]) => {
        if (symbolSchema.data !== null) {
            symbolSchema.data = snapshotSymbolData(symbolSchema.data, snapshotUid);
        }
        if (symbolSchema.attributes !== null) {
            symbolSchema.attributes = snapshotSymbolData(symbolSchema.attributes, snapshotUid);
        }
        frozenSymbolTableSlice[liveToSnapshotSymbolId(liveSymbolId, snapshotUid)] = symbolSchema;
    });
    return frozenSymbolTableSlice;
}

/**
 * Converts all live symbol IDs to snapshot symbol IDs, in-place within an object.
 *
 * Operations are performed in-place to prevent wasteful duplication of large data structures, like tensors.
 *
 * @param {object} symbolData
 *      A symbol's data object.
 * @param {int} snapshotUid
 *      A number unique to this particular snapshot of the program state among all snapshots of the program state.
 *      Generally, this means that `snapshotUid` should be unique to the watch statement that produced this data object.
 * @returns {object}
 *      `symbolData` with all symbol IDs contained therein frozen.
 */
export function snapshotSymbolData(symbolData, snapshotUid) {
    _snapshotSymbolDataRecurse(symbolData, snapshotUid);
    return symbolData;
}

/**
 * Freezes any symbol IDs found in a supplied variable, and recurses to any objects or arrays contained therein.
 *
 * Operations are performed in-place.
 *
 * @param {object | array} item
 *      An object or array that may contain symbol IDs to be frozen.
 * @param {int} snapshotUid
 */
function _snapshotSymbolDataRecurse(item, snapshotUid) {
    if (item === null) {
        return;
    }
    switch(typeof(item)) {
        case 'array':
            item.forEach((elem, i) => {
                if (isLiveSymbolId(elem)) {
                    item[i] = liveToSnapshotSymbolId(elem, snapshotUid);
                } else {
                    _snapshotSymbolDataRecurse(elem, snapshotUid);
                }
            });
            break;
        case 'object':
            Object.entries(item).forEach(([key, value]) => {
                if (isLiveSymbolId(key)) {
                    delete item[key];
                    item[liveToSnapshotSymbolId(key, snapshotUid)] = value;
                    key = liveToSnapshotSymbolId(key, snapshotUid);
                }
                if (isLiveSymbolId(value)) {
                    item[key] = liveToSnapshotSymbolId(value, snapshotUid);
                } else {
                    _snapshotSymbolDataRecurse(value, snapshotUid);
                }
            });
            break;
        default: break;
    }
}
