// @flow
import type {ViewModel} from '../schema';
import type {ViewerDidMouseOverEvent, Event, ViewerDidMouseOutEvent, ViewerDidClickEvent } from './events';
import type {TextPrimitiveHandle} from '../primitives/TextPrimitive';
import * as React from "react";
import type {ImagePrimitiveHandle} from "../primitives/ImagePrimitive";
import type {SwitchLayoutHandle} from "../layouts/SwitchLayout";
import type {GridLayoutHandle} from "../layouts/GridLayout";
import type {FlowLayoutHandle} from "../layouts/FlowLayout";
import type {SequenceLayoutHandle} from "../layouts/SequenceLayout";
import type {KeyValueLayoutHandle} from "../layouts/KeyValueLayout";

export type ViewerId = string;

/** Information which is present in all `ViewerHandle` subtypes.*/
type ViewerInfo = {|
    id: ViewerId,
    parent?: ViewerHandle,
|};

/** Fields in a `ViewerHandle` which are dependent upon the type of `ViewModel` being rendered by the `Viewer`. */
export type ComponentHandle = TextPrimitiveHandle | ImagePrimitiveHandle | SwitchLayoutHandle | GridLayoutHandle | FlowLayoutHandle | SequenceLayoutHandle | KeyValueLayoutHandle;

/** Provides information about a `Viewer`, as well as methods which alter its state. */
export type ViewerHandle = {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'TextPrimitive',
    },
    ...TextPrimitiveHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'ImagePrimitive',
    },
    ...ImagePrimitiveHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'SwitchLayout',
    },
    ...SwitchLayoutHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'GridLayout',
    },
    ...GridLayoutHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'FlowLayout',
    },
    ...FlowLayoutHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'SequenceLayout',
    },
    ...SequenceLayoutHandle,
|} | {|
    ...ViewerInfo,
    model: {
        ...ViewModel,
        type: 'KeyValueLayout',
    },
    ...KeyValueLayoutHandle,
|};

/** A fancy `Array` of `ViewerHandle`s. Besides `filter()` and `forEach()`, it also exposes
 * wrappers around common filters, such as `id()` and `type()`. */
class InteractionSet {
    viewers: Array<ViewerHandle>;

    constructor(viewers: Array<ViewerHandle>) {
        this.viewers = viewers;
    }

    id(ids: ViewerId | Array<ViewerId>): InteractionSet {
        if (Array.isArray(ids)) {
            return this.filter((viewer) => ids.includes(viewer.id));
        }
        else {
            return this.filter((viewer) => viewer.id === ids);
        }
    }

    type(types: $PropertyType<ViewModel, 'type'> | Array<$PropertyType<ViewModel, 'type'>>) {
        if (Array.isArray(types)) {
            return this.filter((viewer) => types.includes(viewer.model.type));
        }
        else {
            return this.filter((viewer) => viewer.model.type === types);
        }
    }

    filter(fn: (viewer: ViewerHandle) => boolean): InteractionSet {
        return new InteractionSet(this.viewers.filter((viewer) => fn(viewer)));
    }

    forEach(fn: (viewer: ViewerHandle) => void): void {
        this.viewers.forEach((viewer) => fn(viewer));
    }
}

/** The type of function which is called when an `Event` is emitted to an `InteractionManager`. */
type EventHandler<Message> = (all: InteractionSet, message: Message, global: any) => void

export class InteractionManager {
    // Maps an event topic to the handler function(s) that should fire when that event is emitted.
    handlers: { [$PropertyType<Event, 'topic'>]: Array<EventHandler<{}>> } = {};
    // Maps a `ViewerId` to a function which returns the current `ViewerHandle` of that `Viewer`.
    viewers: { ViewerId: () => ViewerHandle } = {};
    // The global state which is accessed by `EventHandler` functions.
    global: any = {};
    // The queue of `Event`s which have been emitted but whose handlers have not yet been executed.
    eventQueue: Array<Event> = [];
    // Whether the `InteractionManager` is currently executing the handlers for an event.
    processingEvent: boolean = false;

