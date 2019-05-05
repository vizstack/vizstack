// @flow
import * as React from 'react';

/** A function which returns `true` iff `viewer` satisfies a particular constraint function. */
import type {
    OnMouseOverEvent,
    OnMouseOutEvent,
    OnClickEvent,
    HighlightEvent,
    UnhighlightEvent,
    IncrementEvent,
    EventMessage,
    Event,
} from './events';
import type { ViewModel } from '../schema';

type SubscriptionHandler<Message: EventMessage> = (
    message: Message,
    subscriber: InteractiveViewerHandle,
    state: InteractionState,
) => void;

/** Describes a function `handler()` which should be executed when an event with name `eventName` triggers. */
export type Subscription<E: Event = Event> = {
    eventName: $PropertyType<E, 'eventName'>,
    handler: SubscriptionHandler<$PropertyType<E, 'message'>>,
};

/** Describes behaviors all Viewers matching a given set of constraints should perform whenever
 * certain events occur.
 *
 * An `InteractionSet` is associated with an `InteractionManager`, and is instantiated with a call
 * to `InteractionManager.getAllComponents()`. On initialization, the `InteractionSet` has no
 * constraints, and thus any subscriptions
 *
 *
 * A typical usage pattern:
 *
 * const manager = new InteractionManager();
 * const selectedComponents = manager
 *                            .getAllComponents()
 *                            .withType("TextPrimitive")...;  // chain any constraints here
 * selectedComponents.subscribe("mouseOver", (subscriber, publisher) => {...});
 * selectedComponents.subscribe("mouseOut", (subscriber, publisher) => {...});
 *
 * Note that `InteractionSet` instances should be created only by a call to
 * `InteractionManager.getAllComponents()`; otherwise, they will not be used by the
 * `InteractionManager` and thus will not affect the behaviors of any Viewer components.
 *
 * Whenever a new constraint is added, a new `InteractionSet` is returned; this allows the following
 * pattern:
 *
 * const textPrimitives = manager.getAllComponents().withType("TextPrimitive");
 * const textPrimitivesWithTag = textPrimitives.withMeta("foo", "bar");
 * textPrimitives.subscribe("mouseOver", handler1);
 * textPrimitivesWithTag.subscribe("mouseOver", handler2);
 *
 * In this example, all `TextPrimitive` viewers trigger `handler1()` on "mouseOver", but only those
 * with the specified metadata tag trigger `handler2()` on "mouseOver".
 *
 * Note that an `InteractionSet` does not pass any of its subscriptions to the new `InteractionSet`
 * returned by a constraint function. This means that the previous example is equivalent to the
 * following:
 *
 * const textPrimitives = manager.getAllComponents().withType("TextPrimitive");
 * textPrimitives.subscribe("mouseOver", handler1);
 * const textPrimitivesWithTag = textPrimitives.withMeta("foo", "bar");  // textPrimitivesWithTag currently has no subscriptions
 * textPrimitivesWithTag.subscribe("mouseOver", handler2);
 *
 * If existing subscriptions were passed to the new `InteractionSet`, then `handler1()` would fire
 * twice whenever a member of `textPrimitivesWithTag` had a "mouseOver" event, since both
 * `textPrimitives` and `textPrimitivesWithTag` would have that subscription.
 * */
class InteractionSet {
    constraints: Array<Constraint>;
    subscriptions: Array<Subscription<>>;
    manager: InteractionManager;

    constructor(manager: InteractionManager, constraints: Array<Constraint>) {
        manager.interactionSets.push(this);
        this.manager = manager;
        this.constraints = constraints;
        this.subscriptions = [];
    }

    /**
     * Returns a new `ComponentCollection` containing only members
     * @param fn
     * @returns {InteractionSet}
     */
    filter(fn: (ReadOnlyViewerHandle) => boolean): InteractionSet {
        return new InteractionSet(this.manager, this.constraints.concat([fn]));
    }

    withParentIn(interactionSet: InteractionSet): InteractionSet {
        return this.filter((viewer: ReadOnlyViewerHandle) => {
            return (
                viewer.parent !== undefined &&
                viewer.parent.satisfiesConstraints(interactionSet.constraints)
            );
        });
    }

    /**
     * Returns a new `ComponentCollection` containing only members of the specified type(s).
     *
     * @param type
     */
    withType(
        type: $PropertyType<ViewModel, 'type'> | Array<$PropertyType<ViewModel, 'type'>>,
    ): InteractionSet {
        return this.filter((viewer: ReadOnlyViewerHandle) => {
            return Array.isArray(type)
                ? type.includes(viewer.viewModel.type)
                : type === viewer.viewModel.type;
        });
    }

    /**
     * Returns a new `ComponentCollection` containing only members whose value for the given metadata key falls in the
     * given value(s).
     *
     * @param key
     * @param value
     */
    withMeta(key: string, value: string | number | Array<string | number>): InteractionSet {
        return this.filter((viewer: ReadOnlyViewerHandle) => {
            return Array.isArray(value)
                ? value.includes(viewer.viewModel.meta[key])
                : value === viewer.viewModel.meta[key];
        });
    }

