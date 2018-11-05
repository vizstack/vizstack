import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import type {VizId, VizSpec} from "../state/viztable/outputs";
import { VizModel } from "../state/viztable/outputs";

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';

// Viz layouts


/**
 * This pure dumb component recursively parses a VizSpec and assembles a nested Viz rendering.
 */
class Viewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Unique ViewerId for this viewer. */
        viewerId: PropTypes.string.isRequired,

        /** TODO: State. */
        viewerState: PropTypes.object,

        /** Unique VizId for top-level viz. */
        vizId: PropTypes.string.isRequired,

        vizTable: PropTypes.object.isRequired,
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
        console.log("HEHRHEHE", vizSpec);

        switch(model.type) {
            case 'TokenPrimitive':
                return (
                    <TokenPrimitive
                        model={model.contents.text}
                        shouldTextWrap={true}
                        onMouseEnter={() => this.setState({isHovered: true})}
                        onMouseLeave={() => this.setState({isHovered: false})}/>
                );
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

export default withStyles(styles)(Viewer);
