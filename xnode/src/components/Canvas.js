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
import { getViewerPositions, getViewers } from "../state/canvas/outputs";
import { getVizTable } from "../state/viztable/outputs";
import type { VizId, VizSpec } from "../state/viztable/outputs";


/** Component to display when loading data */
const kLoadingSpinner = <span className='loading loading-spinner-small inline-block'/>;
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

        /** Viewer objects for rendering. See `viewersSelector` in `Canvas`. */
        viewers: PropTypes.array.isRequired,

        /** See `vizTable` in `viztable/reducers`. */
        vizTable: PropTypes.object.isRequired,

        /**
         * See `REPL.fetchSymbolData(symbolId)`.
         * @param symbolId
         * @param action
         */
        fetchSymbolData: PropTypes.func.isRequired,

        /**
         * Creates a new viewer for the specified symbol. See `state/canvas/actions`.
         * @param vizId
         * @param position
         */
        addViewer: PropTypes.func.isRequired,

        /**
         * Removes the viewer with the specified viewer ID.
         * @param viewerId
         */
        removeViewer: PropTypes.func.isRequired,

        /**
         * Moves the viewer at `startIdx` to the position at `endIdx`.
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
     * Returns a viewer for a symbol of the correct type. (See `SYMBOL-TABLE-SCHEMA.md`).
     *
     * @param {string} viewerId
     * @param {string} symbolId
     * @param {string} symbolObj
     */
    createSymbolViewer(viewerId, symbolId, symbolObj) {
        const { vizTable, addViewer, fetchSymbolData } = this.props;
        const { type, str, name, attributes, data } = symbolObj;

        const inspectSymbol = (symbolId, viewerId) => {
            fetchSymbolData(symbolId);
            addViewer(symbolId, viewerId);
        };

        switch(type) {
            case 'none':
            case 'bool':
            case 'number':
                return (<PrimitiveViewer str={str}/>);

            case 'string':
                return (<StringViewer data={data}/>);

            case 'list':
            case 'tuple':
            case 'set':
                return (<SequenceViewer data={data} symbolTable={vizTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'dict':
            case 'object':
            case 'module':
                return (<KeyValueViewer data={data} symbolTable={vizTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'tensor':
                return (<TensorViewer data={data}/>);

            case 'class':
                return (<ClassViewer data={data} symbolTable={vizTable}
                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'fn':
                return (<FunctionViewer data={data} symbolTable={vizTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'graphdata':
                // TODO: figure out a more principled way of showing the graphdata's properties along with the graph
                return (
                    <div>
                        <GraphDataViewer data={data} symbolTable={vizTable}
                                    expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
                        <GraphViewer symbolId={symbolId} data={data} symbolTable={vizTable}
                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
                    </div>);

            case 'graphop':
                return (<GraphOpViewer data={data} symbolTable={vizTable}
                                       expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            default:
                console.warn(`Canvas -- unrecognized data type received; got ${type}`);
                return null;

            // TODO: Add more viewers
        }
    }

    /**
     * Returns a viewer of the correct type. (See `ViewerType` in `state/canvas/constants`).
     *
     * @param {object} viewer
     */
    createViewer(viewer) {
        const { fetchSymbolData, addViewer, removeViewer } = this.props;
        const { viewerId } = viewer;

        const inspectSymbol = (symbolId, viewerId) => {
            fetchSymbolData(symbolId);
            addViewer(symbolId, viewerId);
        };
        
        const { symbolId, symbolObj } = viewer;
        const title = !symbolObj ? kLoadingMsg : (
            symbolObj.name !== null ? `[${symbolObj.type}]  ${symbolObj.name}` : `[${symbolObj.type}]`
        );
        const buttons = [
            // TODO: decide which icons to use
            // TODO: Duplicate should also replicate the existing state of a snapshot viewer
            { title: 'Duplicate', icon: <DuplicateIcon/>, onClick: () => inspectSymbol(symbolId, viewerId) },
            { title: 'Remove',    icon: <RemoveIcon/>,    onClick: () => removeViewer(viewerId) },
        ];
        const component = !symbolObj ? kLoadingSpinner :
            this.createSymbolViewer(viewerId, symbolId, symbolObj);

        return (
            <ViewerDisplayFrame title={title}
                                buttons={buttons}>
                {component}
            </ViewerDisplayFrame>
        );
    }

    onDragEnd(result: DropResult, provided: HookProvided) {
        const { reorderViewer } = this.props;
        if (!result.destination) return;
        reorderViewer(result.source.index, result.destination.index);
    }

    /**
     * Renders the inspector canvas and any viewers currently registered to it.
     */
    render() {
        const { classes, viewers } = this.props;
        const frames = viewers.map((viewer, idx) => {
            return (
                <Draggable key={viewer.viewerId} draggableId={viewer.viewerId} index={idx}>
                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                        <div ref={provided.innerRef}
                             className={classes.frameContainer}
                             {...provided.draggableProps}
                             {...provided.dragHandleProps}>
                            {this.createViewer(viewer)}
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
                        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
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

type Viewer = {
    viewerId: string,
    vizId: VizId,
    vizSpec: VizSpec,
}

const assembleViewers: ({}) => Array<Viewer> = createSelector(
    (state) => getViewerPositions(state.canvas),
    (state) => getViewers(state.canvas),
    (state) => getVizTable(state.viztable),
    (viewerIds: string[], viewerObjs, vizTable): Array<Viewer> => {
        return viewerIds.map((viewerId) => {
            const viewerObj = viewerObjs[viewerId];
            const { vizId } = viewerObj;
            const vizSpec = vizTable[vizId];
            return {
                viewerId,
                vizId,
                vizSpec,
            };

        });
    }
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers:   assembleViewers(state),
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
