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

// Viewer and frame
import Viewer from '../core/Viewer';
import ViewerDisplayFrame from './ViewerDisplayFrame';
import DuplicateIcon from '@material-ui/icons/FileCopyOutlined';
import RemoveIcon from '@material-ui/icons/DeleteOutlined';

// Custom Redux actions
import {
    showViewerInCanvasAction,
    hideViewerInCanvasAction,
    reorderViewerInCanvasAction,
} from '../state/canvas/actions';

// Miscellaneous utils
import { getCanvasLayout } from '../state/canvas/outputs';
import { getVizTable } from '../state/viztable/outputs';
import type { VizId, VizSpec } from '../state/viztable/outputs';
import { getMinimalDisambiguatedPaths } from '../services/path-utils';

/** Component to display when loading data */
const kLoadingSpinner = <span className='loading loading-spinner-tiny inline-block' />;
const kLoadingMsg = 'Loading ...';

/**
 * This smart component serves as an interactive workspace for inspecting variable viewers. It displays a collection
 * of `ViewerFrame` objects that can be moved with drag-and-drop.
 */
class Canvas extends React.Component<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** `ViewerModel` objects for rendering. See `assembleViewerModels()`. */
    viewerModels: Array<ViewerModel>,

    /**
     * See `views/repl/fetchVizModel(viewId)`.
     * @param viewId
     * @param modelType
     */
    fetchVizModel: (vizId: VizId, modelType: string) => void,

    onViewerMouseOver: (vizId: VizId, filePath: string, lineNumber: number) => void,
    onViewerMouseOut: (vizId: VizId, filePath: string, lineNumber: number) => void,

    /**
     * See `state/canvas/actions/showViewerInCanvasAction()`.
     * @param vizId
     * @param insertAfterIdx?
     */
    showViewer: (vizId: VizId, insertAfterIdx?: number) => void,

    /**
     * See `state/canvas/actions/hideViewerInCanvasAction()`.
     * @param vizId
     */
    hideViewer: (vizId: VizId) => void,

    /**
     * See `state/canvas/actions/reorderViewerInCanvasAction()`.
     * @param startIdx
     * @param endIdx
     */
    reorderViewer: (startIdx: number, endIdx: number) => void,
}> {
    /** Constructor. */
    constructor(props) {
        super(props);
        this.onDragEnd = this.onDragEnd.bind(this);
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
        const { reorderViewer } = this.props;
        if (!result.destination) return;
        reorderViewer(result.source.index, result.destination.index);
    }

    /**
     * Returns a viewer of the correct type. (See `ViewerType` in `state/canvas/constants`).
     * @param viewer
     * @param idx
     */
    createFramedViewerComponent(viewerModel: ViewerModel, idx: number) {
        const {
            showViewer,
            hideViewer,
            fetchVizModel,
            onViewerMouseOver,
            onViewerMouseOut,
        } = this.props;
        const { vizId, vizSpec } = viewerModel;

        const buttons = [
            // TODO: Duplicate should also replicate the existing state of a viewer
            { title: 'Duplicate', icon: <DuplicateIcon />, onClick: () => showViewer(vizId, idx) },
            { title: 'Remove', icon: <RemoveIcon />, onClick: () => hideViewer(vizId) },
        ];

        return (
            <ViewerDisplayFrame buttons={buttons}>
                {!vizSpec ? (
                    kLoadingSpinner
                ) : (
                    <Viewer
                        vizId={vizId}
                        fetchVizModel={fetchVizModel}
                        onViewerMouseOver={onViewerMouseOver}
                        onViewerMouseOut={onViewerMouseOut}
                    />
                )}
            </ViewerDisplayFrame>
        );
    }

    /**
     * Renders the inspector canvas and all viewers managed by it.
     */
    render() {
        const { classes, viewerModels } = this.props;

        // Only display minimal disambiguated paths, and collapse consecutive identical paths.
        const fullPaths = viewerModels.map(
            (viewerModel: ViewerModel) => viewerModel.vizSpec.filePath,
        );
        const fullToMinimal = getMinimalDisambiguatedPaths(fullPaths);
        let minimalPaths = [];
        for (let i = 0; i < fullPaths.length; i++) {
            minimalPaths[i] = fullPaths[i - 1] != fullPaths[i] ? fullToMinimal[fullPaths[i]] : null;
        }

        // Construct draggable viewers within frames.
        const framedViewers = viewerModels.map((viewerModel: ViewerModel, idx: number) => {
            return (
                <Draggable key={viewerModel.vizId} draggableId={viewerModel.vizId} index={idx}>
                    {(provided: DraggableProvided) => (
                        <div
                            ref={provided.innerRef}
                            className={classes.frameContainer}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                        >
                            <span>{minimalPaths[idx]}</span>
                            {this.createFramedViewerComponent(viewerModel, idx)}
                        </div>
                    )}
                </Draggable>
            );
        });

        console.debug(`Canvas -- rendering ${viewerModels.length} viewer models`, viewerModels);

        return (
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

type ViewerModel = {
    // Unique VizId of top-level Viz.
    vizId: VizId,

    // Specification of top-level Viz.
    vizSpec: VizSpec,
};

/**
 * Selector to assemble a Viewer object from the current Redux state.
 * TODO: check if this has issues with multiple canvases accessing the same selector
 * @param state
 */
const assembleViewerModels: ({}) => Array<ViewerModel> = createSelector(
    (state) => getCanvasLayout(state.canvas),
    (state) => getVizTable(state.viztable),
    (layout: Array<VizId>, vizTable: { [VizId]: VizSpec }): Array<ViewerModel> => {
        return layout.map((vizId) => {
            return {
                vizId,
                vizSpec: vizTable[vizId],
            };
        });
    },
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewerModels: assembleViewerModels(state),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators(
        {
            showViewer: showViewerInCanvasAction,
            hideViewer: hideViewerInCanvasAction,
            reorderViewer: reorderViewerInCanvasAction,
        },
        dispatch,
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(withStyles(styles)(Canvas));
