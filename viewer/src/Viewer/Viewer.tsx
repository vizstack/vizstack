import * as React from 'react';
import cuid from 'cuid';

import Button from '@material-ui/core/Button';
import { FragmentId, Fragment, View } from '@vizstack/schema';
import { FragmentAssembler, assemble } from '@vizstack/js';

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
    InteractionContext,
    InteractionContextValue,
    ViewerDidMouseEvent,
    ViewerDidChangeLightEvent,
 } from '../interaction';

// TODO: Add way for user to confine selection to a particular root `Viewer` and its descendants.

// All props that a `Viewer` receives.
type ViewerProps = {
    /** Specification of View's root fragment and sub-fragments. */
    view: View,

    /** Unique `FragmentId` for the `Fragment` to be rendered by this `Viewer` at the current
     * level of nesting. */
    fragmentId: FragmentId,

    /** Unique `ViewerId` for the parent `Viewer`, if one exists. */
    parentId?: ViewerId,
};

// Props that are passed from one `Viewer` to the next sub-`Viewer`.
type ViewerPassdownProps = Pick<ViewerProps, 'view' | 'parentId'>;

// Props that enable a Fragment component to respond to interactions.
type FragmentInteractionProps = {
    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Publishes an event to the `InteractionManager`. */
    emit: InteractionContextValue['emit'],  
    
    /** Mouse handlers to place on React component that will trigger the general "Viewer.Did[*]"
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
    passdown: ViewerPassdownProps,
    light: 'normal' | 'highlight' | 'lowlight' | 'selected',
} & T['contents'];

type ViewerState = {
    /** Whether the `Viewer` should show its `Fragment` if doing so would create a cycle. */
    bypassedCycle: boolean,

    /** How pronounced the `Viewer` appears as a result of interactions. */
    light: 'normal' | 'highlight' | 'lowlight' | 'selected',
};

class Viewer extends React.PureComponent<ViewerProps, ViewerState> {
    static contextType = InteractionContext;
    context!: React.ContextType<typeof InteractionContext>;

    /** Unique `ViewerId` correponding to this `Viewer`. */
    public viewerId: ViewerId;
    
    /** Ref to the `Fragment` component that this `Viewer` renders. The specific component used
     * is determined at runtime, so the `any` workaround is needed. */
    private _childFragmentRef = React.createRef<any>();

    constructor(props: ViewerProps) {
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
            type: fragment.type as any,
            contents: fragment.contents as any,
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
        const { view, fragmentId } = this.props;
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

        const passdown: ViewerPassdownProps = {
            view,
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

type ViewerRootProps = {
    view: View | FragmentAssembler,
    fragmentId?: FragmentId,
};

/**
 * A `Viewer` is used to render a `View`, conforming to the schema in `@vizstack/schema`, which has
 * been constructed manually or produced through language bindings. For convenience, it is
 * possible to pass the `@vizstack/js` bindings directly to the `Viewer`. 
 * @example
 * ```
 * // JS-bindings input
 * <Viewer view={Text('Hello, world!')} />
 * 
 * // Schema input
 * <Viewer view={{
 *     rootId: 'root',
 *     fragments: {
 *       root: {
 *         type: 'TextPrimitive',
 *         contents: { text: 'Hello, world!' },
 *         meta: {},
 *       }
 *     }
 *   }} />
 * ```
 */
class ViewerRoot extends React.PureComponent<ViewerRootProps> {
    render() {
        const { view, fragmentId } = this.props;
        const schematized: View = view instanceof FragmentAssembler ? assemble(view) : view;
        return (
            <Viewer view={schematized} fragmentId={fragmentId || schematized.rootId}/>
        )
    }
}

export { Viewer, ViewerRoot };
