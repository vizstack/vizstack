import _ from 'lodash';

import {
    Fragment,
    FragmentId,
    TextPrimitiveFragment,
    TokenPrimitiveFragment,
    IconPrimitiveFragment,
    ImagePrimitiveFragment,
    SwitchLayoutFragment,
    GridLayoutFragment,
    FlowLayoutFragment,
    SequenceLayoutFragment,
    KeyValueLayoutFragment,
    DagLayoutFragment,
} from '@vizstack/schema';
import { TextPrimitiveHandle } from '../primitives/TextPrimitive';
import { TokenPrimitiveHandle } from '../primitives/TokenPrimitive';
import { IconPrimitiveHandle } from '../primitives/IconPrimitive';
import { ImagePrimitiveHandle } from '../primitives/ImagePrimitive';
import { FlowLayoutHandle } from '../layouts/FlowLayout';
import { SwitchLayoutHandle } from '../layouts/SwitchLayout';
import { GridLayoutHandle } from '../layouts/GridLayout';
import { SequenceLayoutHandle } from '../layouts/SequenceLayout';
import { KeyValueLayoutHandle } from '../layouts/KeyValueLayout';
import { DagLayoutHandle } from '../layouts/DagLayout';

/** Globally unique identifier for a specific `Viewer` that renders a `Fragment`. Note that the
 * same `Fragment` may be rendered by many different `Viewer`s. */
export type ViewerId = string & { readonly brand?: unique symbol };

type FragmentType = Fragment['type'];

/** Enables reading and interacting with a `Viewer`'s state, along with its corresponding
 * `Fragment`'s contents and metadata. '*/
export type ViewerHandle<T extends FragmentType = FragmentType> = {
    viewerId: ViewerId,
    parentId?: ViewerId,
    fragmentId: FragmentId,
    meta: Fragment['meta'],
    appearance: {
        light: 'normal' | 'highlight' | 'lowlight' | 'selected',
        doSetLight: (light: 'normal' | 'highlight' | 'lowlight' | 'selected') => void,
    },
} & FragmentSpecificInfo<T>;

// In order to perform type inference properly, Typescript needs a discriminated union
// to have its descriminant (i.e. `type` field) at the top level. This is why we unpack
// the `Fragment` into the `ViewerHandle` as opposed to nesting it within another property.
type FragmentSpecificInfo<T extends FragmentType> = 
    T extends "TextPrimitive" ? {
        type: T,
        contents: TextPrimitiveFragment['contents'],
        state: TextPrimitiveHandle,
    } :
    T extends 'TokenPrimitive' ? {
        type: T,
        contents: TokenPrimitiveFragment['contents'],
        state: TokenPrimitiveHandle,
    } : 
    T extends 'IconPrimitive' ? {
        type: T,
        contents: IconPrimitiveFragment['contents'],
        state: IconPrimitiveHandle,
    } : 
    T extends "ImagePrimitive" ? {
        type: T,
        contents: ImagePrimitiveFragment['contents'],
        state: ImagePrimitiveHandle,
    } :
    T extends "FlowLayout" ? {
        type: T,
        contents: FlowLayoutFragment['contents'],
        state: FlowLayoutHandle,
    } :
    T extends "SwitchLayout" ? {
        type: T,
        contents: SwitchLayoutFragment['contents'],
        state: SwitchLayoutHandle,
    } :
    T extends "GridLayout" ? {
        type: T,
        contents: GridLayoutFragment['contents'],
        state: GridLayoutHandle,
    } :
    T extends "SequenceLayout" ? {
        type: T,
        contents: SequenceLayoutFragment['contents'],
        state: SequenceLayoutHandle,
    } :
    T extends "KeyValueLayout" ? {
        type: T,
        contents: KeyValueLayoutFragment['contents'],
        state: KeyValueLayoutHandle,
    } :
    T extends "DagLayout" ? {
        type: T,
        contents: DagLayoutFragment['contents'],
        state: DagLayoutHandle,
    } :
    never;

/** Enables reading and interacting with a `Viewer`'s `Fragment`-specific state and properties. */
export type FragmentHandle = ViewerHandle['state'];

