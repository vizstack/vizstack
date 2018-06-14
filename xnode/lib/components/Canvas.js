'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import { withStyles } from 'material-ui/styles';
import classNames from 'classnames';

// Material UI
import ColorGrey from 'material-ui/colors/grey';

// Grid layout
import GridLayout, { WidthProvider } from 'react-grid-layout';
const FlexibleGridLayout = WidthProvider(GridLayout);

// Custom React viewers
import ViewerFrame  from './ViewerFrame';
import NumberViewer from './viewers/NumberViewer';
import StringViewer from './viewers/StringViewer';
import TensorViewer from './viewers/TensorViewer';
import GraphViewer, { assembleGraphModel }  from './viewers/GraphViewer';
import ListViewer, { assembleListModel }   from './viewers/ListViewer';

// Custom Redux actions
import { addViewerAction, removeViewerAction, updateLayoutAction } from '../actions/canvas';
import { isSymbolIdFrozen } from '../services/symbol-utils';


/**
 * This smart component serves as an interactive workspace for inspecting variable viewers. It displays a collection
 * of `ViewerFrame` objects using React Grid Layout.
 */
class Canvas extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** JSS styling classes object. */
        classes: PropTypes.object.isRequired,

        /**
         * See `REPL.fetchSymbolData(symbolId)`.
         */
        fetchSymbolData: PropTypes.func.isRequired,

        /**
         * Creates a new viewer for the specified symbol at the end of the Canvas.
         *
         * @param symbolId
         */
        addViewer: PropTypes.func.isRequired,

        /**
         * Removes the viewer with the specified symbol from the Canvas.
         *
         * @param symbolId
         */
        removeViewer: PropTypes.func.isRequired,

        /**
         *
         */
        updateLayout: PropTypes.func.isRequired,

        /** See `viewersSelector` in `Canvas`. */
        viewers: PropTypes.array.isRequired,

        /** See `viewerPositions` in `reducers/canvas`. */
        layout:  PropTypes.array.isRequired,

        /** See `symbolTable` in `reducers/program`. */
        symbolTable: PropTypes.object.isRequired,

    };

    /**
     * Returns the [*]Viewer component of the proper type for the given viewer data object.
     */
    createViewerComponent(viewer) {
        const { addViewer, fetchSymbolData, symbolTable } = this.props;
        const { symbolId, viewerId, type, name, str, data} = viewer;
        const props = {
            symbolId,
            viewerId,
            type,
            name,
            str,
            expandSubviewer: (symbolId) => {
                if(!isSymbolIdFrozen(symbolId)) {
                    console.debug("Canvas -- expand subviewer of symbol", symbolId);
                    fetchSymbolData(symbolId);
                    addViewer(symbolId);
                }
            },
            unfreezeViewer: () => {
                // TODO: viewer.viewerId
            }
        };

        switch(viewer.type) {
            case "number":
                return <NumberViewer {...props}/>;

            case "string":
                return <StringViewer {...props}/>;

            case "tensor":
                return <TensorViewer {...props}/>;

            case "graphdata":
                return <GraphViewer {...props} model={assembleGraphModel(symbolId, symbolTable)}/>;

            case "list":
            case "tuple":
            case "set":
                return <ListViewer {...props} model={assembleListModel(data, symbolTable)}/>;

            default:
                return null;
            // TODO: Add more viewers
        }
    }

    /**
     * Renders the inspector canvas and any viewers currently registered to it.
     */
    render() {
        const { classes, viewers, removeViewer, layout, updateLayout} = this.props;
        let frames = viewers.map((viewer) => {
            return (
                <div key={viewer.viewerId} className={classes.frameContainer}>
                    <ViewerFrame key={viewer.viewerId}
                                 viewerId={viewer.viewerId}
                                 type={viewer.type}
                                 name={viewer.name}
                                 removeViewer={() => removeViewer(viewer.viewerId)}>
                        {this.createViewerComponent(viewer)}
                    </ViewerFrame>
                </div>
            )
        });

        return (
            <div className={classNames({
                [classes.canvasContainer]: true,
                'native-key-bindings': true,
            })}>
                <FlexibleGridLayout layout={layout} cols={12} rowHeight={25} autoSize={true}
                                    onLayoutChange={updateLayout} draggableCancel=".ReactGridLayoutNoDrag">
                    {frames}
                </FlexibleGridLayout>
            </div>
        );
    }
}


// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = theme => ({
    canvasContainer: {
        height: '100%',
        overflow: 'auto',
        padding: theme.spacing.unit * 2,
    },
    frameContainer: {
        display: "block",
    }
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
        addViewer:    addViewerAction,
        removeViewer: removeViewerAction,
        updateLayout: updateLayoutAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Canvas));
