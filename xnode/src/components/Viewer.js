import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import type {SequenceLayoutModel, KeyValueLayoutModel, TokenPrimitiveModel, VizId, VizSpec} from "../state/viztable/outputs";
import { getVizTable, VizModel } from "../state/viztable/outputs";

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';
import {
    createViewerAction, hideViewerInCanvasAction, reorderViewerInCanvasAction,
    showViewerInCanvasAction
} from "../state/canvas/actions";
import {getViewer} from "../state/canvas/outputs";

// Viz layouts
import KeyValueLayout from './layouts/KeyValueLayout';
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
        vizId: PropTypes.string.isRequired,

        /** Reference of `VizTable`. See 'viztable/outputs/getVizTable()'. */
        vizTable: PropTypes.object.isRequired,

        // TODO: viz props
    };


    // whenever the vizid first enters the viztable, we need to set the initial state
    constructor(props) {
        super(props);
        const { vizTable, vizId } = this.props;
        let viewerState = 'summary';
        viewerState = vizTable[vizId].compactModel ? 'compact' : viewerState;
        viewerState = vizTable[vizId].fullModel ? 'full' : viewerState;
        this.state = {
            viewerState,
        }
    }

    /** Renderer. */
    render() {
        const { vizId, vizTable } = this.props;
        const { viewerState } = this.state;

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
                return (
                    <SequenceLayout elements={
                        elements.map((vizId: VizId) => {
                            return {
                                vizId,
                            };
                        })
                    }/>
                );

            case 'KeyValueLayout':
                // const { elements } = (model: KeyValueLayoutModel).contents;
                // return (
                //     <KeyValueLayout elements={
                //         Object.entries(elements).map(([key: VizId, value: VizId]))
                //     }/>
                // )
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
        vizTable:      getVizTable(state.viztable),
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Viewer)
);
