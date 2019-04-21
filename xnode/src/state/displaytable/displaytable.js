// @flow
import Immutable from 'seamless-immutable';
import type { ViewSpec } from '../../core/schema';

// =================================================================================================
// State slice.

/** Root reducer's state slice type. */
export type DisplayTableState = {
    displaySpecs: { [DisplayId]: DisplaySpec },
};

/** Root reducer's initial state slice. */
const initialState: DisplayTableState = Immutable({
    displaySpecs: {},
});

// =================================================================================================
// Definitions (public).

/** Specification of a viz from a snapshot in time. */
export type DisplaySpec = {
    /** Absolute path of the file in which this viz was viewed. */
    filePath: string,

    /** Line number of view statement within file at `filePath`. */
    lineNumber: number,

    /** Normalized specification of all models in a view. */
    viewSpec: ViewSpec,
};

/** Identifier unique to a Display. */
export type DisplayId = string;

// =================================================================================================
// State accessors (public).

/**
 * @param state
 * @returns Table mapping `DisplayId` to `DisplaySpec`.
 */
export function getDisplaySpecs(state: DisplayTableState): { [DisplayId]: DisplaySpec } {
    return state.displaySpecs;
}

/**
 * @param state
 * @param displayId
 * @returns `DisplaySpec` corresponding to the specified `DisplayId`, or undefined if not found.
 */
export function getDisplaySpec(
    state: DisplayTableState,
    displayId: DisplayId,
): DisplaySpec | typeof undefined {
    return state.displaySpecs[displayId];
}

// =================================================================================================
// Actions (public) and reducers.

type DisplayTableAction = ClearTable | AddEntry;

/**
 * Root reducer for state related to ____.
 * @param state
 * @param action
 */
export default function rootReducer(
    state: DisplayTableState = initialState,
    action: DisplayTableAction = {},
) {
    switch (action.type) {
        case 'clear_table':
            return clearDisplayTableReducer(state, action);
        case 'add_entry':
            return addDisplayTableEntryReducer(state, action);
        default:
            return state; // No effect by default
    }
}

// -------------------------------------------------------------------------------------------------

type ClearTable = {| type: 'clear_table' |};

/**
 * Remove all entries from the Display Table.
 * @returns An action object.
 */
export function clearDisplayTableAction(): ClearTable {
    return {
        type: 'clear_table',
    };
}

function clearDisplayTableReducer(state: DisplayTableState, action: ClearTable): DisplayTableState {
    return state.set('displaySpecs', {});
}

// -------------------------------------------------------------------------------------------------

type AddEntry = {| type: 'add_entry', displayId: DisplayId, displaySpec: DisplaySpec |};

/**
 * Add a Display to the Display Table.
 * @param displayId
 * @param displaySpec
 * @returns An action object.
 */
export function addDisplayTableEntryAction(
    displayId: DisplayId,
    displaySpec: DisplaySpec,
): AddEntry {
    return {
        type: 'add_entry',
        displayId,
        displaySpec,
    };
}

function addDisplayTableEntryReducer(state: DisplayTableState, action: AddEntry) {
    const { displayId, displaySpec } = action;
    return state.set(
        'displaySpecs',
        Immutable.merge(state.displaySpecs, { [displayId]: displaySpec }),
    );
}
