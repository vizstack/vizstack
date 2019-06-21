// @flow
import * as React from 'react';

import type { ReadOnlyViewerHandle } from './manager';

export type EventMessage = {
    [string]: any,
};

// TODO: make this a union of all the known event types?
export type Event = {
    +eventName: string,
    +message: EventMessage,
};

// =================================================================================================
// Published events.
// -----------------

export type OnViewerMouseOverEvent = {|
    // When the mouse enters the viewer
    eventName: 'onViewerMouseOver',
    message: {|
        publisher: ReadOnlyViewerHandle,
    |},
|};

export type OnViewerClickEvent = {|
    // When the viewer is clicked
    eventName: 'onViewerClick',
    message: {|
        publisher: ReadOnlyViewerHandle,
    |},
|};

export type OnViewerDoubleClickEvent = {|
    // When the viewer is double clicked
    eventName: 'onViewerDoubleClick',
    message: {|
        publisher: ReadOnlyViewerHandle,
    |},
|};

export type OnViewerMouseOutEvent = {|
    // When the mouse leaves the viewer
    eventName: 'onViewerMouseOut',
    message: {|
        publisher: ReadOnlyViewerHandle,
    |},
|};

export type OnViewerMouseEvent =
    | OnViewerMouseOverEvent
    | OnViewerClickEvent
    | OnViewerDoubleClickEvent
    | OnViewerMouseOutEvent;

export type OnResizeEvent = {|
    eventName: 'onResize',
    message: {|
        publisher: ReadOnlyViewerHandle,
        oldSize: PrimitiveSize,
        newSize: PrimitiveSize,
    |},
|};

export type OnKeyDownEvent = {|
    eventName: 'onKeyDown',
    message: {|
        key: string,
    |}
|};

export type OnKeyUpEvent = {|
    eventName: 'onKeyUp',
    message: {|
        key: string,
    |}
|};

export type OnFocusSelectedEvent = {|
    eventName: 'onFocusSelected',
    message: {|
        parentViewerId: string,
        childViewerId: string,
    |},
|}

// =================================================================================================
// Subscribed events.
// ------------------

export type ResizeEvent = {|
    eventName: 'resize',
    message: {|
        viewerId: string,
        newSize: PrimitiveSize,
    |},
|};

// Subscription events
export type HighlightEvent = {|
    eventName: 'highlight' | 'unhighlight',
    message: {|
        viewerId: string,
    |},
|};

export type FocusSelectedEvent = {|
    eventName: 'focusSelected',
    message: {|
        viewerId: string,
    |}
|}

// =================================================================================================
// ???
// ---

export type MouseEventProps = {
    onClick: (e: SyntheticEvent<>) => void,
    onDoubleClick: (e: SyntheticEvent<>) => void,
    onMouseOver: (e: SyntheticEvent<>) => void,
    onMouseOut: (e: SyntheticEvent<>) => void,
};

/**
 * HOC that allows a component to consume the events to which it subscribes.
 *
 * @param handlers
 * @param Component
 */
export function consumeEvents(handlers: {[string]: (component: any, message: any) => void}, Component) {
    return class extends React.Component {
        render() {
            const { lastEvents, consumeEvent } = this.props;
            const eventHandler = (component) => {
                lastEvents.forEach((event) => {
                    if (event.eventName in handlers) {
                        handlers[event.eventName](component, event.message);
                    }
                    consumeEvent(event);
                });
            };
            return <Component eventHandler={eventHandler} {...this.props} />
        }
    }
}

// TODO: move elsewhere and determine possible values
export type PrimitiveSize = 'small' | 'medium' | 'large';

export function getViewerMouseFunctions(
    publishEvent: (OnViewerMouseEvent) => void,
    viewerHandle: ReadOnlyViewerHandle) : MouseEventProps {
    return {
        onClick: (e) => {
            e.stopPropagation();
            publishEvent({
                eventName: 'onViewerClick',
                message: {
                    publisher: viewerHandle,
                },
            });
        },
        onDoubleClick: (e) => {
            e.stopPropagation();
            publishEvent({
                eventName: 'onViewerDoubleClick',
                message: {
                    publisher: viewerHandle,
                },
            });
        },
        onMouseOver: (e) => {
            e.stopPropagation();
            publishEvent({
                eventName: 'onViewerMouseOver',
                message: {
                    publisher: viewerHandle,
                },
            });
        },
        onMouseOut: (e) => {
            e.stopPropagation();
            publishEvent({
                eventName: 'onViewerMouseOut',
                message: {
                    publisher: viewerHandle,
                },
            });
        },
    };
}
