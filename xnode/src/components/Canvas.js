import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

// Grid layout
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult, HookProvided, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';

// Viewer and frame
import Viewer from './Viewer';
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
import { getCanvasLayout } from "../state/canvas/outputs";
import { getVizTable } from "../state/viztable/outputs";
import type { VizId, VizSpec } from "../state/viztable/outputs";


/** Component to display when loading data */
const kLoadingSpinner = <span className='loading loading-spinner-tiny inline-block'/>;
const kLoadingMsg = "Loading ...";

/**
 * This smart component serves as an interactive workspace for inspecting variable viewers. It displays a collection
 * of `ViewerFrame` objects that can be moved with drag-and-drop.
 */
class Canvas extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object (from `withStyles`). */
        classes: PropTypes.object.isRequired,

        /** `Viewer` objects for rendering. See `assembleViewers()`. */
        viewers: PropTypes.array.isRequired,

        /** See `vizTable` in `viztable/reducers`. */
        vizTable: PropTypes.object.isRequired,

        /**
         * See `views/repl/fetchVizModel(vizId)`.
         * @param vizId
         * @param modelType
         */
        fetchVizModel: PropTypes.func.isRequired,

        /**
         * See `state/canvas/actions/showViewerInCanvasAction`.
         * @param vizId
         * @param insertAfterIdx?
         */
        showViewer: PropTypes.func.isRequired,

        /**
         * See `state/canvas/actions/hideViewerInCanvasAction`.
         * @param vizId
         */
        hideViewer: PropTypes.func.isRequired,

        /**
         * See `state/canvas/actions/reorderViewerInCanvasAction`.
         * @param startIdx
         * @param endIdx
         */
        reorderViewer: PropTypes.func.isRequired,
    };

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
    createFramedViewerComponent(viewer: ViewerModel, idx: number) {
        const { showViewer, hideViewer } = this.props;
        const { vizId, vizSpec } = viewer;
        const title = !vizSpec ? kLoadingMsg : `${vizSpec.filePath}:${vizSpec.lineNumber}`;
        const buttons = [
            // TODO: Duplicate should also replicate the existing state of a viewer
            { title: 'Duplicate', icon: <DuplicateIcon/>, onClick: () => showViewer(vizId, idx) },
            { title: 'Remove',    icon: <RemoveIcon/>,    onClick: () => hideViewer(vizId) },
        ];

        return (
            <ViewerDisplayFrame title={title}
                                buttons={buttons}>
                {!vizSpec ? kLoadingSpinner : (
                    <Viewer vizId={vizId} />
                )}
            </ViewerDisplayFrame>
        );
    }

    /**
     * Renders the inspector canvas and all viewers managed by it.
     */
    render() {
        const { classes, viewers } = this.props;
        const frames = viewers.map((viewer: ViewerModel, idx: number) => {
            return (
                <Draggable key={viewer.vizId} draggableId={viewer.vizId} index={idx}>
                    {(provided: DraggableProvided) => (
                        <div ref={provided.innerRef}
                             className={classes.frameContainer}
                             {...provided.draggableProps}
                             {...provided.dragHandleProps}>
                            {this.createFramedViewerComponent(viewer, idx)}
                        </div>
                    )}
                </Draggable>
            )
        });

        console.debug(`Canvas -- rendering ${frames.length} viewer frame(s)`, viewers);

        return (
            <div className={classNames(classes.canvasContainer)}>
                <DragDropContext onDragEnd={this.onDragEnd}>
                    <Droppable droppableId="canvas">
                        {(provided: DroppableProvided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}>
                                {frames}
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
const styles = theme => ({
    canvasContainer: {
        height: '100%',
        overflow: 'auto',
        padding: theme.spacing.unit * 2,
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
}

/**
 * Selector to assemble a Viewer object from the current Redux state.
 * TODO: check if this has issues with multiple canvases accessing the same selector
 * @param state
 */
const getCanvasViewers: ({}) => Array<ViewerModel> = createSelector(
    (state) => getCanvasLayout(state.canvas),
    (state) => getVizTable(state.viztable),
    (layout: Array<VizId>, vizTable: {[VizId]: VizSpec}): Array<ViewerModel> => {
        return layout.map((vizId) => {
            return {
                vizId,
                vizSpec: vizTable[vizId],
            };
        });
    }
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers:   getCanvasViewers(state),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        showViewer:     showViewerInCanvasAction,
        hideViewer:     hideViewerInCanvasAction,
        reorderViewer:  reorderViewerInCanvasAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Canvas)
);