/** A set of `ViewerHandle`s, which can be transformed using `filter()` and `map()` operations and
 * iterated over using `forEach()`. It surfaces commonly used operations for filtering on ids,
 * types, and metadata. */
class ViewerSelector<T extends FragmentType = FragmentType> {
    private _selected: ViewerHandle<T>[];

    constructor(viewers: ViewerHandle<T>[]) {
        this._selected = viewers;
    }

    /**
     * Keep only `Viewer`s with any of the specified `ViewerId`s.
     * @param ids
     */
    public viewerId(...ids: ViewerId[]): ViewerSelector<T> {
        return this.filter((viewer) => ids.includes(viewer.viewerId));
    }

    /**
     * Keep only `Viewer`s rendering `Fragment`s with any of the specified `FragmentId`s.
     * @param ids 
     */
    public fragmentId(...ids: FragmentId[]): ViewerSelector<T> {
        return this.filter((viewer) => ids.includes(viewer.fragmentId));
    }

   /**
    * Keep only `Viewer`s rendering `Fragment`s belonging to any of the specified types.
    * @param types 
    */
    public type<U extends T>(...types: U[]): ViewerSelector<U> {
        function fn(viewer: ViewerHandle<T>): viewer is ViewerHandle<U> {
            return types.includes(viewer.type as any);
        }
        return new ViewerSelector<U>(_.filter(this._selected, fn));
    }

    /**
     * Keep only `Viewer`s rendering `Fragment`s with any of the specified metadata.
     * @param metas
     *     A tuple of 2 elements: (1) string key name, (2) either a testing function that
     *     takes the value and returns whether to keep it, or a value which will be mathched
     *     through shallow equality.
     */
    public meta(...metas: [string, ((value: any) => boolean) | any][]): ViewerSelector<T> {
        return this.filter((viewer) => {
            for(let [key, value] of metas) {
                if(key in viewer.meta) {
                    if(value instanceof Function) {
                        return value(viewer.meta[key]);
                    } else {
                        return value === viewer.meta[key];
                    }
                }
            }
        });
    }

    // public mode(): ViewerSelector {
    //     return this.map((viewer) => viewer.selectedMode);
    // }

    /**
     * Map each `ViewerHandle` to a different `ViewerHandle`.
     * @param fn
     */
    public map<U extends FragmentType>(
        fn: (viewer: ViewerHandle<T>) => ViewerHandle<U>
    ): ViewerSelector<U> {
        return new ViewerSelector<U>(this._selected.map(fn));
    }

    /**
     * Filter the set of `ViewerHandle`s using a predicate function.
     * @param fn 
     */
    public filter(fn: (viewer: ViewerHandle<T>) => boolean): ViewerSelector<T> {
        return new ViewerSelector<T>(this._selected.filter(fn));
    }

    /**
     * Iterate over each `ViewerHandle` in the set.
     * @param fn
     */
    public forEach(fn: (viewer: ViewerHandle<T>) => void): void {
        this._selected.forEach(fn);
    }
}

type Event = {
    topic: string,
    message: Record<string, any>,
};

/* The type of function which is called when an `Event` is emitted to an `InteractionManager`. */
type EventHandler<E extends Event = Event> = (
    all: ViewerSelector,
    message: E['message'],
    global: Record<string, any>,
) => void;

/** Configuration object used to define how user interactions should be handled by the `Viewer`s
 * and/or the external application. This `InteractionManager` adopts a Pub/Sub model for attaching
 * event handlers to different topics (i.e. channels for messages). By using `ViewerSelector`s and 
 * `ViewerHandle`s, it is possible to target specific `Viewer`s to query and manipulate. */
export class InteractionManager {

    // Maps a topic to the `EventHandler` functions that should fire when a message is emitted.
    private _handlers: { [topic: string]: EventHandler[] } = {};
    
    // Maps a `ViewerId` to a factory for its `ViewerHandle`. The factory will always produce a
    // valid `ViewerHandle` since its corresponding `Viewer` will have been mounted (as well as
    // the `Fragment` it renders).
    private _viewers: { [viewerId: string]: () => ViewerHandle } = {};
    
    // Global state that can be accessed by `EventHandler` functions.
    private _global: Record<string, any> = {};
    
