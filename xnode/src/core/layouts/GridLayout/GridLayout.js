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
    ReadOnlyViewerHandle,
    OnViewerMouseEvent,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';


/**
 * This pure dumb component renders visualization for a 2D grid of elements.
 * TODO: Allow element-type-specific background coloring.
 */
type GridLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    /** Events published to this view's `InteractionManager` which should be consumed by this
     * view. The message of each event in this array includes a "viewerId" field which is equal to
     * `props.viewerHandle.viewerId`. Each event in the array should be consumed only once. */
    lastEvents: Array<GridLayoutSub>,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: GridLayoutPub) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements which should be rendered as children of the `GridLayout`. */
    elements: {
        viewId: ViewId,
        col: number,
        row: number,
        width: number,
        height: number,
    }[],
};

type GridLayoutDefaultProps = {};

type GridLayoutState = {};

type GridLayoutPub = OnViewerMouseEvent;
type GridLayoutSub = {};

class GridLayout extends React.PureComponent<GridLayoutProps, GridLayoutState> {
    /** Prop default values. */
    static defaultProps: GridLayoutDefaultProps = {};

    constructor(props: GridLayoutProps) {
        super(props);
        this.state = {};
    }

    componentDidUpdate(prevProps, prevState) {
        const { lastEvents } = this.props;
        lastEvents.forEach((event: GridLayoutSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
        });
    }
    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const {
            classes,
            elements,
            viewerHandle,
            publishEvent,
            viewerToViewerProps,
        } = this.props;

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                })}
                {...getViewerMouseFunctions(publishEvent, viewerHandle)}
            >
                {elements.map(({ viewId, col, row, width, height }) => {
                    return (
                        <div
                            key={viewId}
                            className={classNames({
                                [classes.cell]: true,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }}
                        >
                            <Viewer {...viewerToViewerProps} viewId={viewId} />
                        </div>
                    );
                })}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        display: 'inline-grid',
        verticalAlign: 'middle',
        gridGap: `${theme.spacing.large}px`, // Need px.
        justifyContent: 'start',
        gridAutoColumns: 'max-content',
        gridAutoRows: 'max-content',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
    },
    compactGrid: {
        gridGap: `${theme.spacing.large}px`, // Need px.
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
    cell: {
        textAlign: 'left',
    },
});

export default withStyles(styles)(
    GridLayout,
);