    /**
     *
     * @param options: `documentElement` is needed, since `document` might not be correct in all
     *                  applications (such as "vizstack-atom").
     */
    constructor(options: {
        useMouseDefaults: boolean,
        useKeyboardDefaults: boolean,
        documentElement: Document | HTMLElement,
    } = {}) {
        this.emit = this.emit.bind(this);
        this.registerViewer = this.registerViewer.bind(this);
        this.unregisterViewer = this.unregisterViewer.bind(this);

        const { useMouseDefaults=true, useKeyboardDefaults=true, documentElement=document} = options;

        if (useMouseDefaults) {
            this._useMouseDefaults();
        }
        if (useKeyboardDefaults) {
            this._useKeyboardDefaults(documentElement);
        }
    }

    _useMouseDefaults() {
        this.on<ViewerDidMouseOverEvent>('Viewer.DidMouseOver',
            (all, message, global) => {
                all.id(global.selected).forEach((viewer) => {
                    viewer.doUnhighlight();
                });
                global.selected = message.viewerId;
                all.id(global.selected).forEach((viewer) => {
                    viewer.doHighlight();
                });
            }
        );
        this.on<ViewerDidMouseOutEvent>('Viewer.DidMouseOut',
            (all, message) => {
                all.id(message.viewerId).forEach((viewer) => {
                    viewer.doUnhighlight();
                });
            }
        );
        this.on<ViewerDidClickEvent>('Viewer.DidClick',
            (all, message) => {
                all.id(message.viewerId).forEach((viewer) => {
                    if (viewer.model.type === 'SwitchLayout') {
                        viewer.doIncrementMode();
                    }
                });
            }
        );
    }

    _useKeyboardDefaults(documentElement: Document | HTMLElement) {
        documentElement.addEventListener('keydown', (event: KeyboardEvent) => {
            this.emit<{|topic: 'KeyDown', message: {|key: string|}|}>('KeyDown', { key: event.key, });
        });

        documentElement.addEventListener('keyup', (event: KeyboardEvent) => {
            this.emit<{|topic: 'KeyUp', message: {|key: string|}|}>('KeyUp', { key: event.key, });
        });

        this.on<{|topic: 'KeyDown', message: {|key: string|}|}>('KeyDown',
            (all, message, global) => {
                all.id(global.selected).forEach((viewer) => {
                    if (message.key === 'Enter') {
                        if (viewer.selectedViewerId) {
                            global.selected = viewer.selectedViewerId;
                            viewer.doUnhighlight();
                            all.id(global.selected).forEach((viewer) => viewer.doHighlight());
                        }
                    }
                    if (message.key === 'Escape') {
                        if (viewer.parent) {
                            global.selected = viewer.parent.id;
                            viewer.doUnhighlight();
                            all.id(global.selected).forEach((viewer) => viewer.doHighlight());
                        }
                    }
                    switch(viewer.model.type) {
                        case 'SwitchLayout':
                            if (message.key === 'ArrowRight') {
                                viewer.doIncrementMode();
                            }
                            if (message.key === 'ArrowLeft') {
                                viewer.doIncrementMode(-1);
                            }
                            break;
                        case 'SequenceLayout':
                            // TODO: this is an abstraction leak, since someone writing an interaction now needs to know what the default content values are.
                            if ((message.key === 'ArrowRight' && viewer.model.contents.orientation !== 'vertical')
                            || (message.key === 'ArrowDown' && viewer.model.contents.orientation === 'vertical')) {
                                viewer.doIncrementElement();
                            }
                            if ((message.key === 'ArrowLeft' && viewer.model.contents.orientation !== 'vertical')
                                || (message.key === 'ArrowUp' && viewer.model.contents.orientation === 'vertical')) {
                                viewer.doIncrementElement(-1);
                            }
                            break;
                        case 'KeyValueLayout':
                            if (message.key === 'ArrowRight') {
                                viewer.doSelectValue();
                            }
                            if (message.key === 'ArrowLeft') {
                                viewer.doSelectKey();
                            }
                            if (message.key === 'ArrowUp') {
                                viewer.doIncrementEntry(-1);
                            }
                            if (message.key === 'ArrowDown') {
                                viewer.doIncrementEntry();
                            }
                            break;
                        case 'FlowLayout':
                            if (message.key === 'ArrowRight') {
                                viewer.doIncrementElement();
                            }
                            if (message.key === 'ArrowLeft') {
                                viewer.doIncrementElement(-1);
                            }
                            break;
                        case 'GridLayout':
                            const directions = {
                                'ArrowRight': 'east',
                                'ArrowLeft': 'west',
                                'ArrowUp': 'north',
                                'ArrowDown': 'south',
                            };
                            if (message.key in directions) {
                                viewer.doSelectNeighborCell(directions[message.key]);
                            }
                            break;
                    }
                });
            }
        );
    }

