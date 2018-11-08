import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import type {TokenPrimitiveModel, VizId, VizSpec} from "../state/viztable/outputs";
import { getVizTable, VizModel } from "../state/viztable/outputs";

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';
import {addViewerAction, removeViewerAction, reorderViewerAction} from "../state/canvas/actions";
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

        /** Unique ViewerId for this viewer's root viewer. */
        viewerId: PropTypes.string.isRequired,

        /** TODO: State. */
        viewerState: PropTypes.object,

        /** Unique VizId for top-level viz. */
        vizId: PropTypes.string.isRequired,
    };

    /**
     * Recursively parse and assemble a nested visualization from the VizSpec.
     */
    createVizComponent() {
        const { viewer, viewerId, vizTable, addViewer } = this.props;
        const { vizId, expansionState, children } = viewer;

        const vizSpec: VizSpec = vizTable[vizId];
        if(!vizSpec) {
            return null;  // TODO: What to do?
        }

        let model: VizModel = undefined;
        switch(expansionState) {
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
                model.contents.elements.forEach((childVizId: VizId) => {
                    if (!(childVizId in children)) {
                        // TODO: this logic also exists in repl. merge them
                        let expansionState = 'summary';
                        if (vizTable[childVizId].compactModel !== null) {
                            expansionState = 'compact';
                        }
                        if (vizTable[childVizId].fullModel !== null) {
                            expansionState = 'full';
                        }
                        addViewer(childVizId, expansionState, viewerId)
                    }
                });
                return null;

            case 'KeyValueLayout':
                return null;
        }
    }

    /** Renderer. */
    render() {
        const { vizId } = this.props;
        return this.createVizComponent(vizId);
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
        viewer:    getViewer(state.canvas, props.viewerId),
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
    withStyles(styles)(Viewer)
);
