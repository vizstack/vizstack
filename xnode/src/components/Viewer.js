import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import type {SequenceLayoutModel, TokenPrimitiveModel, VizId, VizSpec} from "../state/viztable/outputs";
import { getVizTable, VizModel } from "../state/viztable/outputs";

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';
import {
    createViewerAction, hideViewerInCanvasAction, reorderViewerInCanvasAction,
    showViewerInCanvasAction
} from "../state/canvas/actions";
import {getViewer} from "../state/canvas/outputs";

// Viz layouts
import SequenceLayout from './layouts/SequenceLayout';

/**
 * This smart component recursively parses a VizSpec and assembles a nested Viz rendering.
 */
class Viewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Unique `ViewerId` for this Viewer. */
        viewerId: PropTypes.string.isRequired,

        /** Specification of this `Viewer`, including its state. See 'canvas/outputs/ViewerSpec'. */
        viewerSpec: PropTypes.object.isRequired,

        /** Reference of `VizTable`. See 'viztable/outputs/getVizTable()'. */
        vizTable: PropTypes.string.isRequired,

        /** Functions for creating viewers and updating Canvas layout. See 'canvas/outputs'. */
        createViewer: PropTypes.func.isRequired,
        showViewer: PropTypes.func.isRequired,
        hideViewer: PropTypes.func.isRequired,
    };

    /** Renderer. */
    render() {
        const { viewerId, viewerSpec, vizTable } = this.props;
        const { vizId, viewerState, children } = viewerSpec;

        const vizSpec: VizSpec = vizTable[vizId];
        if(!vizSpec) {
            return null;  // TODO: What to do?
        }

        let model: VizModel = undefined;
        switch(viewerState) {
            case 'summary':
                model = vizSpec.summaryModel;
                break;
            case 'compact':
                model = vizSpec.compactModel;
                break;
            case 'full':
                model = vizSpec.fullModel;
                break;
        }

        switch(model.type) {

            // Primitives
            // ----------

            case 'TokenPrimitive':
                const { text } = (model: TokenPrimitiveModel).contents;
                return (
                    <TokenPrimitive text={text}
                                    shouldTextWrap={true} />
                );

            // Layouts
            // -------

            case 'SequenceLayout':
                const { elements } = (model: SequenceLayoutModel).contents;
                elements.forEach((childVizId: VizId) => {
                    if (!(childVizId in children)) {
                        let viewerState = 'summary';
                        viewerState = vizTable[childVizId].compactModel ? 'compact' : viewerState;
                        viewerState = vizTable[childVizId].fullModel ? 'full' : viewerState;
                        addViewer(childVizId, viewerState, -1, viewerId);
                    }
                });
                return null;

            case 'KeyValueLayout':
                return null;
        }
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    // css-key: value,
});

// To inject application state into component
// ------------------------------------------

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        viewerSpec:    getViewer(state.canvas, props.viewerId),
        vizTable:      getVizTable(state.viztable),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        createViewer:   createViewerAction,
        showViewer:     showViewerInCanvasAction,
        hideViewer:     hideViewerInCanvasAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Viewer)
);
