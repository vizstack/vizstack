// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { ViewId } from '../../schema';
import type { ViewerToViewerProps } from '../../Viewer';
import type {
    Event,
    EventMessage,
    MouseEventProps,
    HighlightEvent,
    OnViewerMouseEvent,
    FocusSelectedEvent,
    OnFocusSelectedEvent,
    ReadOnlyViewerHandle,
} from '../../interaction';
import { getViewerMouseFunctions, consumeEvents } from '../../interaction';


/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type FlowLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    eventHandler: (FlowLayout) => void,

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

type FlowLayoutState = {
    selectedElementIdx: number,
    isHighlighted: boolean,
};

type FlowLayoutPub = OnViewerMouseEvent | OnFocusSelectedEvent;

export type FlowSelectElementEvent = {|
    eventName: 'flowSelectElement',
    message: {|
        viewerId: string,
        elementIdx: number,
    |} | {|
        viewerId: string,
        idxDelta: number,
    |},
|}

type FlowLayoutSub = HighlightEvent | FocusSelectedEvent;

class FlowLayout extends React.PureComponent<FlowLayoutProps, FlowLayoutState> {
    /** Prop default values. */
    static defaultProps: FlowLayoutDefaultProps = {};

    childRefs = [];

    constructor(props) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
            isHighlighted: false,
        }
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
        const { classes, elements, viewerToViewerProps, publishEvent, viewerHandle } = this.props;

        this.childRefs = [];

        // TODO: show which element is selected
        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
                {...getViewerMouseFunctions(publishEvent, viewerHandle)}
            >
                {elements.map((viewId, i) => {
                    const ref = React.createRef();
                    this.childRefs.push(ref);
                    return <Viewer key={i} ref={ref} {...viewerToViewerProps} viewId={viewId} />;
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
    consumeEvents({
        highlight: (layout) => {
            layout.setState((state) => ({
                isHighlighted: true,
            }));
        },
        unhighlight: (layout) => {
            layout.setState((state) => ({
                isHighlighted: false,
            }));
        },
        focusSelected: (layout) => {
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
        flowSelectElement: (layout, message) => {
            const { elements } = layout.props;
            layout.setState((state) => {
                let newIdx = message.idxDelta === undefined ? message.elementIdx : state.selectedElementIdx + message.idxDelta;
                while (newIdx < 0) {
                    newIdx += elements.length;
                }
                while (newIdx >= elements.length) {
                    newIdx -= elements.length;
                }
                return { selectedElementIdx: newIdx };
            })
        }
    }, FlowLayout));
