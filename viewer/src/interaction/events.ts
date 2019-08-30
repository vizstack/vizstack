/* This file exports the `Event` type, `Event` subtypes which are shared across `Viewer`s, and
 * `getViewerMouseFunctions()`, which allows `Viewer` components to publish mouse-related events. */

import { ViewerId } from './manager';

export type ViewerDidMouseOverEvent = {
    topic: 'Viewer.DidMouseOver';
    message: { viewerId: ViewerId };
};

export type ViewerDidClickEvent = {
    topic: 'Viewer.DidClick';
    message: { viewerId: ViewerId };
};

export type ViewerDidDoubleClickEvent = {
    topic: 'Viewer.DidDoubleClick';
    message: { viewerId: ViewerId };
};

export type ViewerDidMouseOutEvent = {
    topic: 'Viewer.DidMouseOut';
    message: { viewerId: ViewerId };
};

export type ViewerDidMouseEvent =
    | ViewerDidMouseOverEvent
    | ViewerDidClickEvent
    | ViewerDidDoubleClickEvent
    | ViewerDidMouseOutEvent;

export type ViewerDidChangeLightEvent = {
    topic: 'Viewer.DidChangeLight';
    message: {
        viewerId: ViewerId;
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    };
};
