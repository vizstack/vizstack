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
import InspectIcon from '@material-ui/icons/Search';  // Explore, LockOpen
import DeleteIcon from '@material-ui/icons/DeleteOutlined';
import DuplicateIcon from '@material-ui/icons/FileCopyOutlined';
import CloseIcon from '@material-ui/icons/Close';

// Custom data type viewers
import PrimitiveViewer from './viewers/PrimitiveViewer';
import StringViewer from './viewers/StringViewer';
// import TensorViewer from './viewers/TensorViewer';
// import GraphViewer, { assembleGraphModel }  from './viewers/GraphViewer';
import SequenceViewer from './viewers/SequenceViewer';

// Custom Redux actions
import { addSnapshotViewerAction, addLiveViewerAction, addPrintViewerAction,
    removeViewerAction, updateLayoutAction } from '../state/canvas/actions';
import { isSymbolIdFrozen } from '../services/symbol-utils';


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
    // Canvas viewer callback functions
    // =================================================================================================================

    // TODO: Factor these out of local definition
    // expandSubviewer(symbolId) {
    //     if(!isSymbolIdFrozen(symbolId)) {
    //         const { addViewer, fetchSymbolData } = this.props;
    //         console.debug(`Canvas -- expand subviewer of symbol ${symbolId}`);
    //         fetchSymbolData(symbolId);
    //         addViewer(symbolId);
    //     }
    // }

    deleteSnapshotViewer(symbolId) {
        if(isSymbolIdFrozen(symbolId)) {
            console.debug(`Canvas -- delete snapshot viewer & watch expression for symbol ${symbolId}`);
            // TODO
        }
    }

    openLiveViewer(symbolId) {
        if(isSymbolIdFrozen(symbolId)) {
            console.debug(`Canvas -- open live viewer for symbol ${symbolId}`);
            // TODO
        }
    }

    closeLiveViewer(viewerId) {
        console.debug(`Canvas -- close live viewer ${viewerId}`);
    }

    duplicateLiveViewer(viewerId) {
        console.debug(`Canvas -- duplicate live viewer ${viewerId}`);
    }

    // =================================================================================================================
    // Canvas rendering
    // =================================================================================================================

    /**
     * Returns the [*]Viewer component of the proper type for the given viewer data object.
     *
     * @param {object} viewer
     */
    createViewerComponent(viewer) {
        const { symbolTable } = this.props;
        const { symbolId, viewerId, type, name, str, data} = viewer;

        // TODO: Refactor other viewers
        let viewerContent;
        switch(type) {
            case 'none':
            case 'bool':
            case 'number':
                viewerContent = <PrimitiveViewer str={str}/>;
                break;

            case 'string':
                viewerContent = <StringViewer data={data}/>;
                break;

            case 'list':
            case 'tuple':
            case 'set':
                viewerContent = <SequenceViewer data={data} symbolTable={symbolTable}
                                                expandSubviewer={this.openLiveViewer.bind(this)}/>;
                break;

            case 'tensor':  // TODO
                // viewerContent = <TensorViewer {...contentProps}/>;
                break;

            case 'graphdata':  // TODO
                // viewerContent = <GraphViewer {...contentProps} symbolId={symbolId} symbolTable={symbolTable}/>;
                break;

            default:
                console.warn(`Canvas -- unrecognized data type received; got ${type}`)
                viewerContent = <span>Unrecognized data type</span>;
                break;

            // TODO: Add more viewers
        }

        let icons = [];
        if (type === 'dict' /* isSnapshot */) {
            icons.push({title: 'Inspect', icon: <InspectIcon/>, onClick: this.openLiveViewer.bind(this, symbolId)});
            icons.push({title: 'Delete',  icon: <DeleteIcon/>,  onClick: this.deleteSnapshotViewer.bind(this, symbolId)});
        } else if (true /* isLive */) {
            icons.push({title: 'Duplicate', icon: <DuplicateIcon/>, onClick: this.duplicateLiveViewer.bind(this, viewerId)});
            icons.push({title: 'Close',     icon: <CloseIcon/>, onClick: this.closeLiveViewer.bind(this, viewerId)});
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

        return (
            <ViewerDisplayFrame viewerType={type} viewerName={name}
                                icons={icons}>
                {viewerContent}
            </ViewerDisplayFrame>
        );
    }

    /**
     * Renders the inspector canvas and any viewers currently registered to it.
     */
    render() {
        const { classes, viewers, layout, updateLayout} = this.props;
        const frames = viewers.map((viewer) => {
            return (
                <div key={viewer.viewerId} className={classes.frameContainer}>
                    {this.createViewerComponent(viewer)}
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
 *         symbolId: "@id:12345",
 *         viewerId: 0,
 *         type: "number",
 *         name: "myInt",
 *         str:  "86",
 *         data: {...}
 *     }
 * ]
 */
// TODO: This selector doesn't seem to be very effective because it's still rerendering each elem in the Canvas
// whenever the symbol table changes.
const viewersSelector = createSelector(
    [(state) => state.canvas.viewerObjects, (state) => state.canvas.viewerPositions, (state) => state.program.symbolTable],
    (viewerObjects, viewerPositions, symbolTable) => {
        return viewerPositions.map((viewerPosition) => {
            let viewerId = parseInt(viewerPosition.i);
            let viewerObj = viewerObjects[viewerId];
            let symbol = symbolTable[viewerObj.symbolId];
            return {
                symbolId: viewerObj.symbolId,
                viewerId: viewerId,
                type:     symbol.type,
                name:     symbol.name,
                str:      symbol.str,
                data:     symbol.data,
            };
        });
    }
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers:     viewersSelector(state),
        layout:      state.canvas.viewerPositions,
        symbolTable: state.program.symbolTable,
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
