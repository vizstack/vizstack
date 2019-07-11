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

// Primitives components
import TextPrimitive from '../primitives/TextPrimitive';
// import ImagePrimitive from '../primitives/ImagePrimitive';

// Layout components
// import GridLayout from '../layouts/GridLayout';
// import DagLayout from '../layouts/DagLayout';
// import FlowLayout from '../layouts/FlowLayout';
// import SequenceLayout from '../layouts/SequenceLayout';
import SwitchLayout from '../layouts/SwitchLayout';
// import KeyValueLayout from '../layouts/KeyValueLayout';

// Interactions
import { Event, ViewerHandle, ViewerId, FragmentHandle } from '../interaction';
import { InteractionContext } from '../interaction';

export type ViewerToViewerProps = {
    view: View,
    parent: ViewerHandle,
    name: string,
};

export type InteractionProps = {
    /* The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /* Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be invoken whenever the Fragment component updates. */
    updateHandle: (handle: FragmentHandle) => void,

    /* Publishes an event to the `InteractionManager`. */
    emitEvent: (topic: string, message: Record<string, any>) => void,  
};

export type ViewerProps = {
    /* Specification of View's root fragment and sub-fragments. */
    view: View,

    /* Unique `FragmentId` for the `Fragment` to be rendered by this `Viewer` at the current
     * level of nesting. If unspecified, the `view.rootId` is used. */
    fragmentId?: FragmentId,

    /* Unique name for the `Viewer`, defined for the root and propagated to any sub-Viewers. */
    name?: string,

    /* Information about the parent of this viewer, if one exists. */
    parent?: ViewerHandle,

    /* Provided by parent or generated if root. */
    viewerId?: ViewerId,
};

type ViewerState = {};

class Viewer extends React.PureComponent<ViewerProps, ViewerState> {
    static contextType = InteractionContext;
    context!: React.ContextType<typeof InteractionContext>;

    /* Unique `ViewerId` correponding to this `Viewer`. */
    viewerId: ViewerId;
    
    /* Handle of the `Fragment` component that this `Viewer` renders. */
    fragmentHandle = {};

    constructor(props: ViewerProps) {
        super(props);
        this.viewerId = this.props.viewerId || cuid();
    }

    componentDidMount() {
        this.context.registerViewer(this.viewerId, () => this._getHandle());
    }

    componentWillUnmount() {
        this.context.unregisterViewer(this.viewerId);
    }

    private _getFragment() {
        const { view, fragmentId } = this.props;
        const currId: FragmentId = fragmentId || view.rootId;
        return view.fragments[currId];
    }

    private _getHandle(): ViewerHandle {
        const { parent } = this.props;
        return {
            id: this.viewerId,
            fragment: this._getFragment(),
            parent,
            ...this.fragmentHandle,
        };
    }

    render() {
        const { view, fragmentId, name } = this.props;
        const { emitEvent } = this.context;

        // Explicitly specified fragment for current viewer, or root-level fragment by default.
        const fragment: Fragment = this._getFragment();
        if (!fragment) {
            console.error('Invalid FragmentId within View: ', fragmentId, view);
            return null;
        }

        const viewerToViewerProps: ViewerToViewerProps = {
            parent: this._getHandle(),
            view,
            name: name || this.viewerId,
        };

        const interactionProps: InteractionProps = {
            viewerId: this.viewerId,
            emitEvent: (topic, message) => emitEvent(topic, message),
            updateHandle: (handle) => this.fragmentHandle = handle,
        };

        // The `Viewer` is the component that knows how to dispatch on fragment type to render
        // different primitive and layout components.
        switch (fragment.type) {

            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                const { contents } = fragment;
                return <TextPrimitive {...interactionProps} {...contents} />;
            }

            // case 'ImagePrimitive': {
            //     const { contents } = fragment;
            //     return <ImagePrimitive {...interactionProps} {...contents} />;
            // }

            // =====================================================================================
            // Layouts

            // case 'GridLayout': {
            //     const { contents } = fragment;
            //     return (
            //         <GridLayout
            //             viewerToViewerProps={viewerToViewerProps}
            //             {...interactionProps}
            //             {...contents}
            //         />
            //     );
            // }

            // case 'FlowLayout': {
            //     const { contents } = fragment;
            //     return (
            //         <FlowLayout
            //             viewerToViewerProps={viewerToViewerProps}
            //             {...interactionProps}
            //             {...contents}
            //         />
            //     );
            // }

            // case 'SequenceLayout': {
            //     const { contents } = fragment;
            //     return (
            //         <SequenceLayout
            //             viewerToViewerProps={viewerToViewerProps}
            //             {...interactionProps}
            //             {...contents}
            //         />
            //     );
            // }

            // case 'KeyValueLayout': {
            //     const { contents } = fragment;
            //     return (
            //         <KeyValueLayout
            //             viewerToViewerProps={viewerToViewerProps}
            //             {...interactionProps}
            //             {...contents}
            //         />
            //     );
            // }

            case 'SwitchLayout': {
                const { contents } = fragment;
                return (
                    <SwitchLayout
                        viewerToViewerProps={viewerToViewerProps}
                        {...interactionProps}
                        {...contents}
                    />
                );
            }

            // case 'DagLayout': {
            //     const { contents } = fragment;
            //     return (
            //         <DagLayout
            //             viewerToViewerProps={viewerToViewerProps}
            //             {...interactionProps}
            //             {...contents}
            //         />
            //     );
            // }

            default: {
                console.error(`Unknown Fragment type "${(fragment as any).type}" passed to Viewer ${this.viewerId}`);
                return null;
            }
        }
    }
}

export { Viewer };
