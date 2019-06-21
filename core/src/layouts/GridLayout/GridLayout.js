// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { ViewerToViewerProps } from '../../Viewer';

import type { ViewId } from '../../schema';
import type {
    Event,
    EventMessage,
    MouseEventProps,
    ReadOnlyViewerHandle,
    OnViewerMouseEvent,
    HighlightEvent,
    FocusSelectedEvent,
    OnFocusSelectedEvent,
} from '../../interaction';
import { getViewerMouseFunctions,
    consumeEvents } from '../../interaction';


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

    eventHandler: (GridLayout) => void,

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

type GridLayoutState = {
    isHighlighted: boolean,
    selectedElementIdx: number,
};

type GridLayoutPub = OnViewerMouseEvent | OnFocusSelectedEvent;

export type GridSelectCellEvent = {|
    eventName: 'gridSelectCell',
    message: {|
        viewerId: string,
        elementIdx: number,
    |} | {|
        viewerId: string,
        moveCursor: 'up' | 'down' | 'left' | 'right',
    |},
|}

type GridLayoutSub = HighlightEvent | GridSelectCellEvent | FocusSelectedEvent;

class GridLayout extends React.PureComponent<GridLayoutProps, GridLayoutState> {
    childRefs = [];

    /** Prop default values. */
    static defaultProps: GridLayoutDefaultProps = {};

    constructor(props: GridLayoutProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedElementIdx: 0,
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
        const {
            classes,
            elements,
            viewerHandle,
            publishEvent,
            viewerToViewerProps,
        } = this.props;

        const {
            isHighlighted,
            selectedElementIdx,
        } = this.state;

        this.childRefs = [];

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                })}
                {...getViewerMouseFunctions(publishEvent, viewerHandle)}
            >
                {elements.map(({ viewId, col, row, width, height }, i) => {
                    const ref = React.createRef();
                    this.childRefs.push(ref);
                    return (
                        <div
                            key={viewId}
                            className={classNames({
                                [classes.cell]: true,
                                [classes.cellSelected]: isHighlighted && selectedElementIdx === i,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }}
                        >
                            <Viewer {...viewerToViewerProps} viewId={viewId} ref={ref}/>
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
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: "rgba(255, 0, 0, 0)",
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    }
});

export default withStyles(styles)(
    consumeEvents(
        {
            'highlight': (layout) => {
                layout.setState((state) => ({
                    isHighlighted: true,
                }));
            },
            'unhighlight': (layout) => {
                layout.setState((state) => ({
                    isHighlighted: false,
                }));
            },
            'focusSelected': (layout) => {
                const { childRefs } = layout;
                const { selectedElementIdx } = layout.state;
                const { publishEvent, viewerHandle } = layout.props;
                publishEvent({
                    eventName: 'onFocusSelected',
                    message: {
                        parentViewerId: viewerHandle.viewerId,
                        childViewerId: childRefs[selectedElementIdx].current.viewerId,
                    }
                })
            },
            'gridSelectCell': (layout, message) => {
                layout.setState((state) => {
                    if (message.elementIdx !== undefined) {
                        return { selectedElementIdx: message.elementIdx };
                    }
                    const { elements } = layout.props;
                    let mainAxis, offAxis, increaseMainAxis;
                    switch (message.moveCursor) {
                        case 'down':
                            mainAxis = 'row'; offAxis = 'col'; increaseMainAxis = true;
                            break;
                        case 'right':
                            mainAxis = 'col'; offAxis = 'row'; increaseMainAxis = true;
                            break;
                        case 'up':
                            mainAxis = 'row'; offAxis = 'col'; increaseMainAxis = false;
                            break;
                        case 'left':
                            mainAxis = 'col'; offAxis = 'row'; increaseMainAxis = false;
                            break;
                    }
                    let closest = -1;
                    elements.forEach((elem, i) => {
                        if (i === state.selectedElementIdx) {
                            return;
                        }
                        if ((increaseMainAxis && elem[mainAxis] <= elements[state.selectedElementIdx][mainAxis]) || (!increaseMainAxis && elem[mainAxis] >= elements[state.selectedElementIdx][mainAxis])) {
                            return;
                        }
                        if (closest === -1 ||
                            (increaseMainAxis ? elem[mainAxis] < elements[closest][mainAxis] : elem[mainAxis] > elements[closest][mainAxis]) ||
                            (
                                elem[mainAxis] === elements[closest][mainAxis] && (
                                    (
                                        elements[closest][offAxis] >= elements[state.selectedElementIdx][offAxis] &&
                                        elem[offAxis] >= elements[state.selectedElementIdx][offAxis] &&
                                        elem[offAxis] - elements[state.selectedElementIdx][offAxis] < elements[closest][offAxis] - elements[state.selectedElementIdx][offAxis]
                                    ) || (
                                        elements[closest][offAxis] < elements[state.selectedElementIdx][offAxis] &&
                                        elem[offAxis] > elements[closest][offAxis]
                                    )
                                )
                            )) {
                            closest = i;
                        }
                    });
                    if (closest >= 0) {
                        return { selectedElementIdx: closest };
                    }
                    else {
                        return {};
                    }
                })
            }
        },
        GridLayout
    ),
);
