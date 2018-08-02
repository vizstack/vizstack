'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

// Grid layout
import GridLayout from 'react-grid-layout';
import { SizeMe } from 'react-sizeme'

// Common viewer frame
import ViewerDisplayFrame from './viewers/ViewerDisplayFrame';
import InspectIcon from '@material-ui/icons/Search';
import DeleteIcon from '@material-ui/icons/DeleteOutlined';
import DuplicateIcon from '@material-ui/icons/FileCopyOutlined';
import CloseIcon from '@material-ui/icons/Close';
import LiveViewerIcon from '@material-ui/icons/PageView';
import SnapshotViewerIcon from '@material-ui/icons/CameraAlt';
import PrintViewerIcon from '@material-ui/icons/Print';

// Custom data type viewers
import PrimitiveViewer from './viewers/PrimitiveViewer';
import StringViewer from './viewers/StringViewer';
// import TensorViewer from './viewers/TensorViewer';
// import GraphViewer, { assembleGraphModel }  from './viewers/GraphViewer';
import SequenceViewer from './viewers/SequenceViewer';

// Custom Redux actions
import { addSnapshotViewerAction, addLiveViewerAction, addPrintViewerAction,
    removeViewerAction, updateLayoutAction } from '../state/canvas/actions';
import { ViewerTypes } from "../state/canvas/constants";
import { isSnapshotSymbolId } from '../services/symbol-utils';


/**
 * This smart component serves as an interactive workspace for inspecting variable viewers. It displays a collection
 * of `ViewerFrame` objects using React Grid Layout.
 * TODO: Refactor viewer remove based on viewerId not symbolId, because of clone.
 */
