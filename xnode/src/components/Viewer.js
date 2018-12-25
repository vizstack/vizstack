import * as React from 'react';
import classNames from 'classnames';
import Immutable from 'seamless-immutable';
import { withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';
import ColorLightBlue from '@material-ui/core/colors/lightBlue';

import type {
    VizId,
    VizSpec,
    TokenPrimitiveModel,
    SequenceLayoutModel,
    KeyValueLayoutModel,
    DagLayoutModel,
} from '../state/viztable/outputs';
import { getVizTable, VizModel } from '../state/viztable/outputs';

// Viz primitives
import TokenPrimitive from './primitives/TokenPrimitive';

// Viz layouts
import KeyValueLayout from './layouts/KeyValueLayout';
import SequenceLayout from './layouts/SequenceLayout';
import DagLayout from './layouts/DagLayout';

/** The sequence in which users can toggle different models. */
const kModelTransitionOrder = { summary: 'compact', compact: 'full', full: 'summary' };

/** Context information passed down by parent Viewer. Each viewer will consume fields useful to it; all other fields
 *  are discarded by default, unless explicitly propagated. Only a Layout Viz will have to pass-through (ignoring) the
 *  context to its `Viewer` sub-components; a Primitive Viz is terminal and so does not need to pass-through. */
export type ViewerContext = {
    /** Size category to render the top-level Viz. */
    displaySize?: 'regular' | 'small',
};

export type ViewerProps = {
    /** Unique `VizId` for this Viewer. */
    vizId: VizId,

    /** Information passed down from direct parent Viewer. */
    viewerContext?: ViewerContext,

    /** Requests a particular model for a Viz from the backend if not already loaded. See 'repl/fetchVizModel'. */
    fetchVizModel: (VizId, 'compact' | 'full') => void,
};

/**
 * This smart component parses a VizSpec and assembles a corresponding Viz rendering.
 */
class Viewer extends React.Component<
    ViewerProps & {
        /** CSS-in-JS styling object. */
        classes: {},

        /** Reference of `VizTable`. See 'viztable/outputs/getVizTable()'. */
        vizTable: { [VizId]: VizSpec },
    },
    {
        /** What expansion mode the viewer is in. */
        viewerState: 'summary' | 'compact' | 'full',
    },
> {
    /**
     * Constructor.
     *
     * Assigns the viewer a state (summary, compact, or full) according to the highest-level model available in its viz
     * table entry.
     *
     * @param props
     */
    constructor(props) {
        super(props);
        const { vizTable, vizId } = this.props;

        // Set initial state based on what model is available.
        let viewerState = 'summary';
        viewerState = vizTable[vizId].compactModel ? 'compact' : viewerState;
        viewerState = vizTable[vizId].fullModel ? 'full' : viewerState;
        this.state = Immutable({
            viewerState,
            isHovered: false,
        });
    }

    /**
     * Returns a component which renders the Viz associated with this viewer.
     * @param model
     *      The model to be rendered.
     * @returns
     *      The Viz component which renders the model.
     */
    getVizComponent(model: VizModel): React.Component {
        const { fetchVizModel } = this.props;
        switch (model.type) {
            // Primitives
            // ----------

            case 'TokenPrimitive':
                const { text } = (model: TokenPrimitiveModel).contents;
                return <TokenPrimitive text={text} shouldTextWrap={true} />;

            // Layouts
            // -------

            case 'SequenceLayout':
                const { elements } = (model: SequenceLayoutModel).contents;
                return (
                    <SequenceLayout
                        elements={elements.map((vizId: VizId) => ({
                            vizId,
                            fetchVizModel: fetchVizModel,
                            viewerContext: {
                                displaySize: 'small',
                            },
                        }))}
                    />
                );

            case 'KeyValueLayout':
                // const { elements } = (model: KeyValueLayoutModel).contents;
                // return (
                //     <KeyValueLayout elements={
                //         Object.entries(elements).map(([key: VizId, value: VizId]))
                //     }/>
                // )
                return null;

            case 'DagLayout':
                const { nodes, containers, edges } = (model: DagLayoutModel).contents;
                return (
                    // TODO: update nodes to be viewer props
                    <DagLayout nodes={nodes} edges={edges} containers={containers} />
                );
        }
    }

    /** Renderer. */
    render() {
        const { vizId, vizTable, viewerContext, classes, fetchVizModel } = this.props;
        const { viewerState, isHovered } = this.state;

        const vizSpec: VizSpec = vizTable[vizId];
        if (!vizSpec) {
            return null; // TODO: What to do?
        }

        let model: VizModel = undefined;
        switch (viewerState) {
            case 'full':
                if (vizSpec.fullModel) {
                    model = vizSpec.fullModel;
                    break;
                }
            // Fall through
            case 'compact':
                if (vizSpec.compactModel) {
                    model = vizSpec.compactModel;
                    break;
                }
            // Fall through
            case 'summary':
                model = vizSpec.summaryModel;
                break;
        }
        return (
            <div
                className={classNames({
                    [classes.box]: true,
                    [classes.hovered]: isHovered,
                })}
                onClick={(e) => {
                    e.stopPropagation();
                    const viewerStateUpdated = kModelTransitionOrder[viewerState];
                    fetchVizModel(vizId, viewerStateUpdated);
                    this.setState((state) => state.set('viewerState', viewerStateUpdated));
                }}
                onMouseOver={(e) => {
                    e.stopPropagation();
                    this.setState((state) => state.set('isHovered', true));
                }}
                onMouseOut={(e) => {
                    e.stopPropagation();
                    this.setState((state) => state.set('isHovered', false));
                }}
            >
                {this.getVizComponent(model)}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    // css-key: value,// Border for highlighting
    box: {
        borderRadius: theme.shape.borderRadius.regular,
        borderColor: 'transparent',
        borderStyle: 'solid',
        borderWidth: 1, // TODO: Dehardcode this
    },
    hovered: {
        borderColor: ColorLightBlue[400], // TODO: Dehardcode this
    },
});

// To inject application state into component
// ------------------------------------------

/** Connects application state objects to component props. */
function mapStateToProps(state, props) {
    return {
        vizTable: getVizTable(state.viztable),
    };
}

export default connect(mapStateToProps)(withStyles(styles)(Viewer));
