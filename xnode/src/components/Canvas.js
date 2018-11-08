import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

// Grid layout
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult, HookProvided,
    DroppableProvided, DroppableStateSnapshot,
    DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import { SizeMe } from 'react-sizeme'

// Common viewer frame
import ViewerDisplayFrame from './viewers/ViewerDisplayFrame';
import Viewer from './Viewer';
import DuplicateIcon from '@material-ui/icons/FileCopyOutlined';
import RemoveIcon from '@material-ui/icons/DeleteOutlined';

// Custom data type viewers
import PrimitiveViewer from './viewers/PrimitiveViewer';
import StringViewer from './viewers/StringViewer';
import FunctionViewer from './viewers/FunctionViewer';
import ClassViewer from './viewers/ClassViewer';
import TensorViewer from './viewers/TensorViewer';
import SequenceViewer from './viewers/SequenceViewer';
import KeyValueViewer from './viewers/KeyValueViewer';
import GraphViewer, { GraphDataViewer, GraphOpViewer } from './viewers/GraphViewer';

// Custom Redux actions
import { addViewerAction, removeViewerAction, reorderViewerAction } from '../state/canvas/actions';

// Miscellaneous utils
import { getViewerPositions, getViewerTable, ExpansionState } from "../state/canvas/outputs";
import { getVizTable } from "../state/viztable/outputs";
import type { VizId, VizSpec } from "../state/viztable/outputs";
import type {ViewerId, ViewerSpec} from "../state/canvas/outputs";


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
         * Creates a new viewer for the viz with the specified VizId. See `state/canvas/actions`.
         * @param vizId
         * @param position
         */
        addViewer: PropTypes.func.isRequired,

        /**
         * Removes the viewer with the specified ViewerId. See `state/canvas/actions`.
         * @param viewerId
         */
        removeViewer: PropTypes.func.isRequired,

        /**
         * Moves the viewer positioned at `startIdx` to `endIdx` instead. See `state/canvas/actions`.
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

    // /**
    //  * Returns a viewer for a symbol of the correct type. (See `SYMBOL-TABLE-SCHEMA.md`).
    //  *
    //  * @param {string} viewerId
    //  * @param {string} symbolId
    //  * @param {string} symbolObj
    //  */
    // createSymbolViewer(viewerId, symbolId, symbolObj) {
    //     const { vizTable, addViewer, fetchVizModel } = this.props;
    //     const { type, str, name, attributes, data } = symbolObj;
    //
    //     const inspectSymbol = (symbolId, viewerId) => {
    //         fetchVizModel(symbolId);
    //         addViewer(symbolId, viewerId);
    //     };
    //
    //     switch(type) {
    //         case 'none':
    //         case 'bool':
    //         case 'number':
    //             return (<PrimitiveViewer str={str}/>);
    //
    //         case 'string':
    //             return (<StringViewer data={data}/>);
    //
    //         case 'list':
    //         case 'tuple':
    //         case 'set':
    //             return (<SequenceViewer data={data} symbolTable={vizTable}
    //                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);
    //
    //         case 'dict':
    //         case 'object':
    //         case 'module':
    //             return (<KeyValueViewer data={data} symbolTable={vizTable}
    //                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);
    //
    //         case 'tensor':
    //             return (<TensorViewer data={data}/>);
    //
    //         case 'class':
    //             return (<ClassViewer data={data} symbolTable={vizTable}
    //                                  expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);
    //
    //         case 'fn':
    //             return (<FunctionViewer data={data} symbolTable={vizTable}
    //                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);
    //
    //         case 'graphdata':
    //             // TODO: figure out a more principled way of showing the graphdata's properties along with the graph
    //             return (
    //                 <div>
    //                     <GraphDataViewer data={data} symbolTable={vizTable}
    //                                 expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
    //                     <GraphViewer symbolId={symbolId} data={data} symbolTable={vizTable}
    //                                  expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
    //                 </div>);
    //
    //         case 'graphop':
    //             return (<GraphOpViewer data={data} symbolTable={vizTable}
    //                                    expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);
    //
    //         default:
    //             console.warn(`Canvas -- unrecognized data type received; got ${type}`);
    //             return null;
    //
    //         // TODO: Add more viewers
    //     }
    // }

    /**
     * Returns a viewer of the correct type. (See `ViewerType` in `state/canvas/constants`).
     * @param viewer
     */
    createFramedViewerComponent(viewer: ViewerModel) {
        const { fetchVizModel, vizTable, addViewer, removeViewer } = this.props;
        const { viewerId } = viewer;

        const openViewer = (vizId, insertAfterViewerId = -1) => {
            fetchVizModel(vizId);
            // TODO: figure out what type to show here, don't add to canvas
            addViewer(vizId, 'full', null, insertAfterViewerId);
        };

        const { vizId, vizSpec } = viewer;
        const title = !vizSpec ? kLoadingMsg : `${vizSpec.filePath}:${vizSpec.lineNumber}`;
        const buttons = [
            // TODO: Duplicate should also replicate the existing state of a snapshot viewer
            { title: 'Duplicate', icon: <DuplicateIcon/>, onClick: () => openViewer(vizId, viewerId) },
            { title: 'Remove',    icon: <RemoveIcon/>,    onClick: () => removeViewer(viewerId) },
        ];
        const component = !vizSpec ? kLoadingSpinner : (
            <Viewer viewerId={viewerId} />
        );

        return (
            <ViewerDisplayFrame title={title}
                                buttons={buttons}>
                {component}
            </ViewerDisplayFrame>
        );
    }

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
     * Renders the inspector canvas and all viewers managed by it.
     */
    render() {
        const { classes, viewers } = this.props;
        const frames = viewers.map((viewer: ViewerModel, idx: number) => {
            return (
                <Draggable key={viewer.viewerId} draggableId={viewer.viewerId} index={idx}>
                    {(provided: DraggableProvided) => (
                        <div ref={provided.innerRef}
                             className={classes.frameContainer}
                             {...provided.draggableProps}
                             {...provided.dragHandleProps}>
                            {this.createFramedViewerComponent(viewer)}
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

type ViewerModel = {

    // Unique ViewerId that identifies this viewer.
    viewerId: ViewerId,

    // Unique VizId of top-level viz.
    vizId: VizId,

    // Specification of
    vizSpec: VizSpec,

    expansionState: ExpansionState,
}

// TODO: check if this has issues with multiple canvases accessing the same selector
/**
 * Selector to assemble a Viewer object from the current Redux state.
 * @param state
 */
const getCanvasViewers: ({}) => Array<ViewerModel> = createSelector(
    (state) => getViewerPositions(state.canvas),
    (state) => getViewerTable(state.canvas),
    (state) => getVizTable(state.viztable),
    (viewerPositions: Array<ViewerId>,
     viewerTable : {[ViewerId]: ViewerSpec},
     vizTable: {[VizId]: VizSpec}): Array<ViewerModel> => {
        return viewerPositions.map((viewerId) => {
            const { vizId, expansionState } = viewerTable[viewerId];
            const vizSpec = vizTable[vizId];
            return {
                viewerId,
                vizId,
                vizSpec,
                expansionState,
            };

        });
    }
);

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

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers:   getCanvasViewers(state),
        vizTable:  getVizTable(state.viztable),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        addViewer:      addViewerAction,
        removeViewer:   removeViewerAction,
        reorderViewer:  reorderViewerAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Canvas)
);
