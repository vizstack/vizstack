import * as React from 'react';
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


/** Context information passed down by parent Viewer. Each viewer will consume fields useful to it; all other fields
 *  are discarded by default, unless explicitly propagated. Only a Layout Viz will have to pass-through (ignoring) the
 *  context to its `Viewer` sub-components; a Primitive Viz is terminal and so does not need to pass-through. */
export type ViewerContext = {

    // Size category to render the top-level Viz.
    displaySize?: 'regular' | 'small',
};

/**
 * This smart component recursively parses a VizSpec and assembles a nested Viz rendering.
 */
class Viewer extends React.Component<{

    /** CSS-in-JS styling object. */
    classes: {},

    /** Unique `ViewerId` for this Viewer. */
    vizId: string,

    /** Reference of `VizTable`. See 'viztable/outputs/getVizTable()'. */
    vizTable: {[VizId]: VizSpec},

    /** Information passed down from direct parent Viewer. */
    viewerContext?: ViewerContext,

}, {

    /** What expansion mode the viewer is in. */
    viewerState: string,

}> {

    constructor(props) {
        super(props);
        const { vizTable, vizId } = this.props;

        // Set initial state based on what model is available.
        let viewerState = 'summary';
        viewerState = vizTable[vizId].compactModel ? 'compact' : viewerState;
        viewerState = vizTable[vizId].fullModel ? 'full' : viewerState;
        this.state = {
            viewerState,
        }
    }

    /** Renderer. */
    render() {
        const { vizId, vizTable, viewerContext } = this.props;
        const { viewerState } = this.state;

        const vizSpec: VizSpec = vizTable[vizId];
        if(!vizSpec) return null;

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
                    <TokenPrimitive viewerContext={viewerContext}
                                    text={text}
                                    shouldTextWrap={true} />
                );

            // Layouts
            // -------

            case 'SequenceLayout':
                const { elements } = (model: SequenceLayoutModel).contents;
                return (
                    <SequenceLayout viewerContext={viewerContext}
                                    elements={elements.map((vizId: VizId) => ({ vizId }))}/>
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
        vizTable:  getVizTable(state.viztable),
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
