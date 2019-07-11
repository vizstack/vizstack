import _ from 'lodash';

import {
    Fragment,
    TextPrimitiveFragment,
    ImagePrimitiveFragment,
    SwitchLayoutFragment,
    GridLayoutFragment,
    FlowLayoutFragment,
    SequenceLayoutFragment,
    KeyValueLayoutFragment,
    DagLayoutFragment,
    FragmentId,
} from '@vizstack/schema';
import {
    Event,
    ViewerDidMouseOverEvent,
    ViewerDidMouseOutEvent,
    ViewerDidClickEvent,
} from './events';
import { TextPrimitiveHandle } from '../primitives/TextPrimitive';
import { ImagePrimitiveHandle } from '../primitives/ImagePrimitive';
import { SwitchLayoutHandle } from '../layouts/SwitchLayout';
import { GridLayoutHandle } from '../layouts/GridLayout';
import { FlowLayoutHandle } from '../layouts/FlowLayout';
import { SequenceLayoutHandle } from '../layouts/SequenceLayout';
import { KeyValueLayoutHandle } from '../layouts/KeyValueLayout';

export type ViewerId = string & { readonly brand?: unique symbol };

/* Information which is present in all `ViewerHandle` subtypes.*/
type ViewerInfo = {
    id: ViewerId;
    fragmentId: FragmentId;
    parent?: ViewerHandle;
};

type FragmentInfo =
    | ({ fragment: TextPrimitiveFragment } & TextPrimitiveHandle)
    | ({ fragment: ImagePrimitiveFragment } & ImagePrimitiveHandle)
    | ({ fragment: SwitchLayoutFragment } & SwitchLayoutHandle)
    | ({ fragment: GridLayoutFragment } & GridLayoutHandle)
    | ({ fragment: FlowLayoutFragment } & FlowLayoutHandle)
    | ({ fragment: SequenceLayoutFragment } & SequenceLayoutHandle)
    | ({ fragment: KeyValueLayoutFragment } & KeyValueLayoutHandle);

/* Fields in a `ViewerHandle` which are dependent upon the type of `Fragment` being rendered by
 * the `Viewer`. */
export type FragmentHandle =
    | TextPrimitiveHandle
    | ImagePrimitiveHandle
    | SwitchLayoutHandle
    | GridLayoutHandle
    | FlowLayoutHandle
    | SequenceLayoutHandle
    | KeyValueLayoutHandle;

/* Provides information about a `Viewer`, as well as methods which alter its state. */
export type ViewerHandle = ViewerInfo & FragmentInfo;

/* A fancy `Array` of `ViewerHandle`s. Besides `filter()`, `forEach()`, and `map()`, it also exposes
 * wrappers around common filters and maps, such as `type()` and `mode()`. */
class ViewerSelector {
    current: ViewerHandle[];  // The `ViewerHandle`s currently selected.

    constructor(viewers: ViewerHandle[]) {
        this.current = viewers;
    }

    id(...ids: ViewerId[]): ViewerSelector {
        return this.filter((viewer) => ids.includes(viewer.id));
    }

    type(...types: Fragment['type'][]): ViewerSelector {
        return this.filter((viewer) => types.includes(viewer.fragment.type));
    }

    mode(): ViewerSelector {
        return this.map((viewer) => viewer.selectedMode);
    }

    map(fn: (viewer: ViewerHandle) => ViewerHandle): ViewerSelector {
        return new ViewerSelector(this.current.map(fn));
    }

    filter(fn: (viewer: ViewerHandle) => boolean): ViewerSelector {
        return new ViewerSelector(this.current.filter(fn));
    }

    forEach(fn: (viewer: ViewerHandle) => void): void {
        this.current.forEach(fn);
    }
}

/* The type of function which is called when an `Event` is emitted to an `InteractionManager`. */
type EventHandler = (
    all?: ViewerSelector,
    message?: Record<string, any>,
    global?: Record<string, any>,
) => void;

/** TODO: Document. */
export class InteractionManager {

    // Maps a topic to the `EventHandler` functions that should fire when a message is emitted.
    private _handlers: { [topic: string]: EventHandler[] } = {};
    
    // Maps a `ViewerId` to a factory for its `ViewerHandle`.
    private _viewers: { [viewerId: string]: () => ViewerHandle } = {};
    
    // Global state that can be accessed by `EventHandler` functions.
    private _global: Record<string, any> = {};
    
    // Queue of `Event`s that have been emitted but whose handlers have not yet been executed.
    private _eventQueue: Array<Event> = [];
    
    // Whether the `InteractionManager` is currently executing the handlers for any event.
    private _isProcessingEvent: boolean = false;

