import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

// Grid layout
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type {
    DropResult,
    HookProvided,
    DroppableProvided,
    DraggableProvided,
} from 'react-beautiful-dnd';

// Xnode core
import Viewer from '../core';
import type { ViewId } from '../core';
import type { InteractionState } from '../core';
import { InteractionManager, InteractionContext } from '../core';

import ViewerDisplayFrame from './ViewerDisplayFrame';
import DuplicateIcon from '@material-ui/icons/FileCopyOutlined';
import RemoveIcon from '@material-ui/icons/DeleteOutlined';

// Custom Redux actions
import { addInspectorAction, removeInspectorAction, reorderInspectorAction } from '../state/canvas';

// Miscellaneous utils
import { getCanvasLayout } from '../state/canvas';
import type { SnapshotInspector } from '../state/canvas';
import { getSnapshots } from '../state/snapshot-table';
import type { SnapshotId, Snapshot } from '../state/snapshot-table';
import { getMinimalDisambiguatedPaths } from '../utils/path-utils';

/** Component to display when loading data */
const kLoadingSpinner = <span className='loading loading-spinner-tiny inline-block' />;

type Props = {
    /** CSS-in-JS styling object. */
    classes: {},

    /** `LayoutedSnapshot` objects for rendering. */
    layoutedSnapshots: LayoutedSnapshot[],

    onViewerMouseOver: (vizId: SnapshotId, filePath: string, lineNumber: number) => void,
    onViewerMouseOut: (vizId: SnapshotId, filePath: string, lineNumber: number) => void,

    /**
     * See `state/canvas`.
     * @param snapshotId
     * @param insertAfterIdx?
     */
    addInspector: (snapshotId: SnapshotId, insertAfterIdx?: number) => void,

    /**
     * See `state/canvas`.
     * @param snapshotId
     */
    removeInspector: (snapshotId: SnapshotId) => void,

    /**
     * See `state/canvas`.
     * @param startIdx
     * @param endIdx
     */
    reorderInspector: (startIdx: number, endIdx: number) => void,
};

type State = {};

/**
 * This smart component serves as an interactive workspace for inspecting `Snapshot`s. It
 * displays a collection of `SnapshotInspector` objects that can be moved with drag-and-drop.
 */
class Canvas extends React.Component<Props, State> {
    interactionManager: InteractionManager;

    /** Constructor. */
    constructor(props) {
        super(props);
        this.onDragEnd = this.onDragEnd.bind(this);

        let interactionManager = new InteractionManager();
        this.interactionManager = interactionManager;
    }

    // =================================================================================================================
    // Canvas rendering
    // =================================================================================================================

    /**
     * Function to call after a Draggable framed Viewer has been dropped in a target location.
     * @param result
     * @param provided
     */
    onDragEnd(result: DropResult, provided: HookProvided) {
        const { reorderInspector } = this.props;
        if (!result.destination) return;
        reorderInspector(result.source.index, result.destination.index);
    }

    /**
     * Returns a viewer of the correct type. (See `ViewerType` in `state/canvas/constants`).
     * @param viewer
     * @param idx
     */
    createFramedViewerComponent(ls: LayoutedSnapshot, idx: number) {
        const { addInspector, removeInspector } = this.props;
        const { snapshotId, viewId, snapshot } = ls;

        const buttons = [
            // TODO: Duplicate should also replicate the existing state of a viewer
            {
                title: 'Duplicate',
                icon: <DuplicateIcon />,
                onClick: () => addInspector(snapshotId, viewId, idx),
            },
            { title: 'Remove', icon: <RemoveIcon />, onClick: () => removeInspector(idx) },
        ];

        return (
            <ViewerDisplayFrame buttons={buttons}>
                {!snapshot ? kLoadingSpinner : <Viewer view={snapshot.view} viewId={viewId} />}
            </ViewerDisplayFrame>
        );
    }

    /**
     * Renders the inspector canvas and all viewers managed by it.
     */
    render() {
        const { classes, layoutedSnapshots } = this.props;

        // Only render minimal disambiguated paths, and collapse consecutive identical paths.
        const fullPaths = layoutedSnapshots.map((ls: LayoutedSnapshot) => ls.snapshot.filePath);
        const fullToMinimal = getMinimalDisambiguatedPaths(fullPaths);
        let minimalPaths = [];
        for (let i = 0; i < fullPaths.length; i++) {
            minimalPaths[i] = fullPaths[i - 1] != fullPaths[i] ? fullToMinimal[fullPaths[i]] : null;
        }

        // Construct draggable viewers within frames.
        const framedViewers = layoutedSnapshots.map((ls: LayoutedSnapshot, idx: number) => {
            return (
                <Draggable key={ls.snapshotId + ls.viewId} draggableId={ls.snapshotId} index={idx}>
                    {(provided: DraggableProvided) => (
                        <div
                            ref={provided.innerRef}
                            className={classes.frameContainer}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                        >
                            <span>{minimalPaths[idx]}</span>
                            {this.createFramedViewerComponent(ls, idx)}
                        </div>
                    )}
                </Draggable>
            );
        });

        console.debug(
            `Canvas -- rendering ${layoutedSnapshots.length} viewer models`,
            layoutedSnapshots,
        );

        return (
            <InteractionContext.Provider value={this.interactionManager.getContext()}>
                <div className={classNames(classes.canvasContainer)}>
                    <DragDropContext onDragEnd={this.onDragEnd}>
                        <Droppable droppableId='canvas'>
                            {(provided: DroppableProvided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}>
                                    {framedViewers}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </InteractionContext.Provider>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    canvasContainer: {
        height: '100%',
        overflow: 'auto',
        padding: theme.spacing.large,
    },
    frameContainer: {
        display: 'block',
        boxSizing: 'border-box',
    },
});

// To inject application state into component
// ------------------------------------------

export type LayoutedSnapshot = {
    snapshotId: SnapshotId,
    viewId?: ViewId,
    snapshot: Snapshot,
};

/** Connects application state objects to component props. */
function mapStateToProps() {
    return (state, props) => ({
        layoutedSnapshots: createSelector(
            (state) => getCanvasLayout(state.canvas),
            (state) => getSnapshots(state.snapshots),
            (
                layout: SnapshotInspector[],
                snapshots: { [SnapshotId]: Snapshot },
            ): LayoutedSnapshot[] => {
                return layout.map((inspector: SnapshotInspector) => {
                    return {
                        snapshotId: inspector.snapshotId,
                        viewId: inspector.viewId,
                        snapshot: snapshots[inspector.snapshotId],
                    };
                });
            },
        )(state, props), // TODO: Should not recompute every time snapshots change.
    });
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators(
        {
            addInspector: addInspectorAction,
            removeInspector: removeInspectorAction,
            reorderInspector: reorderInspectorAction,
        },
        dispatch,
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(withStyles(styles)(Canvas));
