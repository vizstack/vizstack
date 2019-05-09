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
    OnChildMouseEvent,
    OnMouseEvent,
    ReadOnlyViewerHandle,
    HighlightEvent,
    UnhighlightEvent,
    IncrementEvent,
} from '../../interaction';
import { useMouseInteractions } from '../../interaction';


/**
 * This pure dumb component renders visualization for a stack of elements that can be switched
 * between.
 */
type SwitchLayoutProps = {
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
    lastEvents: Array<SwitchLayoutSub>,

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

type SwitchLayoutPub = OnMouseEvent | OnChildMouseEvent;
type SwitchLayoutSub = HighlightEvent | UnhighlightEvent | IncrementEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps, SwitchLayoutState> {
    /** Prop default values. */
    static defaultProps: SwitchLayoutDefaultProps = {};

    constructor(props: SwitchLayoutProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            currElementIdx: 0,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        const { lastEvents, elements } = this.props;
        lastEvents.forEach((event: SwitchLayoutSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
            if (event.eventName === 'highlight') {
                this.setState({ isHighlighted: true });
            }
            if (event.eventName === 'unhighlight') {
                this.setState({ isHighlighted: false });
            }
            if (event.eventName === 'increment') {
                this.setState((state) => ({
                    currElementIdx: state.currElementIdx + 1 < elements.length
                                    ? state.currElementIdx + 1
                                    : 0,
                }));
            }
        });
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, mouseProps, viewerToViewerProps } = this.props;
        const { isHighlighted, currElementIdx } = this.state;

        const viewId = elements[currElementIdx];

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                    [classes.containerHovered]: isHighlighted,
                })}
                {...mouseProps}
            >
                <div key={viewId}>
                    <Viewer {...viewerToViewerProps} viewId={viewId} />
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
    useMouseInteractions<React.Config<SwitchLayoutProps, SwitchLayoutDefaultProps>>(SwitchLayout),
);
