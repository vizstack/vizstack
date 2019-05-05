// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../Viewer';
import type { ViewId } from '../../schema';
import type { ViewerToViewerProps } from '../../Viewer';
import type {
    Event,
    EventMessage,
    MouseEventProps,
    OnChildMouseEvent,
    OnMouseEvent,
    ReadOnlyViewerHandle,
} from '../../interaction';
import { useMouseInteractions } from '../../interaction';

type FlowLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** Property inherited from the `useMouseInteractions()` HOC. Publish mouse interaction-related
     * events when spread onto an HTML element. */
    mouseProps: MouseEventProps,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    /** Events published to this view's `InteractionManager` which should be consumed by this
     * view. The message of each event in this array includes a "viewerId" field which is equal to
     * `props.viewerHandle.viewerId`. Each event in the array should be consumed only once. */
    lastEvents: Array<FlowLayoutSub>,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: FlowLayoutPub) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewId>,
};

type FlowLayoutDefaultProps = {};

type FlowLayoutState = {};

type FlowLayoutPub = OnMouseEvent | OnChildMouseEvent;
type FlowLayoutSub = {};

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class FlowLayout extends React.PureComponent<FlowLayoutProps, FlowLayoutState> {
    /** Prop default values. */
    static defaultProps: FlowLayoutDefaultProps = {};

    componentDidUpdate(prevProps, prevState) {
        const { lastEvents } = this.props;
        lastEvents.forEach((event: FlowLayoutSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
        });
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, viewerToViewerProps, mouseProps } = this.props;

        // TODO: deal with child mouse events; see GridLayout.

        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
                {...mouseProps}
            >
                {elements.map((viewId, i) => {
                    return <Viewer key={i} {...viewerToViewerProps} viewId={viewId} />;
                })}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    root: {
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: 'transparent',
    },
    hovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(
    useMouseInteractions<React.Config<FlowLayoutProps, FlowLayoutDefaultProps>>(FlowLayout),
);
