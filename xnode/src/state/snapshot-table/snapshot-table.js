// @flow
import Immutable from 'seamless-immutable';
import type { View } from '../../core/schema';

// =================================================================================================
// State slice.

/** Root reducer's state slice type. */
export type SnapshotTableState = {
    snapshots: { [SnapshotId]: Snapshot },
};

/** Root reducer's initial state slice. */
const initialState: SnapshotTableState = Immutable({
    snapshots: {},
});

// =================================================================================================
// Definitions (public).

/** Representation of a program symbol at a particular point in time. */
export type Snapshot = {
    /** Absolute path of the file in which the snapshot was taken. */
    filePath: string,

    /** Line number of `show()` statement within file at `filePath`. */
    lineNumber: number,

    /** `View` corresponding to the snapshot symbol. */
    view: View,
};

/** Identifier unique to a `Snapshot`. */
export type SnapshotId = string;

// =================================================================================================
// State accessors (public).

/**
 * @param state
 * @returns Table mapping `SnapshotId` to `Snapshot`.
 */
export function getSnapshots(state: SnapshotTableState): { [SnapshotId]: Snapshot } {
    return state.snapshots;
}

/**
 * @param state
 * @param snapshotId
 * @returns `Snapshot` corresponding to the specified `SnapshotId`, or undefined if not found.
 */
export function getSnapshot(
    state: SnapshotTableState,
    snapshotId: SnapshotId,
): Snapshot | typeof undefined {
    return state.snapshots[snapshotId];
}

// =================================================================================================
// Actions (public) and reducers.

type SnapshotTable = ClearAllSnapshots | AddEntry;

/**
 * Root reducer for state related to all Snapshots of program symbols sent from the debugger
 * backend.
 * @param state
 * @param action
 */
export default function rootReducer(
    state: SnapshotTableState = initialState,
    action: SnapshotTable = {},
) {
    switch (action.type) {
        case 'ClearAllSnapshots':
            return clearAllSnapshotsReducer(state, action);
        case 'AddEntry':
            return addSnapshotReducer(state, action);
        default:
            return state; // No effect by default
    }
}

// -------------------------------------------------------------------------------------------------

type ClearAllSnapshots = {| type: 'ClearAllSnapshots' |};

/**
 * Remove all entries from the Snapshot table.
 * @returns An action object.
 */
export function clearAllSnapshotsAction(): ClearAllSnapshots {
    return {
        type: 'ClearAllSnapshots',
    };
}

function clearAllSnapshotsReducer(
    state: SnapshotTableState,
    action: ClearAllSnapshots,
): SnapshotTableState {
    return state.set('snapshots', {});
}

// -------------------------------------------------------------------------------------------------

type AddEntry = {| type: 'AddEntry', snapshotId: SnapshotId, snapshot: Snapshot |};

/**
 * Add a Snapshot to the Snapshot Table.
 * @param snapshotId
 * @param snapshot
 * @returns An action object.
 */
export function addSnapshotAction(snapshotId: SnapshotId, snapshot: Snapshot): AddEntry {
    return {
        type: 'AddEntry',
        snapshotId,
        snapshot,
    };
}

function addSnapshotReducer(state: SnapshotTableState, action: AddEntry) {
    const { snapshotId, snapshot } = action;
    return state.set('snapshots', Immutable.merge(state.snapshots, { [snapshotId]: snapshot }));
}
