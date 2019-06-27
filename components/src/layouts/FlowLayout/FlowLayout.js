// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { ViewId } from '../../schema';
import type { ViewerToViewerProps } from '../../Viewer';
import type {
    ViewerDidMouseEvent, ViewerDidHighlightEvent, ViewerId,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';


/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type FlowLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (FlowLayoutHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: FlowLayoutPub>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewId>,
};

export type FlowLayoutHandle = {|
    selectedElementIdx: number,
    selectedViewerId: ?ViewerId,
    isHighlighted: boolean,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectElement: (elementIdx: number) => void,
    doIncrementElement: (elementIdxDelta: number) => void,
|};

type FlowLayoutDefaultProps = {|
    updateHandle: (FlowLayoutHandle) => void,
|};

type FlowLayoutState = {|
    selectedElementIdx: number,
    isHighlighted: boolean,
|};

export type FlowDidChangeElementEvent = {|
    topic: 'Flow.DidChangeElement',
    message: {|
        viewerId: ViewerId,
    |},
|}

type FlowLayoutPub = ViewerDidMouseEvent | ViewerDidHighlightEvent | FlowDidChangeElementEvent;

class FlowLayout extends React.PureComponent<FlowLayoutProps, FlowLayoutState> {
    /** Prop default values. */
    static defaultProps: FlowLayoutDefaultProps = {
        updateHandle: () => {},
    };

    childRefs: Array<{current: null | Viewer}> = [];

    constructor(props) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
            isHighlighted: false,
        }
    }

    _updateHandle() {
        const { emitEvent, updateHandle, viewerId } = this.props;
        const { isHighlighted, selectedElementIdx, } = this.state;
        updateHandle({
            selectedElementIdx,
            selectedViewerId: this.childRefs.length > selectedElementIdx && this.childRefs[selectedElementIdx].current ? this.childRefs[selectedElementIdx].current.viewerId : null,
            isHighlighted,
            doHighlight: () => {
                this.setState({ isHighlighted: true, });
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', { viewerId: (viewerId: ViewerId), });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false, });
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', { viewerId: (viewerId: ViewerId), });
            },
            doSelectElement: (elementIdx) => {
                this.setState({ selectedElementIdx: elementIdx });
            },
            doIncrementElement: (elementIdxDelta) => {
                const { elements } = this.props;
                this.setState((state) => {
                    let elementIdx = state.selectedElementIdx + elementIdxDelta;
                    while (elementIdx < 0) {
                        elementIdx += elements.length;
                    }
                    while (elementIdx >= elements.length) {
                        elementIdx -= elements.length;
                    }
                    return {selectedElementIdx: elementIdx};
                });
            },
        });
    }

    componentDidMount() {
        this._updateHandle();
    }

    componentDidUpdate(prevProps, prevState) {
        this._updateHandle();
        const { viewerId, emitEvent } = this.props;
        const { isHighlighted, selectedElementIdx } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', { viewerId: (viewerId: ViewerId), });
            }
            else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', { viewerId: (viewerId: ViewerId), });
            }
        }
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emitEvent<FlowDidChangeElementEvent>('Flow.DidChangeElement', { viewerId: (viewerId: ViewerId), });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, viewerToViewerProps, emitEvent, viewerId } = this.props;

        this.childRefs = [];

        // TODO: show which element is selected
        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
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

export default withStyles(styles)(FlowLayout);
