// @flow
import type { ViewType, ViewContents, ViewMeta } from './schema';

import * as React from 'react';

/** A function which returns `true` iff `view` satisfies a particular constraint function. */
export type Constraint = (view: ViewerHandle) => boolean;

/** The acceptable types in a JSON object. */
type Json = string | number | { [string]: Json } | Array<Json>;

/** Describes a function `handler()` which should be executed when an event with name `eventName` triggers. */
export type Subscription = {
    eventName: string,
    handler: (
        message: InteractionMessage,
        subscriber: ViewerHandle,
        publisher: ViewerHandle,
    ) => void,
};

export type InteractionMessage = {
    [string]: any,
};

/** Describes the event `subscriptions` that views satisfying `constraints` should have.
 *
 * `InteractionSet` instances should be created only by a call to `InteractionManager.getAllComponents()`; otherwise,
 * they will not be used by the `InteractionManager` and thus will not affect the behaviors of any Viewer components.
 *
 * A typical use pattern:
 *
 * const manager = new InteractionManager();
 * const selectedComponents = manager.getAllComponents().withType("TextPrimitive")...;  // chain any constraints here
 * selectedComponents.subscribe("mouseOver", (subscriber, publisher) => {...});
 * selectedComponents.subscribe("mouseOut", (subscriber, publisher) => {...});
 *
 * We have consciously decided that `subscribe()`, unlike the constraint methods, should not return the `InteractionSet`
 * instance, thus disallowing chaining of `subscribe()` calls. This prevents misleading chains from occurring. Consider
 * the following chain:
 *
 * manager.getAllComponents().subscribe("event1", ...).withType("TextPrimitive").subscribe("event2", ...);
 *
 * In this chain, it is not clear which components are subscribed to each event. One reasonable interpretation is that
 * order matters, and that all components are therefore subscribed to "event1" but only TextPrimitives are subscribed to
 * "event2". Another reasonable interpretation is that order does not matter, and only TextPrimitivies are subscribed to
 * both events. Preventing `subscribe()` chains disallows this ambiguity.
 * */
class InteractionSet {
    constraints: Array<Constraint>;
    subscriptions: Array<Subscription>;

    constructor(constraints: Array<Constraint> = [], subscriptions: Array<Subscription> = []) {
        this.constraints = constraints;
        this.subscriptions = subscriptions;
    }

    /**
     * Returns a new `ComponentCollection` containing only members
     * @param fn
     * @returns {InteractionSet}
     */
    filter(fn: (ViewerHandle) => boolean): InteractionSet {
        this.constraints.push(fn);
        return new InteractionSet(this.constraints.concat([fn]), this.subscriptions.slice());
    }

    withParentIn(interactionSet: InteractionSet): InteractionSet {
        return this.filter((viewer: ViewerHandle) => {
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
    withType(type: ViewType | Array<ViewType>): InteractionSet {
        return this.filter((viewer: ViewerHandle) => {
            return Array.isArray(type) ? type.includes(viewer.type) : type === viewer.type;
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
        return this.filter((viewer: ViewerHandle) => {
            return Array.isArray(value)
                ? value.includes(viewer.meta[key])
                : value === viewer.meta[key];
        });
    }

    subscribe(
        eventName: string,
        handler: (
            message: InteractionMessage,
            subscriber: ViewerHandle,
            publisher: ViewerHandle,
        ) => void,
    ): void {
        this.subscriptions.push({
            eventName,
            handler,
        });
    }
}

export type InteractionSpec = {
    constraints: Array<Constraint>,
    subscriptions: Array<Subscription>,
};

// TODO: separate into "interactive" and "non-interactive"
export type ViewerHandle = {
    viewerId: string,
    // TODO: re-pack the view fields
    type: ViewType,
    meta: ViewMeta,
    contents: ViewContents,
    parent?: ViewerHandle,
    satisfiesConstraints: (Array<Constraint>) => boolean,
    receiveEvent: (Event) => void,
};

export type Event = {
    eventName: string,
    message: InteractionMessage,
    publisher: ViewerHandle,
};

export class InteractionManager {
    interactionSets: Array<InteractionSet> = [];
    viewers: { [string]: ViewerHandle } = {};
    viewerInteractionSets: { [string]: Array<InteractionSet> } = {};

    constructor() {
        this.publish = this.publish.bind(this);
        this.registerViewer = this.registerViewer.bind(this);
        this.unregisterViewer = this.unregisterViewer.bind(this);

        this._addDefaultInteractions();
    }

    _addDefaultInteractions(): void {
        const allViewers = this.getAllComponents();
        allViewers.subscribe('mouseOver', (message, subscriber, publisher) => {
            if (subscriber.viewerId === publisher.viewerId) {
                this.publish('hover', { viewerId: subscriber.viewerId }, publisher);
            }
        });
        allViewers.subscribe('mouseOut', (message, subscriber, publisher) => {
            if (subscriber.viewerId === publisher.viewerId) {
                this.publish('unhover', { viewerId: subscriber.viewerId }, publisher);
            }
        });
    }

    registerViewer: (viewer: ViewerHandle) => void = (viewer: ViewerHandle) => {
        this.viewers[viewer.viewerId] = viewer;
        this.viewerInteractionSets[viewer.viewerId] = this.interactionSets.filter(
            ({ constraints }) => viewer.satisfiesConstraints(constraints),
        );
    };

    unregisterViewer: (viewer: ViewerHandle) => void = (viewer: ViewerHandle) => {
        delete this.viewers[viewer.viewerId];
        delete this.viewerInteractionSets[viewer.viewerId];
    };

    // TODO: cache viewer memberships
    publish = (eventName: string, message: InteractionMessage, publisher: ViewerHandle) => {
        Object.entries(this.viewerInteractionSets).forEach(([viewerId, interactionSets]) => {
            // interactionSets will always be an array of InteractionSets, but flow is too dumb to use the type hint for
            // this.viewerInteractionSets when calling Object.entries
            // (https://stackoverflow.com/questions/45621837/flowtype-errors-using-object-entries)
            if (!Array.isArray(interactionSets)) throw new Error();
            interactionSets.forEach((interactionSet) => {
                if (!(interactionSet instanceof InteractionSet)) throw new Error();
                interactionSet.subscriptions
                    .filter((subscription) => subscription.eventName === eventName)
                    .forEach((subscription) => {
                        if (subscription.eventName === eventName) {
                            subscription.handler(message, this.viewers[viewerId], publisher);
                        }
                    });
            });
        });
        // TODO: formalize this convention
        if (message.viewerId !== undefined && message.viewerId in this.viewers) {
            this.viewers[message.viewerId].receiveEvent({
                eventName,
                message,
                publisher,
            });
        }
    };

    getAllComponents(): InteractionSet {
        const componentCollection = new InteractionSet();
        this.interactionSets.push(componentCollection);
        return componentCollection;
    }

    getContext(): InteractionState {
        const { registerViewer, unregisterViewer, publish } = this;
        return {
            registerViewer,
            unregisterViewer,
            publishEvent: publish,
        };
    }
}

export const InteractionContext = React.createContext<InteractionState>({
    // interactions: [],
    registerViewer: (viewer) => {},
    unregisterViewer: (viewer) => {},
    publishEvent: (eventName: string, message: InteractionMessage, publisher: ViewerHandle) => {},
});

export type InteractionState = {
    // interactions: Array<InteractionSpec>,
    registerViewer: (viewer: ViewerHandle) => void,
    unregisterViewer: (viewer: ViewerHandle) => void,
    publishEvent: (eventName: string, message: InteractionMessage, publisher: ViewerHandle) => void,
};
