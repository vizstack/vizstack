import * as React from 'react';
import cuid from 'cuid';

import Button from '@material-ui/core/Button';

import { FragmentId, Fragment, View } from '@vizstack/schema';

// Primitives components
import TextPrimitive from '../primitives/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive';

// Layout components
import FlowLayout from '../layouts/FlowLayout';
import SwitchLayout from '../layouts/SwitchLayout';
import GridLayout from '../layouts/GridLayout';
import SequenceLayout from '../layouts/SequenceLayout';
import KeyValueLayout from '../layouts/KeyValueLayout';
import DagLayout from '../layouts/DagLayout';

// Interactions
import {
    ViewerId,
    ViewerHandle,
    FragmentHandle,
    InteractionContext,
    InteractionContextValue,
    ViewerDidMouseEvent,
    ViewerDidChangeLightEvent,
 } from '../interaction';


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
    /* Unique `ViewerId` for the parent `Viewer`, if one exists. */
    parentId?: ViewerId,
};

// Private props that are passed from one `Viewer` to the next sub-`Viewer`.
type PassdownProps =
    Pick<ViewerProps, 'view' | 'name'> &
    Pick<ViewerInteractionProps, 'parentId'>;

// Private props that enable a Fragment component to respond to interactions.
type FragmentInteractionProps = {

    /* The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /* Publishes an event to the `InteractionManager`. */
    emit: InteractionContextValue['emit'],  
    
    /* Mouse handlers to place on React component that will trigger the general "Viewer.Did[*]"
     * events. */
    mouseHandlers: {
        onClick: (e: React.SyntheticEvent) => void,
        onDoubleClick: (e: React.SyntheticEvent) => void,
        onMouseOver: (e: React.SyntheticEvent) => void,
        onMouseOut: (e: React.SyntheticEvent) => void,
    },
};

export type FragmentProps<T extends Fragment> = {
    interactions: FragmentInteractionProps,
    passdown: PassdownProps,
    light: 'normal' | 'highlight' | 'lowlight' | 'selected',
} & T['contents'];

type ViewerState = {
    /* Whether the `Viewer` should show its `Fragment` if doing so would create a cycle. */
    bypassedCycle: boolean,

    /* How pronounced the`Viewer` appears as a result of interactions. */
    light: 'normal' | 'highlight' | 'lowlight' | 'selected',
};

class Viewer extends React.PureComponent<ViewerProps & ViewerInteractionProps, ViewerState> {
    static contextType = InteractionContext;
    context!: React.ContextType<typeof InteractionContext>;

    /* Unique `ViewerId` correponding to this `Viewer`. */
    public viewerId: ViewerId;
    
    /* Ref to the `Fragment` component that this `Viewer` renders. The specific component used
     * is determined at runtime, so the `any` workaround is needed. */
    private _childFragmentRef = React.createRef<any>();

    constructor(props: ViewerProps & ViewerInteractionProps) {
        super(props);
        this.state = {
            bypassedCycle: false,
            light: 'normal',
        };
        this.viewerId = cuid();
    }

    componentDidMount() {
        this.context.registerViewer(this.viewerId, () => this._getHandle());
    }

    componentWillUnmount() {
        this.context.unregisterViewer(this.viewerId);
    }

    componentDidUpdate(prevProps: any, prevState: ViewerState) {
        const { light } = this.state;
        const { emit } = this.context;
        const viewerId = this.viewerId;
        if (light !== prevState.light) {
            emit<ViewerDidChangeLightEvent>('Viewer.DidChangeLight', { viewerId, light });
        }
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
        const { parentId } = this.props;
        const { light } = this.state;
        const fragment = this._getFragment();
        return {
            viewerId: this.viewerId,
            parentId,
            fragmentId: this._getFragmentId(),
            meta: fragment.meta,
            appearance: {
                light,
                doSetLight: (l) => this.setState({ light: l }),
            },
            type: fragment.type,
            contents: fragment.contents,
            state: this._childFragmentRef.current!.getHandle(),
        };
    }

    /**
     * Returns `true` if this `Viewer` is rendering the same `Fragment` as one of its ancestors.
     * @returns {boolean}
     * @private
     */
    private _isCycle(): boolean {
        // let { parentHandle: parent } = this.props;
        // const fragmentId = this._getFragmentId();
        // while (parent) {
        //     if (parent.fragmentId === fragmentId) {
        //         return true;
        //     }
        //     parent = parent.parent;
        // }
        return false;
    }

    render() {
        const { view, fragmentId, name } = this.props;
        const { emit } = this.context;
        const { bypassedCycle, light } = this.state;
        const viewerId = this.viewerId;

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
            name: name || viewerId,
            parentId: viewerId,
        };

        const interactions: FragmentInteractionProps = {
            viewerId,
            emit,
            mouseHandlers: {
                onClick: (e) => {
                    e.stopPropagation();
                    emit<ViewerDidMouseEvent>('Viewer.DidClick', { viewerId });
                },
                onDoubleClick: (e) => {
                    e.stopPropagation();
                    emit<ViewerDidMouseEvent>('Viewer.DidDoubleClick', { viewerId });
                },
                onMouseOver: (e) => {
                    e.stopPropagation();
                    emit<ViewerDidMouseEvent>('Viewer.DidMouseOver', { viewerId });
                },
                onMouseOut: (e) => {
                    e.stopPropagation();
                    emit<ViewerDidMouseEvent>('Viewer.DidMouseOut', { viewerId });
                },
            }
        };

        const props: any = {
            ref: this._childFragmentRef,
            interactions,
            passdown,
            light,
            ...fragment.contents,
        };

        // The `Viewer` is the component that knows how to dispatch on fragment type to render
        // different primitive and layout components.
        switch (fragment.type) {

            // =====================================================================================
            // Primitives

            case 'TextPrimitive': {
                return <TextPrimitive {...props} />;
            }

            case 'ImagePrimitive': {
                return <ImagePrimitive {...props} />;
            }

            // =====================================================================================
            // Layouts
            
            case 'FlowLayout': {
                return <FlowLayout {...props} />;
            }

            case 'SwitchLayout': {
                return <SwitchLayout {...props} />;
            }

            case 'GridLayout': {
                return <GridLayout {...props} />;
            }

            case 'SequenceLayout': {
                return <SequenceLayout {...props} />;
            }

            case 'KeyValueLayout': {
                return <KeyValueLayout {...props} />;
            }

            case 'DagLayout': {
                return <DagLayout {...props} />;
            }

            default: {
                console.error(`Unknown Fragment type "${(fragment as any).type}" passed to Viewer ${this.viewerId}`);
                return null;
            }
        }
    }
}

export { Viewer };