    // TODO: figure out how to write this such that the handler message knows what its contents are given the event name
    subscribe<E: Event>(
        eventName: $PropertyType<E, 'eventName'>,
        handler: SubscriptionHandler<$PropertyType<E, 'message'>>,
    ): void {
        this.subscriptions.push({
            eventName,
            handler,
        });
    }
}

export type InteractionState = {
    [string]: any,
};

export class InteractionManager {
    interactionSets: Array<InteractionSet> = [];
    viewers: { [string]: InteractiveViewerHandle } = {};
    viewerInteractionSets: { [string]: Array<InteractionSet> } = {};
    state: InteractionState = {};

    constructor() {
        this.publish = this.publish.bind(this);
        this.registerViewer = this.registerViewer.bind(this);
        this.unregisterViewer = this.unregisterViewer.bind(this);

        this._addDefaultInteractions();
    }

    _addDefaultInteractions(): void {
        const allViewers = this.getAllComponents();
        allViewers.subscribe<OnMouseOverEvent>('onMouseOver', (message, subscriber) => {
            if (subscriber.viewerId === message.publisher.viewerId) {
                this.publish<HighlightEvent>({
                    eventName: 'highlight',
                    message: { viewerId: subscriber.viewerId },
                });
            }
        });
        allViewers.subscribe<OnMouseOutEvent>('onMouseOut', (message, subscriber) => {
            if (subscriber.viewerId === message.publisher.viewerId) {
                this.publish<UnhighlightEvent>({
                    eventName: 'unhighlight',
                    message: { viewerId: subscriber.viewerId },
                });
            }
        });
        allViewers
            .withType('SwitchLayout')
            .subscribe<OnClickEvent>('onClick', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<IncrementEvent>({
                        eventName: 'increment',
                        message: { viewerId: subscriber.viewerId },
                    });
                }
            });
    }

    registerViewer = (viewer: InteractiveViewerHandle) => {
        this.viewers[viewer.viewerId] = viewer;
        this.viewerInteractionSets[viewer.viewerId] = this.interactionSets.filter(
            ({ constraints }) => viewer.satisfiesConstraints(constraints),
        );
    };

    unregisterViewer = (viewer: InteractiveViewerHandle) => {
        delete this.viewers[viewer.viewerId];
        delete this.viewerInteractionSets[viewer.viewerId];
    };

    publish: <E: Event>(event: E) => void = <E: Event>(event: E) => {
        Object.entries(this.viewerInteractionSets).forEach(([viewerId, interactionSets]) => {
            // interactionSets will always be an array of InteractionSets, but flow is too dumb to use the type hint for
            // this.viewerInteractionSets when calling Object.entries
            // (https://stackoverflow.com/questions/45621837/flowtype-errors-using-object-entries)
            if (!Array.isArray(interactionSets)) throw new Error();
            interactionSets.forEach((interactionSet) => {
                if (!(interactionSet instanceof InteractionSet)) throw new Error();
                interactionSet.subscriptions
                    .filter((subscription) => subscription.eventName === event.eventName)
                    .forEach((subscription) => {
                        if (subscription.eventName === event.eventName) {
                            subscription.handler(event.message, this.viewers[viewerId], this.state);
                        }
                    });
            });
        });
        if (event.message.viewerId !== undefined && event.message.viewerId in this.viewers) {
            this.viewers[event.message.viewerId].receiveEvent(event);
        }
    };

    getAllComponents(): InteractionSet {
        return new InteractionSet(this, []);
    }

    getContext(): InteractionContextValue {
        const { registerViewer, unregisterViewer, publish } = this;
        return {
            registerViewer,
            unregisterViewer,
            publishEvent: publish,
        };
    }
}

export const InteractionContext = React.createContext<InteractionContextValue>({
    // interactions: [],
    registerViewer: (viewer) => {},
    unregisterViewer: (viewer) => {},
    publishEvent: (event: Event) => {},
});

export type InteractionContextValue = {
    // interactions: Array<InteractionSpec>,
    registerViewer: (viewer: InteractiveViewerHandle) => void,
    unregisterViewer: (viewer: InteractiveViewerHandle) => void,
    publishEvent: (event: Event) => void,
};

export type Constraint = (viewer: ReadOnlyViewerHandle) => boolean;

type ViewerInfo = {|
    viewerId: string,
    viewModel: ViewModel,
    parent?: ReadOnlyViewerHandle,
|};

export type ReadOnlyViewerHandle = {|
    // See https://github.com/facebook/flow/issues/3534 for why we need to use $Exact<>
    ...ViewerInfo,
    satisfiesConstraints: (Array<Constraint>) => boolean,
|};

export type InteractiveViewerHandle = {|
    // See https://github.com/facebook/flow/issues/3534 for why we need to use $Exact<>
    ...ReadOnlyViewerHandle,
    receiveEvent: (Event) => void,
|};