class Canvas extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object (from `withStyles`). */
        classes: PropTypes.object.isRequired,

        /**
         * See `REPL.fetchSymbolData(symbolId)`.
         */
        fetchSymbolData: PropTypes.func.isRequired,

        /**
         * Creates a new snapshot/live viewer for the specified symbol. See `actions/canvas`.
         *
         * @param {string} symbolId
         * @param {int} position
         */
        addSnapshotViewer: PropTypes.func.isRequired,
        addLiveViewer: PropTypes.func.isRequired,

        /**
         * Creates a new print viewer for the specified text. See `actions/canvas`.
         *
         * @param {string} text
         * @param {int} position
         */
        addPrintViewer: PropTypes.func.isRequired,

        /**
         * Removes the viewer with the specified symbol from the Canvas.
         *
         * @param symbolId
         */
        removeViewer: PropTypes.func.isRequired,

        /**
         * Updates the react-grid-layout model for the Canvas.
         *
         * @param layout
         */
        updateLayout: PropTypes.func.isRequired,

        /** See `viewersSelector` in `Canvas`. */
        viewers: PropTypes.array.isRequired,

        /** See `viewerPositions` in `reducers/canvas`. */
        layout:  PropTypes.array.isRequired,

        /** See `symbolTable` in `reducers/program`. */
        symbolTable: PropTypes.object.isRequired,

    };

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
        const { symbolTable, addLiveViewer } = this.props;
        const { type, str, name, attributes, data} = symbolObj;
        switch(type) {
            case 'none':
            case 'bool':
            case 'number':
                return <PrimitiveViewer str={str}/>;

            case 'string':
                return <StringViewer data={data}/>;

            case 'list':
            case 'tuple':
            case 'set':
                return (<SequenceViewer data={data} symbolTable={symbolTable}
                                        expandSubviewer={(symbolId) => addLiveViewer(symbolId, viewerId)}/>);

            case 'tensor':
                // TODO: return <TensorViewer/>;
                return null;

            case 'graphdata':
                // TODO: return <GraphViewer symbolId={symbolId} symbolTable={symbolTable}/>;
                return null;

            default:
                console.warn(`Canvas -- unrecognized data type received; got ${type}`)
                return null;

            // TODO: Add more viewers
        }
    }

    /**
     * Returns a viewer of the correct type. (See `ViewerTypes` in `state/canvas/constants`).
     *
     * @param {object} viewer
     */
    createViewer(viewer) {
        const { addLiveViewer, removeViewer } = this.props;
        const { viewerId, viewerType } = viewer;

        switch(viewerType) {
            case ViewerTypes.SNAPSHOT: {
                const { symbolId, symbolObj } = viewer;
                const inspectLiveSymbol = () => {
                    // TODO: Implement
                };
                const buttons = [
                    { title: 'Inspect', icon: <InspectIcon/>, onClick: () => addLiveViewer(symbolId, viewerId) },
                    // TODO: Delete should also remove corresponding watch statement
                    { title: 'Delete',  icon: <DeleteIcon/>,  onClick: () => removeViewer(viewerId) },
                ];
                return (
                    <ViewerDisplayFrame icon={<SnapshotViewerIcon/>}
                                        title={`[${symbolObj.type}]  ${symbolObj.name}`}
                                        buttons={buttons}>
                        {this.createSymbolViewer(viewerId, symbolId, symbolObj)}
                    </ViewerDisplayFrame>
                );
            }
            case ViewerTypes.LIVE: {
                const { symbolId, symbolObj } = viewer;
                const buttons = [
                    // TODO: Duplicate should also replicate the existing state of a live viewer
                    { title: 'Duplicate', icon: <DuplicateIcon/>, onClick: () => addLiveViewer(symbolId, viewerId) },
                    { title: 'Close',     icon: <CloseIcon/>,     onClick: () => removeViewer(viewerId) },
                ];
                return (
                    <ViewerDisplayFrame icon={<LiveViewerIcon/>}
                                        title={`[${symbolObj.type}]  ${symbolObj.name}`}
                                        buttons={buttons}>
                        {this.createSymbolViewer(viewerId, symbolId, symbolObj)}
                    </ViewerDisplayFrame>
                );
            }

            case ViewerTypes.PRINT: {
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
                console.warn(`Unrecognized viewer type recieved; got ${viewerType}`);
                return null;
        }

        // TODO: De-hardcode this
        // TODO: What about progress spinner?
        // if (!model) {
        //     return (
        //         <div className={classes.container}>
        //             <div className={classes.progress}>
        //                 <span className='loading loading-spinner-small inline-block' />
        //             </div>
        //         </div>
        //     );
        // }
    }

    /**
     * Renders the inspector canvas and any viewers currently registered to it.
     */
    render() {
        const { classes, viewers, layout, updateLayout} = this.props;
        const frames = viewers.map((viewer) => {
            return (
                <div key={viewer.viewerId} className={classes.frameContainer}>
                    {this.createViewer(viewer)}
                </div>
            )
        });

        console.debug(`Canvas -- rendering ${frames.length} viewer frame(s)`, viewers);

        // Lightweight grid layout component that adjusts width according to `size`
        const FlexibleGridLayout = ({ size }) => {
            return (
                <GridLayout width={size.width} cols={1} rowHeight={25} autosize={true} containerPadding={[0, 0]}
                            layout={layout} onLayoutChange={updateLayout} draggableCancel='.ReactGridLayoutNoDrag'>
                    {frames}
                </GridLayout>
            );
        };

        return (
            <div className={classNames(classes.canvasContainer)}>
                <SizeMe>{FlexibleGridLayout}</SizeMe>
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

/**
 * Creates derived data structure for `viewers`: [
 *     {
 *         viewerId: "0",
 *         viewerType: ViewerTypes.SNAPSHOT/LIVE
 *         symbolId: "@id:12345",
 *         symbolObj: {
 *             type: "number",
 *             str:  "86",
 *             name: "myInt",
 *             attributes: {...}
 *             data: {...}
 *         }
 *     },
 *     {
 *         viewerId: "1",
 *         viewerType: ViewerTypes.PRINT
 *         text: "The quick brown fox ...",
 *     }
 * ]
 */
// TODO: This selector doesn't seem to be very effective because it's still rerendering each elem in the Canvas
// whenever the symbol table changes.
// TODO: Refactor this according to ducks format (selector file)
const viewersSelector = createSelector(
    [(state) => state.canvas.viewerObjects, (state) => state.canvas.viewerPositions, (state) => state.program.symbolTable],
    (viewerObjects, viewerPositions, symbolTable) => {
        return viewerPositions.map((viewerPosition) => {
            const viewerId = viewerPosition.i;
            const viewerObj = viewerObjects[viewerId];
            const viewerType = viewerObj.type;

            switch(viewerType) {
                case ViewerTypes.LIVE:
                case ViewerTypes.SNAPSHOT:
                    const { symbolId } = viewerObj;
                    const symbolObj = symbolTable[symbolId];
                    return {
                        viewerId,
                        viewerType,
                        symbolId,
                        symbolObj,
                    };

                case ViewerTypes.PRINT:
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
        viewers:        viewersSelector(state),
        layout:         state.canvas.viewerPositions,
        symbolTable:    state.program.symbolTable,
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        addSnapshotViewer:    addSnapshotViewerAction,
        addLiveViewer:        addLiveViewerAction,
        addPrintViewer:       addPrintViewerAction,
        removeViewer:         removeViewerAction,
        updateLayout:         updateLayoutAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Canvas)
);
