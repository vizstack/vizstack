'use babel';

import { REF } from '../services/mockdata.js';

import { setInViewerPayloadAction } from './canvas.js';

/** Action type definitions. */
export const SymbolTableActions = {
    ADD_SYMBOLS:   "SYMBOLTABLE::ADD_SYMBOLS",
    ADD_SHELLS:    "SYMBOLTABLE::ADD_SHELLS",
    ADD_DATA:      "SYMBOLTABLE::ADD_DATA",
    CLEAR_TABLE:   "SYMBOLTABLE::CLEAR_TABLE",
};

/**
 *
 * @returns {{type: string}}
 */
export function clearSymbolTableAction() {
    return {
        type: SymbolTableActions.CLEAR_TABLE,
    }
}

export function addSymbolsAction(symbolShells, freezeNonce) {
    return {
        type: SymbolTableActions.ADD_SYMBOLS,
        symbolShells,
        freezeNonce,
    }
}

export function addSymbolActionThunk(symbolId, symbolShells, symbolData, freezeNonce) {
    return (dispatch) => {
        dispatch(addSymbolShellsAction(symbolShells, freezeNonce));
        dispatch(addSymbolDataAction(symbolId, symbolData, freezeNonce));
    };
}
function addSymbolShellsAction(symbolShells, freezeNonce) {
    return {
        type: SymbolTableActions.ADD_SHELLS,
        symbolShells,
        freezeNonce,
    };
}
function addSymbolDataAction(symbolId, symbolData, freezeNonce) {
    return {
        type: SymbolTableActions.ADD_DATA,
        symbolId,
        symbolData,
        freezeNonce,
    };
}

/**
 * =================================================================================================================
 */

/**
 * Loads the data for `symbolId` if needed, then calls itself for each parent of the symbol, thereby building the graph.
 * This function can be dispatched and chained with `.then()` statements, which will only execute when the graph has
 * loaded completely.
 * TODO: Re-factor to make general purpose
 */
function ensureGraphLoadedRecurseActionThunk(symbolId, confirmed) {
    return (dispatch, getState) => {
        return dispatch(ensureSymbolDataLoadedActionThunk(symbolId)).then(
            () => {
                confirmed.add(symbolId);
                let type = getState().program.symbolTable[symbolId].type;
                let viewerData = getState().program.symbolTable[symbolId].data.viewer;
                let dispatches = [];
                if (type === 'graphdata' && viewerData.creatorop !== null) {
                    confirmed.add(viewerData.creatorop);
                    dispatches.push(ensureGraphLoadedRecurseActionThunk(viewerData.creatorop, confirmed));
                }
                else if (type === 'graphop') {
                    // TODO clean this up
                    let argArrs = viewerData.args.concat(viewerData.kwargs);
                    argArrs.forEach(argArr => {
                       if (argArr.length === 1) {
                           return;
                       }
                       if (Array.isArray(argArr[1])) {
                           argArr[1].forEach(arg => {
                               if(!confirmed.has(arg)) {
                                   confirmed.add(arg);
                                   dispatches.push(ensureGraphLoadedRecurseActionThunk(arg, confirmed));
                               }
                           });
                       }
                       else {
                           if(!confirmed.has(argArr[1])) {
                               confirmed.add(argArr[1]);
                               dispatches.push(ensureGraphLoadedRecurseActionThunk(argArr[1], confirmed));
                           }
                       }
                    });
                }
                if (viewerData.container && !confirmed.has(viewerData.container)) {
                    confirmed.add(viewerData.container);
                    dispatches.push(ensureGraphLoadedRecurseActionThunk(viewerData.container, confirmed));
                }
                return Promise.all(dispatches.map(fn => dispatch(fn)));
            }
        )
    }
}

/**
 * Checks if a graph starting at `symbolId` has been loaded, and loads it if it has not. Then, it sets the
 * `hasLoadedGraph` property of the viewer containing the graph to `true`.
 */
export function ensureGraphLoadedActionThunk(symbolId, viewerId) {
    return (dispatch) => {
        let confirmed = new Set();
        return dispatch(ensureGraphLoadedRecurseActionThunk(symbolId, confirmed)).then(
            () => {
                let graphState = {};
                confirmed.forEach(symbolId => graphState[symbolId] = {expanded: false});  // TODO move this fn elsewhere
                dispatch(setInViewerPayloadAction(viewerId, ['stateChanged'], true));
                dispatch(setInViewerPayloadAction(viewerId, ['graphLoaded'], true));
                dispatch(setInViewerPayloadAction(viewerId, ['graphState'], graphState));
            },
        )
    }
}

