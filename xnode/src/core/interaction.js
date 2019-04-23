// @flow
import type { ViewType, ViewContents, ViewMeta } from './schema'

import * as React from 'react';

export type Constraint = ViewTypeConstraint | MetaConstraint | FilterConstraint;

type Json = string | number | {[string]: Json} | Array<Json>;

type ViewTypeConstraint = {
    type: "type",
    includedTypes: Array<ViewType>,
}

type MetaConstraint = {
    type: "meta",
    key: string,
    includedValues: Array<string | number>,
}

type FilterConstraint = {
    type: "filter",
    fn: (ReadOnlyView) => boolean,
}

export type Subscription = {
    eventName: string,
    handler: (subscriber: InteractiveView, publisher: InteractiveView) => void,
}

class InteractionSet {
    constraints: Array<Constraint> = [];
    subscriptions: Array<Subscription> = [];

    /**
     * Returns a new `ComponentCollection` containing only members of the specified type(s).
     *
     * @param type
     */
    withType(type: ViewType | Array<ViewType>): InteractionSet {
        this.constraints.push({
            type: "type",
            includedTypes: Array.isArray(type) ? type : [type],
        });
        return this;
    }

    /**
     * Returns a new `ComponentCollection` containing only members whose value for the given metadata key falls in the
     * given value(s).
     *
     * @param key
     * @param value
     */
    withMeta(key: string, value: string | number | Array<string | number>): InteractionSet {
        this.constraints.push({
            type: "meta",
            key,
            includedValues: Array.isArray(value) ? value : [value],
        });
        return this;
    }

    /**
     * Returns a new `ComponentCollection` containing only members
     * @param fn
     * @returns {InteractionSet}
     */
    filter(fn: (ReadOnlyView) => boolean): InteractionSet {
        this.constraints.push({
            type: "filter",
            fn,
        });
        return this;
    }

    subscribe(eventName: string, handler: (subscriber: InteractiveView, publisher: InteractiveView) => void): void {
        this.subscriptions.push({
            eventName,
            handler,
        })
    }
}

export type InteractionSpec = {
    constraints: Array<Constraint>;
    subscriptions: Array<Subscription>;
}

export type ReadOnlyView  = {
    guid: string,
    type: ViewType,
    meta: ViewMeta,
    contents: ViewContents,
}

export type InteractiveView = {
    guid: string,
    type: ViewType,
    meta: ViewMeta,
    contents: ViewContents,
    highlight: () => void,
    lowlight: () => void,
}

export type Event = {
    name: string,
    caller: InteractiveView,
}

export class InteractionManager {
    interactionSets: Array<InteractionSet> = [];
    // TODO: get correct types for this function
    environmentUpdates: Array<((prevState: any, prevProps: any) => any) => void> = [];

    constructor() {
        this.publish = this.publish.bind(this);
    }

    publish(eventName: string, eventCaller: InteractiveView) {
        this.environmentUpdates.forEach((setState) => {
            setState((prevState) => ({
                ...prevState,
                interactionState: {
                    ...prevState.interactionState,
                    interactions: this.interactionSets.map(({constraints, subscriptions}) => ({constraints, subscriptions})),
                    lastEvent: {
                        name: eventName,
                        caller: eventCaller,
                    },
                }
            }));
        })
    };

    getAllComponents(): InteractionSet {
        const componentCollection = new InteractionSet();
        this.interactionSets.push(componentCollection);
        this.environmentUpdates.forEach((setState) => {
            setState((prevState) => ({
                ...prevState,
                interactionState: {
                    ...prevState.interactionState,
                    interactions: this.interactionSets.map(({constraints, subscriptions}) => ({constraints, subscriptions})),
                }
            }));
        });
        return componentCollection;
    };
}

export const InteractionContext = React.createContext<InteractionState>({
    interactions: [],
    publishEvent: (eventName: string, eventCaller: InteractiveView) => {},
});

export type InteractionState = {
    lastEvent?: Event,
    interactions: Array<InteractionSpec>,
    publishEvent: (eventName: string, eventCaller: InteractiveView) => void,
}

export function initializeInteraction<P, S: {interactionState: InteractionState}>(
    component: React.Component<P, S>,
    manager: InteractionManager) {
    if (component.state === undefined) {
        component.state = {};
    }
    component.state.interactionState = {
        interactions: [],
        publishEvent: manager.publish,
    };
    manager.environmentUpdates.push((updater: (S, P) => InteractionState) => {
        component.setState(updater);
    });
}
