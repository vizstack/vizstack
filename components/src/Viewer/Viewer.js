// @flow
import * as React from 'react';
import Immutable from 'seamless-immutable';

import cuid from 'cuid';

import type {
    ViewId,
    ViewModel,
    View,
    TextPrimitiveModel,
    ImagePrimitiveModel,
    GridLayoutModel,
    FlowLayoutModel,
    SwitchLayoutModel,
    SequenceLayoutModel,
    DagLayoutModel, KeyValueLayoutModel,
} from '../schema';

import { View as ViewObject, assemble } from 'vizstack';

// Primitives components
import TextPrimitive from '../primitives/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive';

// Layouts
import GridLayout from '../layouts/GridLayout';
import DagLayout from '../layouts/DagLayout';
import FlowLayout from '../layouts/FlowLayout';
import SequenceLayout from '../layouts/SequenceLayout';
import SwitchLayout from '../layouts/SwitchLayout';
import KeyValueLayout from '../layouts/KeyValueLayout';

// Interactions
import type {
    Event,
    ViewerHandle,
    ViewerId,
    ComponentHandle,
} from '../interaction';
import { InteractionContext } from '../interaction';


export type ViewerToViewerProps = {
    parent: ViewerHandle,
    view: View,
};

export type InteractionProps = {|
    emitEvent: <E: Event>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,
    updateHandle: (handle: ComponentHandle) => void,
    viewerId: ViewerId,
|};

/**
 * This smart component parses a Snapshot and assembles a corresponding Viz rendering.
 */
export type ViewerProps = {
    /** Specification of View's root model and sub-models. */
    view: View | ViewObject,

    /** Unique `ViewId` for the `ViewModel` to be rendered by this `Viewer` at the current
     *  level of nesting. If unspecified, the `view.rootId` is used. */
    viewId?: ViewId,

    /** A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     *  instance to begin handling events for this `Viewer`. */
    register: (ViewerId, () => ViewerHandle) => void,

    /** A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     *  instance to stop handling events for this `Viewer`. */
    unregister: (ViewerId, () => ViewerHandle) => void,

    /** A function which publishes an `Event` to the `InteractionManager` which was registered by
     *  the `register()` function. */
    emitEvent: <E: Event>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Information about the parent of this viewer, if one exists. */
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
        const { view, viewId } = this.props;
        const currId: ViewId = viewId || view.rootId;
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
        const { view, viewId, emitEvent } = this.props;

        // Explicitly specified model for current viewer, or root-level model by default.
        const model: ViewModel = this._getModel();
        if (!model) {
            console.error('Invalid ViewId within View: ', viewId, view);
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
                const { contents } = (model: TextPrimitiveModel);
                return <TextPrimitive {...interactionProps}
                                      {...contents} />;
            }

            case 'ImagePrimitive': {
                const { contents } = (model: ImagePrimitiveModel);
                return <ImagePrimitive {...interactionProps}
                                       {...contents} />;
            }

            // =====================================================================================
            // Layouts

            case 'GridLayout': {
                const { contents } = (model: GridLayoutModel);
                return (
                    <GridLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'FlowLayout': {
                const { contents } = (model: FlowLayoutModel);
                return (
                    <FlowLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'SequenceLayout': {
                const { contents } = (model: SequenceLayoutModel);
                return (
                    <SequenceLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'KeyValueLayout': {
                const { contents } = (model: KeyValueLayoutModel);
                return (
                    <KeyValueLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'SwitchLayout': {
                const { contents } = (model: SwitchLayoutModel);
                return (
                    <SwitchLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            case 'DagLayout': {
                const { contents } = (model: DagLayoutModel);
                return (
                    <DagLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            default: {
                console.error('Unrecognized ViewModel type: ', model.type);
                return null;
            }
        }
    }
}

// TODO: do we need these as props
function consumeInteractions<Config>(
    Component: React.AbstractComponent<Config, Viewer>,
): React.AbstractComponent<Config, Viewer> {
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

function assembleView(
    Component
) {
    return React.forwardRef((props, ref) => (
        <Component
            {...props}
            ref={ref}
            view={props.view instanceof ViewObject ? assemble(props.view) : props.view}
        />
    ));
}

// https://github.com/facebook/react/issues/12397#issuecomment-375501574
const InteractiveViewer = consumeInteractions<ViewerProps>(assembleView(Viewer));

export { InteractiveViewer as Viewer };
