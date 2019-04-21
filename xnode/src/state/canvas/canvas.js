// @flow
import Immutable from 'seamless-immutable';
import type { ViewId } from '../../core/schema';
import type { DisplayId } from '../displaytable';

// =================================================================================================
// State slice.

/** Root reducer's state slice type. */
export type CanvasState = {
    // In-order sequences of Displays to show in the Canvas.
    layout: Display[],
};

/** Root reducer's initial state slice. */
const initialState: CanvasState = Immutable({
    layout: [],
});

// =================================================================================================
// Definitions (public).

/** A `Display` is a view of a symbol at a particular time in the program, sent over by the
 *  backend debugger.  */
export type Display = {
    displayId: DisplayId,
    viewId?: ViewId,
};

// =================================================================================================
// State accessors (public).

/**
 * @param state
 * @returns In-order array of Displays backing the Canvas.
 */
export function getCanvasLayout(state: CanvasState): Display[] {
    return state.layout;
}

// =================================================================================================
// Actions (public) and reducers.

type CanvasAction = ClearAll | AddDisplay | RemoveDisplay | ReorderDisplay;

/**
 * Root reducer for state related to the Canvas area for rendering Displays corresponding to
 * program symbols.
 * @param state
 * @param action
 */
export default function rootReducer(
    state: CanvasState = initialState,
    action: CanvasAction = {},
): CanvasState {
    switch (action.type) {
        case 'clear_all':
            return clearAllReducer(state, action);
        case 'add_display':
            return addDisplayReducer(state, action);
        case 'remove_display':
            return removeDisplayReducer(state, action);
        case 'reorder_display':
            return reorderDisplayReducer(state, action);
        default:
            return state; // No effect by default
    }
}

// -------------------------------------------------------------------------------------------------

type ClearAll = {| type: 'clear_all' |};

/**
 * Remove all Displays from the Canvas.
 * @param value
 * @returns An action object.
 */
export function clearAllAction(): ClearAll {
    return {
        type: 'clear_all',
    };
}

function clearAllReducer(state: CanvasState, action: ClearAll): CanvasState {
    return state.set('layout', []);
}

// -------------------------------------------------------------------------------------------------

type AddDisplay = {| type: 'add_display', display: Display, insertAfterIdx: number |};

/**
 * Add a Display to the Canvas.
 * @param display
 * @param insertAfterIdx
 *     Index in layout after which to add the new viewer. (Optional, default: -1 adds to end).
 * @returns An action object.
 */
export function addDisplayAction(display: Display, insertAfterIdx?: number = -1): AddDisplay {
    return {
        type: 'add_display',
        display,
        insertAfterIdx,
    };
}

function addDisplayReducer(state: CanvasState, action: AddDisplay): CanvasState {
    const { display, insertAfterIdx } = action;
    return state.update('layout', (prev) =>
        Immutable([]).concat(
            insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
            [display],
            insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
        ),
    );
}

// -------------------------------------------------------------------------------------------------

type RemoveDisplay = {| type: 'remove_display', display: Display |};

/**
 * Remove a Display from the Canvas.
 * @param display
 * @returns An action object.
 */
export function removeDisplayAction(display: Display): RemoveDisplay {
    return {
        type: 'remove_display',
        display,
    };
}

function removeDisplayReducer(state: CanvasState, action: RemoveDisplay): CanvasState {
    const { display } = action;
    const removeIdx = state.layout.findIndex(
        ({ displayId, viewId }) => displayId === display.displayId && viewId === display.viewId,
    );
    if (removeIdx === -1) {
        console.error(
            'Could not hide viewer; no viewer with `displayId` ',
            display.displayId,
            ' and `viewId` ',
            display.viewId,
        );
        return state;
    }
    return state.update('layout', (arr) =>
        arr.slice(0, removeIdx).concat(arr.slice(removeIdx + 1)),
    );
}

// -------------------------------------------------------------------------------------------------

type ReorderDisplay = {| type: 'reorder_display', startIdx: number, endIdx: number |};

/**
 * Move a Display from the original `startIdx` to the updated `endIdx`.
 * @param startIdx
 * @param endIdx
 * @returns An action object.
 */
export function reorderDisplayAction(startIdx: number, endIdx: number): ReorderDisplay {
    return {
        type: 'reorder_display',
        startIdx,
        endIdx,
    };
}

function reorderDisplayReducer(state: CanvasState, action: ReorderDisplay): CanvasState {
    const { startIdx, endIdx } = action;
    return state.update('layout', (viewerPositions) => {
        const arr = viewerPositions.asMutable();
        const [removed] = arr.splice(startIdx, 1);
        arr.splice(endIdx, 0, removed);
        return arr;
    });
}
