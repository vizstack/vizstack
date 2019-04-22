// @flow
import Immutable from 'seamless-immutable';
import type { ViewId } from '../../core/schema';
import type { SnapshotId } from '../snapshot-table';

// =================================================================================================
// State slice.

/** Root reducer's state slice type. */
export type CanvasState = {
    // In-order sequences of Displays to show in the Canvas.
    layout: SnapshotInspector[],
};

/** Root reducer's initial state slice. */
const initialState: CanvasState = Immutable({
    layout: [],
});

// =================================================================================================
// Definitions (public).

/** A `SnapshotInspector` is an inspector in the Canvas of a `Snapshot`'s top-level or nested
 *  Views.  */
export type SnapshotInspector = {
    /** ID of the `Snapshot` tied to this inspector. */
    snapshotId: SnapshotId,

    /** The nested View within a `Snapshot`'s `View` to inspector. If not specified, it is assumed
     *  that the View to inspector is the root View. */
    viewId?: ViewId,
};

// =================================================================================================
// State accessors (public).

/**
 * @param state
 * @returns In-order array of Snapshots displayed in the Canvas.
 */
export function getCanvasLayout(state: CanvasState): SnapshotInspector[] {
    return state.layout;
}

// =================================================================================================
// Actions (public) and reducers.

type CanvasAction = ClearAllInspectors | AddInspector | RemoveInspector | ReorderInspector;

/**
 * Root reducer for state related to the Canvas area for rendering and exploring Snapshots.
 * @param state
 * @param action
 */
export default function rootReducer(
    state: CanvasState = initialState,
    action: CanvasAction = {},
): CanvasState {
    switch (action.type) {
        case 'ClearAllInspectors':
            return clearAllInspectorsReducer(state, action);
        case 'AddInspector':
            return addInspectorReducer(state, action);
        case 'RemoveInspector':
            return removeInspectorReducer(state, action);
        case 'ReorderInspector':
            return reorderInspectorReducer(state, action);
        default:
            return state; // No effect by default
    }
}

// -------------------------------------------------------------------------------------------------

type ClearAllInspectors = {| type: 'ClearAllInspectors' |};

/**
 * Remove all `SnapshotInspector`s from the Canvas.
 * @param value
 * @returns An action object.
 */
export function clearAllInspectorsAction(): ClearAllInspectors {
    return {
        type: 'ClearAllInspectors',
    };
}

function clearAllInspectorsReducer(state: CanvasState, action: ClearAllInspectors): CanvasState {
    return state.set('layout', []);
}

// -------------------------------------------------------------------------------------------------

type AddInspector = {| type: 'AddInspector', inspector: SnapshotInspector, insertAfterIdx: number |};

/**
 * Add a `SnapshotInspector` to the Canvas.
 * @param inspector
 * @param insertAfterIdx
 *     Index in layout after which to add the new viewer. (Optional, default: -1 adds to end).
 * @returns An action object.
 */
export function addInspectorAction(snapshotId: SnapshotId, viewId?: ViewId, insertAfterIdx?: number = -1): AddInspector {
    return {
        type: 'AddInspector',
        inspector: {
            snapshotId,
            viewId,
        },
        insertAfterIdx,
    };
}

function addInspectorReducer(state: CanvasState, action: AddInspector): CanvasState {
    const { inspector, insertAfterIdx } = action;
    return state.update('layout', (prev) =>
        Immutable([]).concat(
            insertAfterIdx == -1 ? prev : prev.slice(0, insertAfterIdx + 1),
            [inspector],
            insertAfterIdx == -1 ? [] : prev.slice(insertAfterIdx + 1),
        ),
    );
}

// -------------------------------------------------------------------------------------------------

type RemoveInspector = {| type: 'RemoveInspector', removeIdx: number |};

/**
 * Remove a `SnapshotInspector` from the Canvas.
 * @param inspector
 * @returns An action object.
 */
export function removeInspectorAction(removeIdx: number): RemoveInspector {
    return {
        type: 'RemoveInspector',
        removeIdx,
    };
}

function removeInspectorReducer(state: CanvasState, action: RemoveInspector): CanvasState {
    const { removeIdx } = action;
    return state.update('layout', (arr) =>
        arr.slice(0, removeIdx).concat(arr.slice(removeIdx + 1)),
    );
}

// -------------------------------------------------------------------------------------------------

type ReorderInspector = {| type: 'ReorderInspector', startIdx: number, endIdx: number |};

/**
 * Move a `SnapshotInspector` from the original `startIdx` to the updated `endIdx`.
 * @param startIdx
 * @param endIdx
 * @returns An action object.
 */
export function reorderInspectorAction(startIdx: number, endIdx: number): ReorderInspector {
    return {
        type: 'ReorderInspector',
        startIdx,
        endIdx,
    };
}

function reorderInspectorReducer(state: CanvasState, action: ReorderInspector): CanvasState {
    const { startIdx, endIdx } = action;
    return state.update('layout', (layout) => {
        const arr = layout.asMutable();
        const [removed] = arr.splice(startIdx, 1);
        arr.splice(endIdx, 0, removed);
        return arr;
    });
}
