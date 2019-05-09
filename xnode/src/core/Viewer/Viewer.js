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
    DagLayoutModel,
} from '../schema';

// Primitives components
import TextPrimitive from '../primitives/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive';

// Layouts
import GridLayout from '../layouts/GridLayout';
import DagLayout from '../layouts/DagLayout';
import FlowLayout from '../layouts/FlowLayout';
import SwitchLayout from '../layouts/SwitchLayout';

// Interactions
import type {
    Event,
    Constraint,
    ReadOnlyViewerHandle,
    InteractiveViewerHandle,
} from '../interaction';
import { InteractionContext } from '../interaction';


export type ViewerToViewerProps = {
    parent: ReadOnlyViewerHandle,
    view: View,
};

export type InteractionProps = {
    lastEvents: Array<Event>,
    publishEvent: (event: Event) => void,
    viewerHandle: ReadOnlyViewerHandle,
};

/**
 * This smart component parses a Snapshot and assembles a corresponding Viz rendering.
 */
type ViewerProps = {
    /** Specification of View's root model and sub-models.*/
    view: View,

    /** Unique `ViewId` for the `ViewModel` to be rendered by this `Viewer` at the current
     *  level of nesting. If unspecified, the `view.rootId` is used. */
    viewId?: ViewId,

    /** A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     *  instance to begin handling events for this `Viewer`. */
    register: (viewer: InteractiveViewerHandle) => void,

    /** A function to be called when the viewer is mounted, which instructs an `InteractionManager`
     *  instance to stop handling events for this `Viewer`. */
    unregister: (viewer: InteractiveViewerHandle) => void,

    /** A function which publishes an `Event` to the `InteractionManager` which was registered by
     *  the `register()` function. */
    publishEvent: (event: Event) => void,

    /** Information about the parent of this viewer, if one exists. */
    parent?: ReadOnlyViewerHandle,
};

type ViewerState = {
    /** An array of all interaction events that this `Viewer` should consume which occurred since
     * the `Viewer`'s last update. */
    lastEvents: Array<Event>,
};

class Viewer extends React.PureComponent<ViewerProps, ViewerState> {
    guid: string = cuid();

    static defaultProps = {
        register: () => {},
        unregister: () => {},
        publishEvent: () => {},
    };

    constructor(props: ViewerProps) {
        super(props);
        this.state = {
            lastEvents: [],
        };
    }

    componentDidMount() {
        this.props.register(this.getInteractiveHandle());
    }

    componentWillUnmount() {
        this.props.unregister(this.getInteractiveHandle());
    }

    satisfiesConstraints(constraints: Array<Constraint>) {
        return constraints.every((constraint: Constraint) => {
            return constraint(this.getReadOnlyHandle());
        });
    }

    getReadOnlyHandle(): ReadOnlyViewerHandle {
        const { view, viewId, parent } = this.props;
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        return {
            viewerId: this.guid,
            viewModel: model,
            parent,
            satisfiesConstraints: (constraints) => this.satisfiesConstraints(constraints),
        };
    }

    getInteractiveHandle(): InteractiveViewerHandle {
        return {
            ...this.getReadOnlyHandle(),
            receiveEvent: (event) => {
                this.setState((prevState) => ({
                    lastEvents: prevState.lastEvents.concat([event]),
                }));
            },
        };
    }

    componentDidUpdate() {
        if (this.state.lastEvents.length > 0) {
            this.setState({
                lastEvents: [],
            });
        }
    }

    /** Renderer. */
    render() {
        const { view, viewId, publishEvent } = this.props;
        const { lastEvents } = this.state;

        // Explicitly specified model for current viewer, or root-level model by default.
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        if (!model) {
            console.error('Invalid ViewId within View: ', currId, view);
            return null;
        }

        const viewerToViewerProps: ViewerToViewerProps = {
            parent: this.getReadOnlyHandle(),
            view,
        };

        const interactionProps: InteractionProps = {
            publishEvent: (event) => publishEvent(event),
            lastEvents,
            viewerHandle: this.getReadOnlyHandle(),
        };

        // The `Viewer` is the component that knows how to dispatch on model type to render
        // different primitive and layout components.
        switch (model.type) {
            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                const { contents } = (model: TextPrimitiveModel);
                return <TextPrimitive {...interactionProps} {...contents} />;
            }

            case 'ImagePrimitive': {
                const { contents } = (model: ImagePrimitiveModel);
                return <ImagePrimitive {...interactionProps} {...contents} />;
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
            {({ registerViewer, unregisterViewer, publishEvent }) => {
                return (
                    <Component
                        {...props}
                        ref={ref}
                        register={registerViewer}
                        unregister={unregisterViewer}
                        publishEvent={publishEvent}
                    />
                );
            }}
        </InteractionContext.Consumer>
    ));
}

// https://github.com/facebook/react/issues/12397#issuecomment-375501574
export default consumeInteractions<ViewerProps>(Viewer);