    /** Adds a new `Viewer` to the `InteractionSet` passed to handler functions. */
    registerViewer = (id: ViewerId, handleFactory: () => ViewerHandle) => {
        this.viewers[id] = handleFactory;
    };

    /** Removes a `Viewer` from the `InteractionSet` passed to handler functions. */
    unregisterViewer = (id: ViewerId) => {
        delete this.viewers[id];
    };

    /**
     * Adds a new handler for a given topic.
     *
     * @param topic
     * @param handler
     */
    on<E: Event>(topic: $PropertyType<E, 'topic'>,
                 handler: EventHandler<$PropertyType<E, 'message'>>) {
        if (!(topic in this.handlers)) {
            this.handlers[topic] = [];
        }
        this.handlers[topic].push(handler);
    }

    /**
     * Enqueues a new `Event` to be processed. If no `Event` is currently being processed, then that
     * `Event` is processed immediately.
     *
     * @param topic
     * @param message
     */
    emit: <E: Event>(topic: $PropertyType<E, 'topic'>,
                     message: $PropertyType<E, 'message'>) => void =
        <E>(topic, message) => {
        this.eventQueue.push({
            topic, message,
        });
        if (!this.processingEvent) {
            this._processNextEvent();
        }
    };

    /** Dequeues an `Event` from `this.eventQueue` and fires all handler functions for that
     * `Event`. */
    _processNextEvent() {
        this.processingEvent = true;
        const { topic, message } = this.eventQueue.shift();
        if (topic in this.handlers) {
            this.handlers[topic].forEach(
                (handler) => handler(
                    // Flow doesn't know how to handle `Object.values()`, so we have to cast it to
                    // `any` then cast the `handleFactory` to its proper type
                    new InteractionSet((Object.values(this.viewers): any).map((handleFactory: () => ViewerHandle) => handleFactory())),
                    message,
                    this.global,
                )
            );
        }
        this.processingEvent = false;
        if (this.eventQueue.length > 0) {
            this._processNextEvent();
        }
    }

    /** Returns an object which can be passed to the `value` prop of an
     * `InteractionContext.Provider` to make this `InteractionManager` available to all `Viewer`s
     * within that context. */
    getContextValue(): InteractionContextValue {
        const { registerViewer, unregisterViewer, emit } = this;
        return {
            registerViewer,
            unregisterViewer,
            emitEvent: emit,
        };
    }
}

/** A React context which allows all `Viewer`s nested within it to emit and respond to events. */
export const InteractionContext = React.createContext<InteractionContextValue>({
    registerViewer: () => {},
    unregisterViewer: () => {},
    emitEvent: () => {},
});

export type InteractionContextValue = {
    registerViewer: (id: ViewerId, viewer: () => ViewerHandle) => void,
    unregisterViewer: (id: ViewerId, viewer: () => ViewerHandle) => void,
    emitEvent: <E: Event>(topic: $PropertyType<E, 'topic'>, message: $PropertyType<E, 'message'>) => void,
};