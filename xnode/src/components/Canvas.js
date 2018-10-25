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
import DeleteIcon from '@material-ui/icons/DeleteOutlined';
import CloseIcon from '@material-ui/icons/Close';
import LiveViewerIcon from '@material-ui/icons/PageView';
import PrintViewerIcon from '@material-ui/icons/Print';

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
import { addSnapshotViewerAction, addPrintViewerAction,
    removeViewerAction, reorderViewerAction } from '../state/canvas/actions';

// Miscellaneous utils
import { getViewerPositions, getViewerObjects, kViewerType} from "../state/canvas/outputs";
import { getSymbolTable} from "../state/program/outputs";
import type {SymbolId, SymbolObject} from "../state/program/outputs";


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

        /** See `symbolTable` in `program/reducers`. */
        symbolTable: PropTypes.object.isRequired,

        /**
         * See `REPL.fetchSymbolData(symbolId)`.
         * @param {string} symbolId
         * @param {?object} action
         */
        fetchSymbolData: PropTypes.func.isRequired,

        /**
         * Creates a new snapshot viewer for the specified symbol. See `state/canvas/actions`.
         * @param {string} symbolId
         * @param {int} position
         */
        addSnapshotViewer: PropTypes.func.isRequired,

        /**
         * Creates a new print viewer for the specified text. See `state/canvas/actions`.
         * @param {string} text
         * @param {int} position
         */
        addPrintViewer: PropTypes.func.isRequired,

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
        const { symbolTable, addSnapshotViewer, fetchSymbolData } = this.props;
        const { type, str, name, attributes, data } = symbolObj;

        const inspectSymbol = (symbolId, viewerId) => {
            fetchSymbolData(symbolId);
            addSnapshotViewer(symbolId, viewerId);
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
                return (<SequenceViewer data={data} symbolTable={symbolTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'dict':
            case 'object':
            case 'module':
                return (<KeyValueViewer data={data} symbolTable={symbolTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'tensor':
                return (<TensorViewer data={data}/>);

            case 'class':
                return (<ClassViewer data={data} symbolTable={symbolTable}
                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'fn':
                return (<FunctionViewer data={data} symbolTable={symbolTable}
                                        expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            case 'graphdata':
                // TODO: figure out a more principled way of showing the graphdata's properties along with the graph
                return (
                    <div>
                        <GraphDataViewer data={data} symbolTable={symbolTable}
                                    expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
                        <GraphViewer symbolId={symbolId} data={data} symbolTable={symbolTable}
                                     expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>
                    </div>);

            case 'graphop':
                return (<GraphOpViewer data={data} symbolTable={symbolTable}
                                       expandSubviewer={(symbolId) => inspectSymbol(symbolId, viewerId)}/>);

            default:
                console.warn(`Canvas -- unrecognized data type received; got ${type}`);
                return null;

            // TODO: Add more viewers
        }
    }

    /**
     * Returns a viewer of the correct type. (See `kViewerType` in `state/canvas/constants`).
     *
     * @param {object} viewer
     */
    createViewer(viewer) {
        const { fetchSymbolData, addSnapshotViewer, removeViewer } = this.props;
        const { viewerId, viewerType } = viewer;

        const inspectSymbol = (symbolId, viewerId) => {
            fetchSymbolData(symbolId);
            addSnapshotViewer(symbolId, viewerId);
        };

        switch(viewerType) {
            case kViewerType.SNAPSHOT: {
                const { symbolId, symbolObj } = viewer;
                const title = !symbolObj ? kLoadingMsg : (
                    symbolObj.name !== null ? `[${symbolObj.type}]  ${symbolObj.name}` : `[${symbolObj.type}]`
                );
                const buttons = [
                    // TODO: decide which icons to use
                    // TODO: Duplicate should also replicate the existing state of a snapshot viewer
                    { title: 'Duplicate', icon: <DuplicateIcon/>, onClick: () => inspectSymbol(symbolId, viewerId) },
                    { title: 'Close',     icon: <CloseIcon/>,     onClick: () => removeViewer(viewerId) },
                ];
                const component = !symbolObj ? kLoadingSpinner :
                    this.createSymbolViewer(viewerId, symbolId, symbolObj);
                return (
                    <ViewerDisplayFrame icon={<LiveViewerIcon/>}
                                        title={title}
                                        buttons={buttons}>
                        {component}
                    </ViewerDisplayFrame>
                );
            }

            case kViewerType.PRINT: {
                const { text } = viewer;
                const buttons = [
                    { title: 'Close', icon: <CloseIcon/>, onClick: () => removeViewer(viewerId) },
                ];
                return (
                    <ViewerDisplayFrame icon={<PrintViewerIcon/>}
                                        title={`output`}
                                        buttons={buttons}>
                        <pre>{text}</pre>
                    </ViewerDisplayFrame>
                );
            }


            default:
                console.warn(`Unrecognized viewer type received; got ${viewerType}`);
                return null;
        }
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

type SnapshotViewer = {
    viewerType: kViewerType.SNAPSHOT,
    viewerId: string,
    symbolId: SymbolId,
    symbolObj: SymbolObject,
}

type PrintViewer = {
    viewerType: kViewerType.PRINT,
    viewerId: string,
    text: string,
}

type Viewer = SnapshotViewer | PrintViewer;

const getViewers: ({}) => Array<Viewer> = createSelector(
    (state) => getViewerPositions(state.canvas),
    (state) => getViewerObjects(state.canvas),
    (state) => getSymbolTable(state.program),
    (viewerIds: string[], viewerObjs, symbolTable): Array<Viewer> => {
        return viewerIds.map((viewerId) => {
            const viewerObj = viewerObjs[viewerId];
            const viewerType = viewerObj.type;

            switch(viewerType) {
                case kViewerType.SNAPSHOT:
                    const { symbolId } = viewerObj;
                    const symbolObj = symbolTable[symbolId];
                    return {
                        viewerId,
                        viewerType,
                        symbolId,
                        symbolObj,
                    };

                case kViewerType.PRINT:
                    const { text } = viewerObj;
                    return {
                        viewerId,
                        viewerType,
                        text,
                    };
            }

        });
    }
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers:        getViewers(state),
        symbolTable:    getSymbolTable(state.program),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        addSnapshotViewer:    addSnapshotViewerAction,
        addPrintViewer:       addPrintViewerAction,
        removeViewer:         removeViewerAction,
        reorderViewer:        reorderViewerAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Canvas)
);
