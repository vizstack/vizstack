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

// Primitives
import TextPrimitive from '../primitives/TextPrimitive/TextPrimitive';
import ImagePrimitive from '../primitives/ImagePrimitive/index';

// Layouts
import GridLayout from '../layouts/GridLayout/GridLayout';
import DagLayout from '../layouts/DagLayout/index';
import FlowLayout from '../layouts/FlowLayout/FlowLayout';

// Interactions
import type { Event, InteractionSpec, Constraint, Subscription, ReadOnlyView, InteractiveView, InteractionManager } from '../interaction';
import { InteractionContext } from '../interaction';

export type ViewerProps = {};

type Props = {
    /** Specification of View's root model and sub-models.*/
    view: View,

    /** Unique `ViewId` for the `ViewModel` to be rendered by this `Viewer` at the current
     *  level of nesting. If unspecified, the `rootId` from `viewSpec` is used. */
    viewId?: ViewId,

    lastEvent?: Event,
    interactions: Array<InteractionSpec>,
    publishEvent: (eventName: string, publisher: InteractiveView) => void,

    /** Mouse interactions. TODO: determine if these should be kept with the new interaction manager. */
    onClick?: () => void,
    onMouseOver?: () => void,
    onMouseOut?: () => void,
}

type State = {
    /** Whether the current component is hovered. TODO: Clarify. */
    isHovered: boolean,
}

/**
 * This smart component parses a Snapshot and assembles a corresponding Viz rendering.
 */
class Viewer extends React.Component<Props, State> {
    interactionSpecs: Array<InteractionSpec> = [];
    guid: string = cuid();

    static defaultProps = {
        interactions: [],
        publishEvent: (eventName, publisher) => {},
    };

    /**
     * Constructor.
     * @param props
     */
    constructor(props: Props) {
        super(props);
        this.state = Immutable({
            isHovered: false,
        });
        this.updateCollectionMemberships();
    }

    satisfiesSpec(constraints: Array<Constraint>) {
        const { view, viewId } = this.props;
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        return constraints.every((constraint: Constraint, i) => {
            switch (constraint.type) {
                case "type": {
                    return constraint.includedTypes.includes(model.type);
                }
                case "meta": {
                    return constraint.includedValues.includes(model.meta[constraint.key]);
                }
                case "filter": {
                    return constraint.fn(this.getReadOnlyInterface());
                }
                default: {
                    return true;
                }
            }
        });
    }

    updateCollectionMemberships() {
        const { interactions } = this.props;
        this.interactionSpecs = interactions.filter((interaction) => {
            return this.satisfiesSpec(interaction.constraints);
        });
    }

    getReadOnlyInterface(): ReadOnlyView {
        const { view, viewId } = this.props;
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        const { type, meta, contents } = model;
        return {
            guid: this.guid,
            type,
            meta,
            contents,
        };
    }

    getInteractiveInterface(): InteractiveView {
        const { view, viewId } = this.props;
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        const { type, meta, contents } = model;
        return {
            guid: this.guid,
            type,
            meta,
            contents,
            highlight: () => this.setState({isHovered: true}),
            lowlight: () => this.setState({isHovered: false}),
        };
    }

    consumeEvent(event: Event): void {
        console.debug(this.guid, 'consuming event', event);
        this.interactionSpecs.forEach((interaction: InteractionSpec) => {
            interaction.subscriptions.filter((subscription: Subscription) => {
                return event.name === subscription.eventName;
            })
            .forEach((subscription: Subscription) => {
                subscription.handler(this.getInteractiveInterface(), event.caller);
            });
        });
    }

    componentDidUpdate(prevProps: Props, prevState: State): void {
        const { lastEvent, interactions } = this.props;
        if (prevProps.interactions !== interactions && interactions !== undefined) {
            this.updateCollectionMemberships();
        }
        if (prevProps.lastEvent !== lastEvent && lastEvent !== undefined) {
            this.consumeEvent(lastEvent);
        }
    }

    // TODO: add meta to backend

    /** Renderer. */
    render() {
        const { view, viewId } = this.props;
        const { onClick, onMouseOver, onMouseOut } = this.props;
        const { publishEvent } = this.props;
        const { isHovered } = this.state;

        // Explicitly specified model for current viewer, or root-level model by default.
        const currId: ViewId = viewId || view.rootId;
        const model: ViewModel = view.models[currId];
        if (!model) {
            console.error('Invalid ViewId within View: ', currId, view);
            return null;
        }

        const mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                // if (onClick) onClick();
                publishEvent('click', this.getInteractiveInterface());
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                // this.setState((state) => Immutable(state).set('isHovered', true));
                // if (onMouseOver) onMouseOver();
                publishEvent('mouseOver', this.getInteractiveInterface());
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                // this.setState((state) => Immutable(state).set('isHovered', false));
                // if (onMouseOut) onMouseOut();
                publishEvent('mouseOut', this.getInteractiveInterface());
            },
        };
        const generalProps = {
            mouseProps,
            isHovered,
        }; // The `Viewer` is the component that knows how to dispatch on model type to render
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

// class Fucker extends React.Component {
//     render() {
//         console.log('fucker render');
//         return (
//             <InteractionContext.Consumer>
//                 {context => {
//                     const { lastEvent, interactions, publishEvent } = context;
//                     console.log(lastEvent);
//                     return (
//                         <Viewer {...this.props}
//                                    lastEvent={lastEvent} interactions={interactions} publishEvent={publishEvent}/>
//                     );
//                 }}
//             </InteractionContext.Consumer>
//         )
//     }
// }



// export default React.forwardRef((props, ref) => (
//     <InteractionContext.Consumer>
//         {({lastEvent, interactions, publishEvent}) => {
//             console.log(lastEvent);
//             return (
//                 <Viewer {...props} ref={ref}
//                            lastEvent={lastEvent} interactions={interactions} publishEvent={publishEvent}/>
//             );
//         }}
//     </InteractionContext.Consumer>
// ));

function consumeInteractions<Config>(Component: React.AbstractComponent<Config, Viewer>): React.AbstractComponent<Config, Viewer> {
    return React.forwardRef<Config, Viewer>((props, ref) => (
        <InteractionContext.Consumer>
            {({lastEvent, interactions, publishEvent}) => {
                return (
                    <Component {...props} ref={ref}
                               lastEvent={lastEvent} interactions={interactions} publishEvent={publishEvent}/>
                );
            }}
        </InteractionContext.Consumer>
    ))
}

// https://github.com/facebook/react/issues/12397#issuecomment-375501574
export default consumeInteractions<Props>(Viewer);
// export default Fucker;
// export default Fucker;