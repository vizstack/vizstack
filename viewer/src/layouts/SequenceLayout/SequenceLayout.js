// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { FragmentId } from '@vizstack/schema';
import type { ViewerToViewerProps } from '../../Viewer';
import type { ViewerDidMouseEvent, ViewerDidHighlightEvent, ViewerId } from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type SequenceLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (SequenceLayoutHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: SequenceLayoutPub>(
        $PropertyType<E, 'topic'>,
        $PropertyType<E, 'message'>,
    ) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that will be rendered as `Viewer`s. */
    elements: Array<FragmentId>,

    /** Whether the sequence is arranged horizontally or vertically. */
    orientation?: 'horizontal' | 'vertical',

    /** A string to show at the beginning of the sequence. */
    startMotif?: string,

    /** A string to show at the end of the sequence. */
    endMotif?: string,
};

export type SequenceLayoutHandle = {|
    selectedElementIdx: number,
    selectedViewerId: ?ViewerId,
    isHighlighted: boolean,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectElement: (elementIdx: number) => void,
    doIncrementElement: (elementIdxDelta: number) => void,
|};

type SequenceLayoutDefaultProps = {|
    updateHandle: (SequenceLayoutHandle) => void,
    orientation: 'horizontal',
|};

type SequenceLayoutState = {|
    selectedElementIdx: number,
    isHighlighted: boolean,
|};

export type SequenceDidChangeElementEvent = {|
    topic: 'Sequence.DidChangeElement',
    message: {|
        viewerId: ViewerId,
    |},
|};

type SequenceLayoutPub =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | SequenceDidChangeElementEvent;

class SequenceLayout extends React.PureComponent<SequenceLayoutProps, SequenceLayoutState> {
    /** Prop default values. */
    static defaultProps: SequenceLayoutDefaultProps = {
        updateHandle: () => {},
        orientation: 'horizontal',
    };

    childRefs: Array<{ current: null | Viewer }> = [];

    constructor(props) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
            isHighlighted: false,
        };
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted, selectedElementIdx } = this.state;
        updateHandle({
            selectedElementIdx,
            selectedViewerId:
                this.childRefs.length > selectedElementIdx &&
                this.childRefs[selectedElementIdx].current
                    ? this.childRefs[selectedElementIdx].current.viewerId
                    : null,
            isHighlighted,
            doHighlight: () => {
                this.setState({ isHighlighted: true });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false });
            },
            doSelectElement: (elementIdx) => {
                this.setState({ selectedElementIdx: elementIdx });
            },
            doIncrementElement: (elementIdxDelta = 1) => {
                const { elements } = this.props;
                this.setState((state) => {
                    let elementIdx = state.selectedElementIdx + elementIdxDelta;
                    while (elementIdx < 0) {
                        elementIdx += elements.length;
                    }
                    while (elementIdx >= elements.length) {
                        elementIdx -= elements.length;
                    }
                    return { selectedElementIdx: elementIdx };
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
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            } else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            }
        }
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emitEvent<SequenceDidChangeElementEvent>('Sequence.DidChangeElement', {
                viewerId: (viewerId: ViewerId),
            });
        }
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
            viewerToViewerProps,
            emitEvent,
            viewerId,
            orientation,
            startMotif,
            endMotif,
        } = this.props;
        const { isHighlighted, selectedElementIdx } = this.state;

        this.childRefs = [];

        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                <div
                    className={classNames({
                        [classes.motif]: true,
                        [classes.horizontal]: orientation === 'horizontal',
                        [classes.vertical]: orientation === 'vertical',
                    })}
                >
                    {startMotif}
                </div>
                {elements.map((fragmentId, i) => {
                    const ref = React.createRef();
                    this.childRefs.push(ref);
                    return (
                        <div
                            className={classNames({
                                [classes.cell]: true,
                                [classes.horizontal]: orientation === 'horizontal',
                                [classes.vertical]: orientation === 'vertical',
                                [classes.cellSelected]: isHighlighted && selectedElementIdx === i,
                            })}
                        >
                            <Viewer
                                key={i}
                                ref={ref}
                                {...viewerToViewerProps}
                                fragmentId={fragmentId}
                            />
                        </div>
                    );
                })}
                <div
                    className={classNames({
                        [classes.motif]: true,
                        [classes.horizontal]: orientation === 'horizontal',
                        [classes.vertical]: orientation === 'vertical',
                    })}
                >
                    {endMotif}
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    root: {
        display: 'inline-block',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        whiteSpace: 'nowrap',
    },
    cell: {
        margin: theme.spacing.large,
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: 'rgba(255, 0, 0, 0)',
    },
    motif: {
        margin: theme.spacing.large,
    },
    horizontal: {
        display: 'inline-block',
    },
    vertical: {
        display: 'block',
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(SequenceLayout);
