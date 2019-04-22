// @flow
import * as React from 'react';
import Immutable from 'seamless-immutable';

import type {
    ViewId,
    ViewModel,
    View,
    TextPrimitiveModel,
    ImagePrimitiveModel,
    GridLayoutModel,
    FlowLayoutModel,
    SwitchLayoutModel,
    DagLayoutModel,
} from '../schema';

// Primitives
import TextPrimitive from '../primitives/TextPrimitive/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive/index';

// Layouts
import GridLayout from '../layouts/GridLayout/GridLayout';
import DagLayout from '../layouts/DagLayout/index';
import FlowLayout from '../layouts/FlowLayout/FlowLayout';

export type ViewerProps = {};

/**
 * This smart component parses a Snapshot and assembles a corresponding Viz rendering.
 */
class Viewer extends React.Component<
    {
        /** Specification of View's root model and sub-models.*/
        view: View,

        /** Unique `ViewId` for the `ViewModel` to be rendered by this `Viewer` at the current
         *  level of nesting. If unspecified, the `rootId` from `view` is used. */
        viewId?: ViewId,

        /** Mouse interactions. */
        onClick?: () => void,
        onMouseOver?: () => void,
        onMouseOut?: () => void,
    },
    {
        /** Whether the current component is hovered. TODO: Clarify. */
        isHovered: boolean,
    },
> {
    /**
     * Constructor.
     * @param props
     */
    constructor(props) {
        super(props);
        this.state = Immutable({
            isHovered: false,
        });
    }

    /** Renderer. */
    render() {
        const { view, viewId } = this.props;
        const { onClick, onMouseOver, onMouseOut } = this.props;
        const { isHovered } = this.state;

        // Explicitly specified model for current viewer, or root-level model by default.
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        if (!model) {
            console.error('Invalid ViewId within View: ', currId, view);
            return null;
        }

        // TODO: How does this fit with the event-driven system?
        const mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                if (onClick) onClick();
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                this.setState((state) => Immutable(state).set('isHovered', true));
                if (onMouseOver) onMouseOver();
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                this.setState((state) => Immutable(state).set('isHovered', false));
                if (onMouseOut) onMouseOut();
            },
        };
        const generalProps = {
            mouseProps,
            isHovered,
        };

        // The `Viewer` is the component that knows how to dispatch on model type to render
        // different primitive and layout components.
        switch (model.type) {
            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                const { contents } = (model: TextPrimitiveModel);
                return <TextPrimitive {...generalProps} {...contents} />;
            }

            case 'ImagePrimitive': {
                const { contents } = (model: ImagePrimitiveModel);
                return <ImagePrimitive {...generalProps} {...contents} />;
            }

            // =====================================================================================
            // Layouts

            case 'GridLayout': {
                const { contents } = (model: GridLayoutModel);
                return <GridLayout {...generalProps} {...contents} />;
            }

            case 'FlowLayout': {
                const { contents } = (model: FlowLayoutModel);
                return <FlowLayout {...generalProps} {...contents} />;
            }

            // case 'SwitchLayout': {
            //     const { contents } = (model: SwitchLayoutModel);
            //     return (
            //         <SwitchLayout {...generalProps} {...contents} />
            //     );
            // }

            case 'DagLayout': {
                const { contents } = (model: DagLayoutModel);
                return <DagLayout {...generalProps} {...contents} />;
            }

            default: {
                console.error('Unrecognized ViewModel type: ', model.type);
                return null;
            }
        }
    }
}

export default Viewer;
