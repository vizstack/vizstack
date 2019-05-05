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

export type OnMouseOverEvent = {|
    // When the mouse enters the viewer
    eventName: 'onMouseOver',
    message: {
        publisher: ReadOnlyViewerHandle,
    },
|};

export type OnClickEvent = {|
    // When the viewer is clicked
    eventName: 'onClick',
    message: {
        publisher: ReadOnlyViewerHandle,
    },
|};

export type OnDoubleClickEvent = {|
    // When the viewer is double clicked
    eventName: 'onDoubleClick',
    message: {
        publisher: ReadOnlyViewerHandle,
    },
|};

export type OnMouseOutEvent = {|
    // When the mouse leaves the viewer
    eventName: 'onMouseOut',
    message: {
        publisher: ReadOnlyViewerHandle,
    },
|};

export type OnMouseEvent = OnMouseOverEvent | OnClickEvent | OnDoubleClickEvent | OnMouseOutEvent;

export type OnChildMouseOverEvent = {|
    eventName: 'onChildMouseOver',
    message: {
        publisher: ReadOnlyViewerHandle,
        childPosition: string,
    },
|};

export type OnChildMouseOutEvent = {|
    eventName: 'onChildMouseOut',
    message: {
        publisher: ReadOnlyViewerHandle,
        childPosition: string,
    },
|};

// TODO: determine position naming conventions
// TODO: should we pass a handle to the child? if so, how?
export type OnChildMouseEvent = OnChildMouseOverEvent | OnChildMouseOutEvent;

export type OnResizeEvent = {|
    eventName: 'onResize',
    message: {
        publisher: ReadOnlyViewerHandle,
        oldSize: PrimitiveSize,
        newSize: PrimitiveSize,
    },
|};

// =================================================================================================
// Subscribed events.
// ------------------

export type ResizeEvent = {|
    eventName: 'resize',
    message: {
        viewerId: string,
        newSize: PrimitiveSize,
    },
|};

// Subscription events
export type HighlightEvent = {|
    eventName: 'highlight',
    message: {
        viewerId: string,
    },
|};

export type UnhighlightEvent = {|
    eventName: 'unhighlight',
    message: {
        viewerId: string,
    },
|};

export type IncrementEvent = {|
    eventName: 'increment',
    message: {
        viewerId: string,
    },
|};

// =================================================================================================
// ???
// ---

export type MouseEventProps = {
    onClick: (e: SyntheticEvent<>) => void,
    onDoubleClick: (e: SyntheticEvent<>) => void,
    onMouseOver: (e: SyntheticEvent<>) => void,
    onMouseOut: (e: SyntheticEvent<>) => void,
};

// TODO: move elsewhere and determine possible values
export type PrimitiveSize = 'small' | 'medium' | 'large';

export function useMouseInteractions<Config: {}>(
    Component: React.ComponentType<Config>,
): React.ComponentType<Config> {
    return (props) => {
        const { publishEvent, viewerHandle } = props;
        const mouseProps: MouseEventProps = {
            onClick: (e) => {
                e.stopPropagation();
                publishEvent({
                    eventName: 'onClick',
                    message: {
                        publisher: viewerHandle,
                    },
                });
            },
            onDoubleClick: (e) => {
                e.stopPropagation();
                publishEvent({
                    eventName: 'onDoubleClick',
                    message: {
                        publisher: viewerHandle,
                    },
                });
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                publishEvent({
                    eventName: 'onMouseOver',
                    message: {
                        publisher: viewerHandle,
                    },
                });
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                publishEvent({
                    eventName: 'onMouseOut',
                    message: {
                        publisher: viewerHandle,
                    },
                });
            },
        };
        return <Component {...props} mouseProps={mouseProps} />;
    };
}
