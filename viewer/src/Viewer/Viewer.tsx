import * as React from 'react';
import Immutable from 'seamless-immutable';

import cuid from 'cuid';

import Button from '@material-ui/core/Button';

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
import { ViewerId, ViewerHandle, FragmentHandle } from '../interaction';
import { InteractionContext } from '../interaction';


/** Public API for interacting with a `Viewer`. */
export type ViewerProps = {
    /* Specification of View's root fragment and sub-fragments. */
    view: View,

    /* Unique `FragmentId` for the `Fragment` to be rendered by this `Viewer` at the current
     * level of nesting. If unspecified, the `view.rootId` is used. */
    fragmentId?: FragmentId,

    /* Unique name for the root `Viewer`, passed down to any nested `Viewer`. */
    name?: string,
};

// Private props that enable a `Viewer` to respond to interactions.
type ViewerInteractionProps = {

    /* Information about the parent of this `Viewer`, if one exists. */
    parentHandle?: ViewerHandle,
     
    /* Called on mount; provides to the parent layout (if any) a factory which returns this
    `Viewer`'s current handle. This factory is called whenever the layout needs to add information
    about this `Viewer` to its own `FragmentHandle`. */
    registerViewerHandleFactory?: (factory: () => ViewerHandle) => void,
};

// Private props that are passed from one `Viewer` to the next sub-`Viewer`.
type ViewerPassdownProps = Pick<ViewerProps, 'view' | 'name'>;
type ViewerInteractionPassdownProps = Pick<ViewerInteractionProps, 'parentHandle'>;
type PassdownProps = ViewerPassdownProps & ViewerInteractionPassdownProps;

// Private props that enable a Fragment component to respond to interactions.
type FragmentInteractionProps = {

    /* The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /* Called on mount; provides to the `Viewer` a factory which returns a `FragmentHandle` with the
     * current state of the rendered fragment. This factory is called whenever the `Viewer` creates
     * its `ViewerHandle` so that information about the fragment can be added to it. */
    registerFragmentHandleFactory: (factory: () => FragmentHandle) => void,

    /* Publishes an event to the `InteractionManager`. */
    emitEvent: (topic: string, message: Record<string, any>) => void,  
};

export type FragmentProps<T extends Fragment> = {
    interactions: FragmentInteractionProps,
    passdown: PassdownProps,
} & T['contents'];

type ViewerState = {
    /* Whether the `Viewer` should show its `Fragment` if doing so would create a cycle. */
    bypassedCycle: boolean,
};

class Viewer extends React.PureComponent<ViewerProps & ViewerInteractionProps, ViewerState> {
    static contextType = InteractionContext;
    context!: React.ContextType<typeof InteractionContext>;

    /* Unique `ViewerId` correponding to this `Viewer`. */
    viewerId: ViewerId;
    
    /* Handle of the `Fragment` component that this `Viewer` renders. */
    fragmentHandleFactory = () => ({});

    constructor(props: ViewerProps & ViewerInteractionProps) {
        super(props);
        this.state = {
            bypassedCycle: false
        };
        this.viewerId = cuid();
    }

    componentDidMount() {
        this.context.registerViewer(this.viewerId, () => this._getHandle());
        if (this.props.registerViewerHandleFactory) {
            this.props.registerViewerHandleFactory(() => this._getHandle());
        }
    }

    componentWillUnmount() {
        this.context.unregisterViewer(this.viewerId);
    }

    private _getFragmentId() {
        const { view, fragmentId } = this.props;
        return fragmentId || view.rootId;
    }

    private _getFragment() {
        const { view } = this.props;
        return view.fragments[this._getFragmentId()];
    }

    private _getHandle(): ViewerHandle {
        const { parentHandle } = this.props;
        return {
            id: this.viewerId,
            fragment: this._getFragment(),
            fragmentId: this._getFragmentId(),
            parent: parentHandle,
            ...this.fragmentHandleFactory(),
        };
    }

    /**
     * Returns `true` if this `Viewer` is rendering the same `Fragment` as one of its ancestors.
     * @returns {boolean}
     * @private
     */
    private _isCycle(): boolean {
        let { parentHandle: parent } = this.props;
        const fragmentId = this._getFragmentId();
        while (parent) {
            if (parent.fragmentId === fragmentId) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    render() {
        const { view, fragmentId, name } = this.props;
        const { emit } = this.context;
        const { bypassedCycle } = this.state;

        // Explicitly specified fragment for current viewer, or root-level fragment by default.
        const fragment: Fragment = this._getFragment();
        if (!fragment) {
            console.error('Invalid FragmentId within View: ', fragmentId, view);
            return null;
        }

        if (this._isCycle() && !bypassedCycle) {
            // TODO: once we can compile and test stuff, make this button pretty
            return (
                <Button onClick={() => this.setState({bypassedCycle: true})}>
                    ...
                </Button>
            )
        }

        const passdown: PassdownProps = {
            view,
            name: name || this.viewerId,
            parentHandle: this._getHandle(),
        };

        const interactions: FragmentInteractionProps = {
            viewerId: this.viewerId,
            registerFragmentHandleFactory: (factory) => this.fragmentHandleFactory = factory,
            emitEvent: (topic, message) => emit(topic, message),
        };

        // The `Viewer` is the component that knows how to dispatch on fragment type to render
        // different primitive and layout components.
        switch (fragment.type) {

            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                return <TextPrimitive {...{ interactions, passdown, ...fragment.contents }} />;
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
                return <SwitchLayout {...{ interactions, passdown, ...fragment.contents }} />;
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