    // Queue of `Event`s that have been emitted but whose handlers have not yet been executed.
    private _eventQueue: Array<Event> = [];
    
    // Whether the `InteractionManager` is currently executing the handlers for any event.
    private _isProcessingEvent: boolean = false;

    /**
     * @param options
     *     - `useMouseDefaults`: Whether to use default mouse interactions for hovering and
     *       selection.
     *     - `useKeyboardDefaults`: Whether to use default keyboard interactions for cursor
     *       navigation and selection.
     *     - `domElement`: DOM element on which to bind the keyboard listeners.
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
            domElement.addEventListener('keydown', (e: any) => {
                this.emit('KeyDown', { key: e.key });
            });
            domElement.addEventListener('keyup', (e: any) => {
                this.emit('KeyUp', { key: e.key });
            });
        } else {
            console.warn(`Keyboard interactions needs 'domElement' to attach listeners to, instead got: ${domElement}`);
        }

        if (useKeyboardDefaults) {
            this._useKeyboardDefaults();
        }

        if (useMouseDefaults || useKeyboardDefaults) {
            this._useLayoutHighlights();
        }
    }

    private _useLayoutHighlights() {
        this.on('Viewer.DidChangeLight', (all, message, global) => {
            if (message.viewerId === global.selected && message.light === 'selected') {
                all.viewerId(message.viewerId).forEach((viewer) => {
                    if (viewer.type === 'GridLayout') {
                        all.viewerId(viewer.state.cells[viewer.state.selectedCellIdx])
                            .forEach((child) => child.appearance.doSetLight('highlight'));
                    }
                    if (viewer.type === 'FlowLayout') {
                        all.viewerId(viewer.state.elements[viewer.state.selectedElementIdx])
                            .forEach((child) => child.appearance.doSetLight('highlight'));
                    }
                    if (viewer.type === 'SequenceLayout') {
                        all.viewerId(viewer.state.elements[viewer.state.selectedElementIdx])
                            .forEach((child) => child.appearance.doSetLight('highlight'));
                    }
                    if (viewer.type === 'KeyValueLayout') {
                        all.viewerId(viewer.state.entries[viewer.state.selectedEntryIdx][viewer.state.selectedEntryType])
                           .forEach((child) => child.appearance.doSetLight('highlight'));
                    }
                    if (viewer.parentId) {
                        all.viewerId(viewer.parentId).forEach((parent) => {
                            if (parent.type === 'GridLayout') {
                                parent.state.doSelectCell(parent.state.cells.findIndex((childId) => childId === viewer.viewerId));
                            }
                            if (parent.type === 'FlowLayout') {
                                parent.state.doSelectElement(parent.state.elements.findIndex((childId) => childId === viewer.viewerId));
                            }
                            if (parent.type === 'SequenceLayout') {
                                parent.state.doSelectElement(parent.state.elements.findIndex((childId) => childId === viewer.viewerId));
                            }
                            if (parent.type === 'KeyValueLayout') {
                                parent.state.doSelectEntry(parent.state.entries.findIndex(({key, value}) => {
                                    if (key === viewer.viewerId) {
                                        parent.state.doSelectKey();
                                        return true;
                                    }
                                    if (value === viewer.viewerId) {
                                        parent.state.doSelectValue();
                                        return true;
                                    }
                                    return false;
                                }));
                            }
                        });
                    }
                });
            }
            if (message.viewerId === global.prevSelected && message.light !== 'selected') {
                all.filter((viewer) => viewer.parentId === global.prevSelected && viewer.appearance.light === 'highlight').forEach((viewer) => {
                    viewer.appearance.doSetLight('normal');
                })
            }
        });
    }

    private _useMouseDefaults() {
        this.on('Viewer.DidMouseOver', (all, message, global) => {
            if (global.hovered !== global.selected) {
                all.viewerId(global.hovered).forEach((viewer) => {
                    viewer.appearance.doSetLight('normal');
                });
            }
            global.hovered = message.viewerId;
            if (global.hovered !== global.selected) {
                all.viewerId(global.hovered).forEach((viewer) => {
                    viewer.appearance.doSetLight('highlight');
                });
            }
        });
        this.on('Viewer.DidMouseOut', (all, message, global) => {
            if (message.viewerId !== global.selected) {
                all.viewerId(message.viewerId).forEach((viewer) => {
                    viewer.appearance.doSetLight('normal');
                });
            }
        });
        this.on('Viewer.DidClick', (all, message, global) => {
            if (message.viewerId !== global.selected) {
                all.viewerId(global.selected).forEach((viewer) => {
                    viewer.appearance.doSetLight('normal');
                });
                global.prevSelected = global.selected;
                global.selected = message.viewerId;
                all.viewerId(global.selected).forEach((viewer) => {
                    viewer.appearance.doSetLight('selected');
                    if (viewer.type === 'SwitchLayout') {
                        viewer.state.doIncrementMode();
                    }
                });
            }
            else {
                all.viewerId(global.selected).forEach((viewer) => {
                    viewer.appearance.doSetLight('highlight');
                });
                global.selected = null;
            }
        });
    }

    private _useKeyboardDefaults() {
        this.on('KeyDown', (all, message, global) => {
            all.viewerId(global.selected).forEach((viewer) => {
                if (message.key === 'Escape') {
                    if (viewer.parentId) {
                        viewer.appearance.doSetLight('normal');
                        global.prevSelected = global.selected;
                        global.selected = viewer.parentId;
                        all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                    }
                }
                switch (viewer.type) {
                    case 'SwitchLayout':
                        if (message.key === 'ArrowRight') {
                            viewer.state.doIncrementMode();
                        }
                        if (message.key === 'ArrowLeft') {
                            viewer.state.doIncrementMode(-1);
                        }
                        if (message.key === 'Enter') {
                            viewer.appearance.doSetLight('normal');
                            global.prevSelected = global.selected;
                            global.selected = viewer.state.mode;
                            all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                        }
                        break;
                    case 'SequenceLayout':
                        if (message.key === 'ArrowRight' || message.key === 'ArrowDown') {
                            viewer.state.doIncrementElement();
                        }
                        if (message.key === 'ArrowLeft' || message.key === 'ArrowUp') {
                            viewer.state.doIncrementElement(-1);
                        }
                        if (message.key === 'Enter') {
                            viewer.appearance.doSetLight('normal');
                            global.prevSelected = global.selected;
                            global.selected = viewer.state.elements[viewer.state.selectedElementIdx];
                            all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                        }
                        break;
                    case 'KeyValueLayout':
                        if (message.key === 'ArrowRight') {
                            viewer.state.doSelectValue();
                        }
                        if (message.key === 'ArrowLeft') {
                            viewer.state.doSelectKey();
                        }
                        if (message.key === 'ArrowUp') {
                            viewer.state.doIncrementEntry(-1);
                        }
                        if (message.key === 'ArrowDown') {
                            viewer.state.doIncrementEntry();
                        }
                        if (message.key === 'Enter') {
                            viewer.appearance.doSetLight('normal');
                            global.prevSelected = global.selected;
                            global.selected = viewer.state.entries[viewer.state.selectedEntryIdx][viewer.state.selectedEntryType];
                            all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                        }
                        break;
                    case 'FlowLayout':
                        if (message.key === 'ArrowRight') {
                            viewer.state.doIncrementElement();
                        }
                        if (message.key === 'ArrowLeft') {
                            viewer.state.doIncrementElement(-1);
                        }
                        if (message.key === 'Enter') {
                            viewer.appearance.doSetLight('normal');
                            global.prevSelected = global.selected;
                            global.selected = viewer.state.elements[viewer.state.selectedElementIdx];
                            all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                        }
                        break;
                    case 'GridLayout':
                        if (message.key === 'ArrowUp') {
                            viewer.state.doSelectNeighborCell('north');
                        }
                        if (message.key === 'ArrowDown') {
                            viewer.state.doSelectNeighborCell('south');
                        }
                        if (message.key === 'ArrowLeft') {
                            viewer.state.doSelectNeighborCell('west');
                        }
                        if (message.key === 'ArrowRight') {
                            viewer.state.doSelectNeighborCell('east');
                        }
                        if (message.key === 'Enter') {
                            viewer.appearance.doSetLight('normal');
                            global.prevSelected = global.selected;
                            global.selected = viewer.state.cells[viewer.state.selectedCellIdx];
                            all.viewerId(global.selected).forEach((viewer) => viewer.appearance.doSetLight('selected'));
                        }
                        break;
                }
            });
        });
        this.on('Grid.DidSelectCell', (all, message, global) => {
            if (global.selected === message.viewerId) {
                all.viewerId(message.viewerId).forEach((grid: any) => {  // TODO: correct typing here
                    all.viewerId(grid.state.cells[message.prevSelectedCellIdx])
                       .forEach((viewer) => viewer.appearance.doSetLight('normal'));
                    all.viewerId(grid.state.cells[message.selectedCellIdx])
                        .forEach((viewer) => viewer.appearance.doSetLight('highlight'));
                })
            }
        });
        this.on('Sequence.DidSelectElement', (all, message, global) => {
            if (global.selected === message.viewerId) {
                all.viewerId(message.viewerId).forEach((sequence: any) => {  // TODO: correct typing here
                    all.viewerId(sequence.state.elements[message.prevSelectedElementIdx])
                       .forEach((viewer) => viewer.appearance.doSetLight('normal'));
                    all.viewerId(sequence.state.elements[message.selectedElementIdx])
                        .forEach((viewer) => viewer.appearance.doSetLight('highlight'));
                })
            }
        });
        this.on('Flow.DidSelectElement', (all, message, global) => {
            if (global.selected === message.viewerId) {
                all.viewerId(message.viewerId).forEach((flow: any) => {  // TODO: correct typing here
                    all.viewerId(flow.state.elements[message.prevSelectedElementIdx])
                       .forEach((viewer) => viewer.appearance.doSetLight('normal'));
                    all.viewerId(flow.state.elements[message.selectedElementIdx])
                        .forEach((viewer) => viewer.appearance.doSetLight('highlight'));
                })
            }
        });
        this.on('KeyValue.DidSelectEntry', (all, message, global) => {
            if (global.selected === message.viewerId) {
                all.viewerId(message.viewerId).forEach((kv: any) => {  // TODO: correct typing here
                    all.viewerId(kv.state.entries[message.prevSelectedEntryIdx][message.prevSelectedEntryType])
                       .forEach((viewer) => viewer.appearance.doSetLight('normal'));
                    all.viewerId(kv.state.entries[message.selectedEntryIdx][message.selectedEntryType])
                       .forEach((viewer) => viewer.appearance.doSetLight('highlight'));
                })
            }
        });
    }

    /**
     * Dequeues an `Event` from `this.eventQueue` and fires all handler functions for that `Event`. */
    private _processNextEvent() {
        this._isProcessingEvent = true;
        const curr = this._eventQueue.shift();
        if(!curr) {
            this._isProcessingEvent = false;
            return;
        }
        const { topic, message } = curr;
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
     * Adds a `Viewer` to those accessible using a `ViewerSelector`. The `Viewer` must already
     * be mounted so that the `ViewerHandle` it produces is well-formed.
     */
    public registerViewer = (id: ViewerId, handleFactory: () => ViewerHandle) => {
        this._viewers[id] = handleFactory;
    };

    /**
     * Removes a `Viewer` from those accessible using a `ViewerSelector`.
     */
    public unregisterViewer = (id: ViewerId) => {
        delete this._viewers[id];
    };

    /**
     * Adds a new handler for a given topic.
     * @param topic
     * @param handler
     */
    public on = <E extends Event = Event>(topic: E['topic'], handler: EventHandler<E>) => {
        if (!(topic in this._handlers)) {
            this._handlers[topic] = [];
        }
        this._handlers[topic].push(handler as any);
    };

    /**
     * Enqueues a new `Event` to be processed. If no `Event` is currently being processed, then that
     * `Event` is processed immediately.
     * @param topic
     * @param message
     */
    public emit = <E extends Event = Event>(topic: E['topic'], message: E['message'] = {}) => {
        this._eventQueue.push({ topic, message });
        if (!this._isProcessingEvent) {
            this._processNextEvent();
        }
    };
}
