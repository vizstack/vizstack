import { ProgramState } from './reducers';

/** Type declaration for symbol ID. */
export type SymbolId = string;

/** Type declaration for symbol type. */
export type SymbolType = (
    'none' | 'bool' | 'number' | 'string' | 'list' | 'tuple' | 'set' |
    'dict' | 'class' | 'module' | 'object' | 'fn' | 'tensor' |
    'graphop' | 'graphcontainer' | 'graphdata'
);

/** Type declaration for symbol object. */
export type SymbolObject = {

    // Type of symbol.
    type: SymbolType,

    // String representation of symbol.
    str: string,

    // Variable name of symbol.
    name?: string,

    // Python object attributes.
    attributes?: {
        string: mixed,
    },

    // Visualization-specific data.
    data?: {
        string: mixed,
    }
};

/**
 * Get the entire symbol table.
 * @param state
 * @returns Table mapping symbol IDs to symbol objects.
 */
export function getSymbolTable(state: ProgramState): { [SymbolId]: SymbolObject } {
    return state.symbolTable;
}

/**
 * Get the symbol object corresponding to the specified symbol ID.
 * @param state
 * @param symbolId
 * @returns Specified symbol object, or undefined if not found.
 */
export function getSymbolObject(state: ProgramState, symbolId: SymbolId): SymbolObject | undefined {
    return state.symbolTable[symbolId];
}