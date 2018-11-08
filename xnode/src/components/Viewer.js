import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import type {TokenPrimitiveModel, VizId, VizSpec} from "../state/viztable/outputs";
import { VizModel } from "../state/viztable/outputs";

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';

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
    createVizComponent(vizId: VizId) {
        const { vizTable } = this.props;

        const vizSpec = vizTable[vizId];
        if(!vizSpec) {
            return null;  // TODO: What to do?
        }

        // TODO: Which model is currently using?
        const model: VizModel = vizSpec.summaryModel;

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
function mapStateToProps(state, props) {  // Second argument `props` is manually set prop
    return (state, props) => {
        // propName1: state.subslice,
        // propName2: doSomethingSelector(state)
    };
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        // propName: doSomethingAction,
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(
    withStyles(styles)(Viewer)
);