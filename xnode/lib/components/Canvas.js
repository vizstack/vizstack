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
import GraphViewer  from './viewers/GraphViewer';
import ListViewer   from './viewers/ListViewer';

// Custom Redux actions
import { addViewerActionThunk, removeViewerAction, updateLayoutAction } from "../actions/canvas";


/**
 * This smart component serves as an interactive workspace for inspecting variable viewers. It displays a collection
 * of `ViewerFrame` objects using React Grid Layout.
 */
class Canvas extends Component {

    /** Prop expected types object. */
    static propTypes = {
        classes: PropTypes.object.isRequired,
    };

    /**
     * Returns the [*]Viewer component of the proper type for the given viewer data object.
     */
    createViewerComponent(viewer) {
        const props = {
            symbolId: viewer.symbolId,
            viewerId: viewer.viewerId,
            payload: viewer.payload,
            str: viewer.str,
        };

        switch(viewer.type) {
            case "number":
                return <NumberViewer {...props}/>;
            case "string":
                return <StringViewer {...props}/>;
            case "tensor":
                return <TensorViewer {...props}/>;
            case "graphdata":
                return <GraphViewer {...props}/>;
            case "list":
            case "tuple":
            case "set":
                return <ListViewer {...props}/>;
            default:
                return null;
            // TODO: Add more viewers
        }
    }

    /**
     * Renders the inspector canvas and any viewers currently registered to it.
     */
    render() {
        const { classes, viewers, removeViewerFn, layout, updateLayoutFn } = this.props;
        let frames = viewers.map((viewer) => {
            return (
                <div key={viewer.viewerId} className={classes.frameContainer}>
                    <ViewerFrame key={viewer.viewerId}
                                 viewerId={viewer.viewerId}
                                 type={viewer.type}
                                 name={viewer.name}
                                 removeViewerFn={removeViewerFn}>
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
                                    onLayoutChange={updateLayoutFn} draggableCancel=".ReactGridLayoutNoDrag">
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
 *         payload: {...}
 *     }
 * ]
 */
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
                payload:  viewerObj.payload.merge(symbol.data && symbol.data.viewer),  // TODO: Why this?
            };
        });
    }
);

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewers: viewersSelector(state),
        layout:  state.canvas.viewerPositions,
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        addViewerFn:    addViewerActionThunk,
        removeViewerFn: removeViewerAction,
        updateLayoutFn: updateLayoutAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(Canvas));