    /**
     * @param options
     *     `useMouseDefaults`: Whether to use default mouse interactions for hovering and selecting.
     *     `useKeyboardDefaults`: Whether to use default keyboard interactions for cursor movement.
     *     `domElement`: DOM element on which to bind the keyboard listeners.
     */
    constructor(
        options: {
            useMouseDefaults?: boolean;
            useKeyboardDefaults?: boolean;
            domElement?: Document | HTMLElement;
        } = {},
    ) {
        const {
            useMouseDefaults = true,
            useKeyboardDefaults = true,
            domElement = document,
        } = options;

        if (useMouseDefaults) {
            this._useMouseDefaults();
        }

        if (domElement) {
            domElement.addEventListener('keydown', (event: KeyboardEvent) => {
                this.emit('KeyDown', { key: event.key });
            });
            domElement.addEventListener('keyup', (event: KeyboardEvent) => {
                this.emit('KeyUp', { key: event.key });
            });
        } else {
            console.warn(`Keyboard interactions needs 'domElement' to attach listeners.`);
        }

        if (useKeyboardDefaults) {
            this._useKeyboardDefaults();
        }
    }

    private _useMouseDefaults() {
        this.on('Viewer.DidMouseOver', (all, message, global) => {
            all.id(global.selected).forEach((viewer) => {
                viewer.doUnhighlight();
            });
            global.selected = message.viewerId;
            all.id(global.selected).forEach((viewer) => {
                viewer.doHighlight();
            });
        });
        this.on('Viewer.DidMouseOut', (all, message) => {
            all.id(message.viewerId).forEach((viewer) => {
                viewer.doUnhighlight();
            });
        });
        this.on('Viewer.DidClick', (all, message) => {
            all.id(message.viewerId).forEach((viewer) => {
                if (viewer.fragment.type === 'SwitchLayout') {
                    viewer.doIncrementMode();
                }
            });
        });
    }

    private _useKeyboardDefaults() {
        this.on('KeyDown', (all, message, global) => {
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
                switch (viewer.fragment.type) {
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
                        if (
                            (message.key === 'ArrowRight' &&
                                viewer.fragment.contents.orientation !== 'vertical') ||
                            (message.key === 'ArrowDown' &&
                                viewer.fragment.contents.orientation === 'vertical')
                        ) {
                            viewer.doIncrementElement();
                        }
                        if (
                            (message.key === 'ArrowLeft' &&
                                viewer.fragment.contents.orientation !== 'vertical') ||
                            (message.key === 'ArrowUp' &&
                                viewer.fragment.contents.orientation === 'vertical')
                        ) {
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
                            ArrowRight: 'east',
                            ArrowLeft: 'west',
                            ArrowUp: 'north',
                            ArrowDown: 'south',
                        };
                        if (message.key in directions) {
                            viewer.doSelectNeighborCell(directions[message.key]);
                        }
                        break;
                }
            });
        });
    }

    /**
     * Dequeues an `Event` from `this.eventQueue` and fires all handler functions for that `Event`. */
    private _processNextEvent() {
        this._isProcessingEvent = true;
        const { topic, message } = this._eventQueue.shift();
        if (topic in this._handlers) {
            this._handlers[topic].forEach((handler) =>
                handler(
                    new ViewerSelector(
                        _.values(this._viewers).map((handleFactory) => handleFactory()),
                    ),
                    message,
                    this._global,
                ),
            );
        }
        this._isProcessingEvent = false;
        if (this._eventQueue.length > 0) {
            this._processNextEvent();
        }
    }

    /**
     * Adds a `Viewer` to those accessible using a `ViewerSelector`.
     */
    public registerViewer = (id: ViewerId, handleFactory: () => ViewerHandle) => {
        // Use lambda to automatically bind to `this`.
        this._viewers[id] = handleFactory;
    };

    /**
     * Removes a `Viewer` from those accessible using a `ViewerSelector`.
     */
    public unregisterViewer = (id: ViewerId) => {
        // Use lambda to automatically bind to `this`.
        delete this._viewers[id];
    };

    /**
     * Adds a new handler for a given topic.
     * @param topic
     * @param handler
     */
    public on = (topic: string, handler: EventHandler) => {
        // Use lambda to automatically bind to `this`.
        if (!(topic in this._handlers)) {
            this._handlers[topic] = [];
        }
        this._handlers[topic].push(handler);
    };

    /**
     * Enqueues a new `Event` to be processed. If no `Event` is currently being processed, then that
     * `Event` is processed immediately.
     * @param topic
     * @param message
     */
    public emit = (topic: string, message: Record<string, any>) => {
        // Use lambda to automatically bind to `this`.
        this._eventQueue.push({ topic, message });
        if (!this._isProcessingEvent) {
            this._processNextEvent();
        }
    };
}