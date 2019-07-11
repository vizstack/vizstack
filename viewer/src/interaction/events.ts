/* This file exports the `Event` type, `Event` subtypes which are shared across `Viewer`s, and
 * `getViewerMouseFunctions()`, which allows `Viewer` components to publish mouse-related events. */

import * as React from 'react';

import { ViewerId } from './manager';

export type Event = {
    readonly topic: string;
    readonly message: Record<string, any>;
};``

export type ViewerDidMouseOverEvent = {
    topic: 'Viewer.DidMouseOver';
    message: {
        viewerId: ViewerId;
    };
};

export type ViewerDidClickEvent = {
    topic: 'Viewer.DidClick';
    message: {
        viewerId: ViewerId;
    };
};

export type ViewerDidDoubleClickEvent = {
    topic: 'Viewer.DidDoubleClick';
    message: {
        viewerId: ViewerId;
    };
};

export type ViewerDidMouseOutEvent = {
    topic: 'Viewer.DidMouseOut';
    message: {
        viewerId: ViewerId;
    };
};

export type ViewerDidMouseEvent =
    | ViewerDidMouseOverEvent
    | ViewerDidClickEvent
    | ViewerDidDoubleClickEvent
    | ViewerDidMouseOutEvent;

export type ViewerDidHighlightEvent =
    | {
          topic: 'Viewer.DidHighlight';
          message: {
              viewerId: ViewerId;
          };
      }
    | {
          topic: 'Viewer.DidUnhighlight';
          message: {
              viewerId: ViewerId;
          };
      };

export type MouseEventProps = {
    onClick: (e: React.SyntheticEvent) => void;
    onDoubleClick: (e: React.SyntheticEvent) => void;
    onMouseOver: (e: React.SyntheticEvent) => void;
    onMouseOut: (e: React.SyntheticEvent) => void;
};

/**
 * Creates an object which, when spread on an HTML element, causes that element to publish mouse
 * events.
 *
 * @param emitEvent
 *     The function which publishes the event to an `InteractionManager`.
 * @param viewerId
 *     The `ViewerId` of the `Viewer` which is rendering the `HTMLElement` that publishes the
 *     events.
 * @returns
 *     Props with mouse event handler functions.
 */
export function getViewerMouseFunctions(
    emitEvent: (topic: string, message: Record<string, any>) => void,
    viewerId: ViewerId,
): MouseEventProps {
    return {
        onClick: (e) => {
            e.stopPropagation();
            emitEvent('Viewer.DidClick', { viewerId });
        },
        onDoubleClick: (e) => {
            e.stopPropagation();
            emitEvent('Viewer.DidDoubleClick', { viewerId });
        },
        onMouseOver: (e) => {
            e.stopPropagation();
            emitEvent('Viewer.DidMouseOver', { viewerId });
        },
        onMouseOut: (e) => {
            e.stopPropagation();
            emitEvent('Viewer.DidMouseOut', { viewerId });
        },
    };
}
