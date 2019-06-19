// @flow
import * as React from 'react';

/** A function which returns `true` iff `viewer` satisfies a particular constraint function. */
import type {
    OnViewerMouseOverEvent,
    OnViewerMouseOutEvent,
    OnViewerClickEvent,
    HighlightEvent,
    EventMessage,
    Event,
    OnKeyDownEvent,
    OnKeyUpEvent,
} from './events';

import type { SwitchChangeModeEvent } from '../layouts/SwitchLayout';
import type { GridSelectCellEvent } from '../layouts/GridLayout';
import type { OnDagEdgeMouseEvent, DagEdgeHighlightEvent, OnDagNodeMouseEvent, DagNodeHighlightEvent, DagNodeCollapseEvent, DagNodeExpandEvent } from '../layouts/DagLayout';


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
    publishedEvents: Array<Event> = [];  // Events which have been published but not yet processed.
    processingEvent: boolean = false;  // Whether or not the manager is currently processing an event. If it is, newly-published events will be enqueued instead of immediately processed.

    constructor(options: {
        useMouseDefaults?: boolean,
        useKeyboardDefaults?: boolean,
        documentElement?: HTMLElement,
    }) {
        let { useMouseDefaults=true, useKeyboardDefaults=true, documentElement=document } = options;

        this.publish = this.publish.bind(this);
        this.registerViewer = this.registerViewer.bind(this);
        this.unregisterViewer = this.unregisterViewer.bind(this);

        documentElement.addEventListener('keydown', (event: KeyboardEventHandler) => {
            this.publish<OnKeyDownEvent>({
                eventName: 'onKeyDown',
                message: {
                    key: event.key,
                },
            });
        });

        documentElement.addEventListener('keyup', (event: KeyboardEventHandler) => {
            this.publish<OnKeyUpEvent>({
                eventName: 'onKeyUp',
                message: {
                    key: event.key,
                },
            });
        });

        if (useMouseDefaults) {
            this._addMouseDefaults();
        }
        if (useKeyboardDefaults) {
            this._addKeyboardDefaults();
        }
    }

    _addKeyboardDefaults(): void {
        // Right and left arrow keys change a Switch's current mode if that Switch is selected
        this.getAllComponents()
            .withType('SwitchLayout')
            .subscribe<OnKeyDownEvent>('onKeyDown', (message, subscriber, state) => {
                if (state.selected === subscriber.viewerId) {
                    if (message.key === 'ArrowRight') {
                        this.publish<SwitchChangeModeEvent>({
                            eventName: 'switchChangeMode',
                            message: {
                                viewerId: subscriber.viewerId,
                                idxDelta: 1,
                            },
                        });
                    }
                    else if (message.key === 'ArrowLeft') {
                        this.publish<SwitchChangeModeEvent>({
                            eventName: 'switchChangeMode',
                            message: {
                                viewerId: subscriber.viewerId,
                                idxDelta: -1,
                            },
                        });
                    }
                }
            });

        // Arrow keys navigate the cells of a Grid if that Grid is selected
        this.getAllComponents()
            .withType('GridLayout')
            .subscribe<OnKeyDownEvent>('onKeyDown', (message, subscriber, state) => {
                if (state.selected === subscriber.viewerId) {
                    const directions = {
                        'ArrowRight': 'right',
                        'ArrowLeft': 'left',
                        'ArrowUp': 'up',
                        'ArrowDown': 'down',
                    };
                    if (message.key in directions) {
                        this.publish<GridSelectCellEvent>({
                            eventName: 'gridSelectCell',
                            message: {
                                viewerId: subscriber.viewerId,
                                moveCursor: directions[message.key],
                            }
                        });
                    }
                }
            });

        this.getAllComponents()
            .withType('FlowLayout')
            .subscribe('onKeyDown', (message, subscriber, state) => {
                if (state.selected === subscriber.viewerId) {
                    if (message.key in directions) {
                        this.publish({
                            eventName: 'flowSelectElement',
                            message: {
                                viewerId: subscriber.viewerId,
                                idxDelta: message.key === 'ArrowRight' ? 1 : -1,
                            }
                        })
                    }
                }
            });


        // Enter drills down, Escape zooms out
        this.getAllComponents()
            .subscribe<OnKeyDownEvent>('onKeyDown', (message, subscriber, state) => {
                if (state.selected === subscriber.viewerId) {
                    if (message.key === 'Enter') {
                        this.publish({
                            eventName: 'focusSelected',
                            message: {
                                viewerId: subscriber.viewerId,
                            }
                        });
                    }
                    if (message.key === 'Escape') {
                        console.log('yeet', subscriber);
                        if (subscriber.parent) {
                            state.selected = subscriber.parent.viewerId;
                            this.publish({
                                eventName: 'unhighlight',
                                message: { viewerId: subscriber.viewerId },
                            });
                            this.publish({
                                eventName: 'highlight',
                                message: { viewerId: subscriber.parent.viewerId },
                            })
                        }
                    }
                }
            });

        // Whenever a layout registers a zoom in or a drill down, unhighlight it and highlight the
        // newly selected viewer
        this.getAllComponents()
            .subscribe('onFocusSelected', (message, subscriber, state) => {
                if (state.selected === subscriber.viewerId) {
                    this.publish({
                        eventName: 'unhighlight',
                        message: {
                            viewerId: state.selected,
                        }
                    });
                }
                if (message.childViewerId === subscriber.viewerId) {
                    state.selected = message.childViewerId;
                    this.publish({
                        eventName: 'highlight',
                        message: {
                            viewerId: message.childViewerId,
                        }
                    });
                }
            });
    }

    _addMouseDefaults(): void {
        const allViewers = this.getAllComponents();
        allViewers.subscribe<OnViewerMouseOverEvent>('onViewerMouseOver', (message, subscriber, state) => {
            if (subscriber.viewerId === message.publisher.viewerId) {
                this.publish<HighlightEvent>({
                    eventName: 'highlight',
                    message: { viewerId: subscriber.viewerId },
                });
                if (state.selected) {
                    this.publish({
                        eventName: 'unhighlight',
                        message: { viewerId: state.selected },
                    });
                }
                state.selected = subscriber.viewerId;
            }
        });
        allViewers.subscribe<OnViewerMouseOutEvent>('onViewerMouseOut', (message, subscriber, state) => {
            if (subscriber.viewerId === message.publisher.viewerId) {
                this.publish<HighlightEvent>({
                    eventName: 'unhighlight',
                    message: { viewerId: subscriber.viewerId },
                });
                if (state.selected === subscriber.viewerId) {
                    state.selected = undefined;
                }
            }
        });
        allViewers
            .withType('SwitchLayout')
            .subscribe<OnViewerClickEvent>('onViewerClick', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<SwitchChangeModeEvent>({
                        eventName: 'switchChangeMode',
                        message: {
                            viewerId: subscriber.viewerId,
                            idxDelta: 1,
                        },
                    });
                }
            });
        allViewers
            .withType('DagLayout')
            .subscribe<OnDagEdgeMouseEvent>('onDagEdgeMouseOver', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<DagEdgeHighlightEvent>({
                        eventName: 'dagEdgeHighlight',
                        message: { viewerId: subscriber.viewerId, edgeId: message.edgeId },
                    })
                }
            });
        allViewers
            .withType('DagLayout')
            .subscribe<OnDagEdgeMouseEvent>('onDagEdgeMouseOut', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<DagEdgeHighlightEvent>({
                        eventName: 'dagEdgeUnhighlight',
                        message: { viewerId: subscriber.viewerId, edgeId: message.edgeId },
                    })
                }
            });
        allViewers
            .withType('DagLayout')
            .subscribe<OnDagNodeMouseEvent>('onDagNodeMouseOver', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<DagNodeHighlightEvent>({
                        eventName: 'dagNodeHighlight',
                        message: { viewerId: subscriber.viewerId, nodeId: message.nodeId },
                    })
                }
            });
        allViewers
            .withType('DagLayout')
            .subscribe<OnDagNodeMouseEvent>('onDagNodeMouseOut', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    this.publish<DagNodeHighlightEvent>({
                        eventName: 'dagNodeUnhighlight',
                        message: { viewerId: subscriber.viewerId, nodeId: message.nodeId },
                    })
                }
            });
        allViewers
            .withType('DagLayout')
            .subscribe<OnDagNodeMouseEvent>('onDagNodeClick', (message, subscriber) => {
                if (subscriber.viewerId === message.publisher.viewerId) {
                    if (message.nodeExpanded) {
                        this.publish<DagNodeCollapseEvent>({
                            eventName: 'dagNodeCollapse',
                            message: { viewerId: subscriber.viewerId, nodeId: message.nodeId },
                        });
                    }
                    else {
                        this.publish<DagNodeExpandEvent>({
                            eventName: 'dagNodeExpand',
                            message: { viewerId: subscriber.viewerId, nodeId: message.nodeId },
                        });
                    }
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
        this.publishedEvents.push(event);
        if (!this.processingEvent) {
            this.processEvent(this.publishedEvents.pop());
        }
    };

    processEvent = (event) => {
        this.processingEvent = true;
        const newStates = [];
        Object.entries(this.viewerInteractionSets).forEach(([viewerId, interactionSets]) => {
            // interactionSets will always be an array of InteractionSets, but flow is too dumb to use the type hint for
            // this.viewerInteractionSets when calling Object.entries
            // (https://stackoverflow.com/questions/45621837/flowtype-errors-using-object-entries)
            if (this.viewers[viewerId] === undefined) return;  // TODO: figure out why this is possible
            if (!Array.isArray(interactionSets)) throw new Error();
            interactionSets.forEach((interactionSet) => {
                if (!(interactionSet instanceof InteractionSet)) throw new Error();
                interactionSet.subscriptions
                    .filter((subscription) => subscription.eventName === event.eventName)
                    .forEach((subscription) => {
                        if (subscription.eventName === event.eventName) {
                            const newState = {...this.state};
                            subscription.handler(event.message, this.viewers[viewerId], newState);
                            newStates.push(newState);
                        }
                    });
            });
        });
        if (event.message.viewerId !== undefined && event.message.viewerId in this.viewers) {
            this.viewers[event.message.viewerId].receiveEvent(event);
        }
        // TODO: is this the most sensible way to handle state? maybe do it react-style?
        const oldState = {...this.state};
        newStates.forEach((newState) => {
            Object.entries(newState).forEach(([key, value]) => {
                if (value !== oldState[key]) {
                    this.state[key] = value;
                }
            })
        });
        this.processingEvent = false;
        if (this.publishedEvents.length > 0) {
            this.processEvent(this.publishedEvents.pop());
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
    registerViewer: () => {},
    unregisterViewer: () => {},
    publishEvent: () => {},
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
