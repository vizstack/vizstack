import * as React from 'react';
import path from 'path';
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
    TextPrimitiveModel,
    FlowLayoutModel,
    GridLayoutModel,
    DagLayoutModel,
} from '../state/viztable/outputs';
import { getVizTable, VizModel } from '../state/viztable/outputs';

// Viz primitives
import TextPrimitive from './primitives/TextPrimitive';
import ImagePrimitive from './primitives/ImagePrimitive/ImagePrimitive';

// Viz layouts
import GridLayout from './layouts/GridLayout';
import DagLayout from './layouts/DagLayout';
import FlowLayout from './layouts/FlowLayout';
import { obj2obj } from '../services/data-utils';

/** The sequence in which users can toggle different models. */
const kModelTransitionOrder = { summary: 'compact', compact: 'full', full: 'summary' };

export type ViewerProps = {
    /** Unique `VizId` for this Viewer. */
    vizId: VizId,

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
        expansionMode: 'summary' | 'compact' | 'full',
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

        this.marker = null;

        // Set initial state based on what model is available.
        let expansionMode = 'summary';
        expansionMode = vizTable[vizId].compactModel ? 'compact' : expansionMode;
        expansionMode = vizTable[vizId].fullModel ? 'full' : expansionMode;
        this.state = Immutable({
            expansionMode,
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
        const { isHovered, expansionMode } = this.state;
        const { vizId, vizTable, fetchVizModel } = this.props;
        // Each Viz component receives `mouseProps`, which define mouse events for highlighting and viewer expansion.
        // The Viz component must add these props to a node in its `render()` function. This allows the Viz to control
        // what its outermost node is instead of the Viewer having to wrap it.
        let mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                const expansionModeNext = kModelTransitionOrder[expansionMode];
                fetchVizModel(vizId, expansionModeNext);
                this.setState((state) => Immutable(state).set('expansionMode', expansionModeNext));
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                this.setState((state) => Immutable(state).set('isHovered', true));
                atom.workspace.getTextEditors().forEach((editor) => {
                    console.log(editor.getPath(), vizTable[vizId].filePath);
                    if (editor.getPath().toLowerCase() === vizTable[vizId].filePath.toLowerCase()) {
                        this.marker = editor.markBufferPosition([vizTable[vizId].lineNumber - 1, 0]);
                        editor.decorateMarker(this.marker, {type: 'line', 'class': 'xn-watched-line'});
                    }
                });  // TODO: remove this Atom integration
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                this.setState((state) => Immutable(state).set('isHovered', false));
                if (this.marker !== null) {
                    this.marker.destroy();
                }
            },
        };
        const isTextPrimitive =
            vizTable[vizId].fullModel && vizTable[vizId].fullModel.type === 'TextPrimitive';
        if (isTextPrimitive) mouseProps = {}; // TODO: Remove this hack.

        const generalProps = {
            mouseProps,
            isHovered,
            isFullyExpanded: expansionMode === 'full',
        };
        switch (model.type) {
            // Primitives
            // ----------

            case 'TextPrimitive': {
                const { text, color, variant } = (model: TextPrimitiveModel).contents;
                return (
                    <TextPrimitive {...generalProps} text={text} color={color} variant={variant} />
                );
            }

            case 'ImagePrimitive': {
                const { filePath } = (model: TextPrimitiveModel).contents;
                return <ImagePrimitive {...generalProps} filePath={filePath} />;
            }

            // Layouts
            // -------

            case 'FlowLayout': {
                const { elements } = (model: FlowLayoutModel).contents;
                return (
                    <FlowLayout
                        {...generalProps}
                        elements={elements.map((vizId) => {
                            return { vizId, fetchVizModel };
                        })}
                    />
                );
            }

            case 'GridLayout': {
                const { elements } = (model: GridLayoutModel).contents;
                return (
                    <GridLayout
                        {...generalProps}
                        elements={elements.map(([vizId, col, row, width, height]) => [
                            { vizId,fetchVizModel },
                            col,
                            row,
                            width,
                            height,
                        ])}
                    />
                );
            }

            case 'DagLayout': {
                const { nodes, containers, edges } = (model: DagLayoutModel).contents;
                return (
                    <DagLayout
                        {...generalProps}
                        nodes={obj2obj(nodes, (id, spec) => [
                            id,
                            {
                                viewerProps: {
                                    vizId: spec.vizId,
                                    fetchVizModel,
                                },
                                spec: spec,
                            },
                        ])}
                        edges={edges}
                    />
                );
            }

            default: {
                console.error("Unrecognized Viewer model type: ", model.type);
                return null;
            }
        }
    }

    /** Renderer. */
    render() {
        const { vizId, vizTable, classes } = this.props;
        const { isHovered, expansionMode } = this.state;

        const vizSpec: VizSpec = vizTable[vizId];
        if (!vizSpec) {
            return null; // TODO: What to do?
        }

        // TODO: show borders (and padding?) iff it can be meaningfully expanded

        let model: VizModel = undefined;
        switch (expansionMode) {
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

        // TODO: Remove this hack
        return this.getVizComponent(model);
        // const components = [this.getVizComponent(model)];
        // const isTextPrimitive = (
        //     vizTable[vizId].fullModel &&
        //     vizTable[vizId].fullModel.type === 'TextPrimitive'
        // );
        // if(!isTextPrimitive) {
        //     components.push(
        //         <span className={classNames({
        //             [classes.indicator]: true,
        //             [classes.indicatorHovered]: isHovered,
        //         })}>{expansionMode}</span>
        //     );
        // }
        // return components;
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    indicator: {
        fontSize: 8,
        textAlign: 'center',
        visibility: 'hidden',
    },
    indicatorHovered: {
        visibility: 'visible',
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
