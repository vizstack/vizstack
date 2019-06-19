// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../Viewer';
import type { ViewerToViewerProps } from '../../Viewer';

import type { ViewId } from '../../schema';
import type {
    Event,
    EventMessage,
    MouseEventProps,
    OnViewerMouseEvent,
    ReadOnlyViewerHandle,
    HighlightEvent,
    FocusSelectedEvent,
    OnFocusSelectedEvent,
} from '../../interaction';
import {getViewerMouseFunctions, consumeEvents} from '../../interaction';


/**
 * This pure dumb component renders visualization for a stack of elements that can be switched
 * between.
 */
type SwitchLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    eventHandler: (SwitchLayout) => void,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: SwitchLayoutPub) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: ViewId[],
};

type SwitchLayoutDefaultProps = {};

type SwitchLayoutState = {
    isHighlighted: boolean,
    currElementIdx: number,
};

export type OnSwitchChangeModeEvent = {|
    eventName: 'onSwitchIncrement',
    message: {|
        newModeIdx: number,
    |}
|};

type SwitchLayoutPub = OnViewerMouseEvent | OnSwitchChangeModeEvent | OnFocusSelectedEvent;

export type SwitchChangeModeEvent = {|
    eventName: 'switchChangeMode',
    message: {|
        viewerId: string,
        idxDelta: number,
    |} | {|
        viewerId: string,
        modeIdx: number,
    |},
|};

type SwitchLayoutSub = HighlightEvent | SwitchChangeModeEvent | FocusSelectedEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps, SwitchLayoutState> {
    /** Prop default values. */
    static defaultProps: SwitchLayoutDefaultProps = {};

    childRef;

    constructor(props: SwitchLayoutProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            currElementIdx: 0,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        this.props.eventHandler(this);
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, publishEvent, viewerHandle, viewerToViewerProps } = this.props;
        const { isHighlighted, currElementIdx } = this.state;

        const viewId = elements[currElementIdx];

        this.childRef = React.createRef();

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                    [classes.containerHovered]: isHighlighted,
                })}
                {...getViewerMouseFunctions(publishEvent, viewerHandle)}
            >
                <div key={viewId}>
                    <Viewer {...viewerToViewerProps} viewId={viewId} ref={this.childRef}/>
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        padding: theme.spacing.unit,
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(
    consumeEvents({
        'highlight': (layout) => layout.setState({ isHighlighted: true }),
        'unhighlight': (layout) => layout.setState({ isHighlighted: false }),
        'focusSelected': (layout) => {
            const { childRef } = layout;
            const { viewerHandle, publishEvent } = layout.props;
            publishEvent({
                eventName: 'onFocusSelected',
                message: {
                    parentViewerId: viewerHandle.viewerId,
                    childViewerId: childRef.current.viewerId,
                }
            })
        },
        'switchChangeMode': (layout, message) => {
            const { elements } = layout.props;
            layout.setState((state) => {
                let newIdx = message.idxDelta === undefined ? message.modeIdx : state.currElementIdx + message.idxDelta;
                while (newIdx < 0) {
                    newIdx += elements.length;
                }
                while (newIdx >= elements.length) {
                    newIdx -= elements.length;
                }
                return { currElementIdx: newIdx };
            });
        },
    }, SwitchLayout)
);
