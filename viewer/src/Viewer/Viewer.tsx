import * as React from 'react';
import Immutable from 'seamless-immutable';

import cuid from 'cuid';

import {
    FragmentId,
    Fragment,
    View,
    TextPrimitiveFragment,
    ImagePrimitiveFragment,
    GridLayoutFragment,
    FlowLayoutFragment,
    SwitchLayoutFragment,
    SequenceLayoutFragment,
    DagLayoutFragment,
    KeyValueLayoutFragment,
} from '@vizstack/schema';

import { FragmentAssembler, assemble } from '@vizstack/js';

// Primitives components
import TextPrimitive from '../primitives/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive';

// Layout components
import GridLayout from '../layouts/GridLayout';
import DagLayout from '../layouts/DagLayout';
import FlowLayout from '../layouts/FlowLayout';
import SequenceLayout from '../layouts/SequenceLayout';
import SwitchLayout from '../layouts/SwitchLayout';
import KeyValueLayout from '../layouts/KeyValueLayout';

// Interactions
import { Event, ViewerHandle, ViewerId, ComponentHandle } from '../interaction';
import { InteractionContext } from '../interaction';

export type ViewerToViewerProps = {
    parent: ViewerHandle,
    view: View,
};

export type InteractionProps = {
    emitEvent: (topic: string, message: Record<string, any>) => void,
    updateHandle: (handle: ComponentHandle) => void,
    viewerId: ViewerId,
};

/**
 * This smart component parses a Snapshot and assembles a corresponding Viz rendering.
 */
export type ViewerProps = {
    /* Specification of View's root model and sub-models. */
    view: View,

    /* Unique `FragmentId` for the `Fragment` to be rendered by this `Viewer` at the current
     * level of nesting. If unspecified, the `view.rootId` is used. */
    fragmentId?: FragmentId,

    /* A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     * instance to begin handling events for this `Viewer`. */
    register: (viewerId: ViewerId, handleFactory: () => ViewerHandle) => void,

    /* A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     * instance to stop handling events for this `Viewer`. */
    unregister: (viewerId: ViewerId, handleFactory: () => ViewerHandle) => void,

    /* A function which publishes an `Event` to the `InteractionManager` which was registered by
     * the `register()` function. */
    emitEvent: (topic: string, message: Record<string, any>) => void,

    /* Information about the parent of this viewer, if one exists. */
    parent?: ViewerHandle,
};

type ViewerState = {};

class Viewer extends React.PureComponent<ViewerProps, ViewerState> {
    viewerId: ViewerId;
    componentHandle = {};

    static defaultProps = {
        register: () => {},
        unregister: () => {},
        publishEvent: () => {},
    };

    constructor(props: ViewerProps) {
        super(props);
        this.viewerId = cuid();
    }

    componentDidMount() {
        this.props.register(this.viewerId, () => this._getHandle());
    }

    componentWillUnmount() {
        this.props.unregister(this.viewerId, () => this._getHandle());
    }

    _getModel() {
        const { view, fragmentId } = this.props;
        const currId: FragmentId = fragmentId || view.rootId;
        return view.models[currId];
    }

    _getHandle(): ViewerHandle {
        const { parent } = this.props;
        return {
            id: this.viewerId,
            model: this._getModel(),
            parent,
            ...this.componentHandle,
        };
    }

    /** Renderer. */
    render() {
        const { view, fragmentId, emitEvent } = this.props;

        // Explicitly specified model for current viewer, or root-level model by default.
        const model: Fragment = this._getModel();
        if (!model) {
            console.error('Invalid FragmentId within View: ', fragmentId, view);
            return null;
        }

        const viewerToViewerProps: ViewerToViewerProps = {
            parent: this._getHandle(),
            view,
        };

        const interactionProps: InteractionProps = {
            emitEvent: (topic, message) => emitEvent(topic, message),
            updateHandle: (handle) => {
                this.componentHandle = handle;
            },
            viewerId: this.viewerId,
        };

        // The `Viewer` is the component that knows how to dispatch on model type to render
        // different primitive and layout components.
        switch (model.type) {
            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                const { contents } = model;
                return <TextPrimitive {...interactionProps} {...contents} />;
            }

            case 'ImagePrimitive': {
                const { contents } = model;
                return <ImagePrimitive {...interactionProps} {...contents} />;
            }

            // =====================================================================================
            // Layouts

            case 'GridLayout': {
                const { contents } = model;
                return (
                    <GridLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'FlowLayout': {
                const { contents } = model;
                return (
                    <FlowLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'SequenceLayout': {
                const { contents } = model;
                return (
                    <SequenceLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'KeyValueLayout': {
                const { contents } = model;
                return (
                    <KeyValueLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'SwitchLayout': {
                const { contents } = model;
                return (
                    <SwitchLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'DagLayout': {
                const { contents } = model;
                return (
                    <DagLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            default: {
                console.error(`Unknown Fragment type "${(model as any).type}" passed to Viewer ${this.viewerId}`);
                return null;
            }
        }
    }
}

// TODO: do we need these as props
function consumeInteractions<Config>(Component){
    return React.forwardRef<Config, Viewer>((props, ref) => (
        <InteractionContext.Consumer>
            {({ registerViewer, unregisterViewer, emitEvent }) => {
                return (
                    <Component
                        {...props}
                        ref={ref}
                        register={registerViewer}
                        unregister={unregisterViewer}
                        emitEvent={emitEvent}
                    />
                );
            }}
        </InteractionContext.Consumer>
    ));
}

function assembleView(Component) {
    return React.forwardRef((props, ref) => (
        <Component
            {...props}
            ref={ref}
            view={props.view instanceof FragmentAssembler ? assemble(props.view) : props.view}
        />
    ));
}

// https://github.com/facebook/react/issues/12397#issuecomment-375501574
const InteractiveViewer = consumeInteractions<ViewerProps>(assembleView(Viewer));

export { InteractiveViewer as Viewer };
