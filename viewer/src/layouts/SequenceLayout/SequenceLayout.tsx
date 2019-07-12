import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { SequenceLayoutFragment, FragmentId } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';

import {
    ViewerId,
    ViewerHandle,
    ViewerDidMouseEvent,
    ViewerDidHighlightEvent,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type SequenceLayoutProps = FragmentProps<SequenceLayoutFragment>;

type SequenceLayoutState = {
    isHighlighted: boolean,
    selectedElementIdx: number,
};

export type SequenceLayoutHandle = {
    isHighlighted: boolean,
    selectedElementIdx: number,
    elements: ViewerHandle[],
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectElement: (elementIdx: number) => void,
    doIncrementElement: (elementIdxDelta: number) => void,
};

type SequenceLayoutDefaultProps = {
    orientation: 'horizontal',
};

export type SequenceDidChangeElementEvent = {
    topic: 'Sequence.DidChangeElement',
    message: {
        viewerId: ViewerId,
    },
};

type SequenceLayoutEvent =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | SequenceDidChangeElementEvent;

class SequenceLayout extends React.PureComponent<SequenceLayoutProps & InternalProps, SequenceLayoutState> {
    /** Prop default values. */
    static defaultProps: SequenceLayoutDefaultProps = {
        orientation: 'horizontal',
    };

    private _elementFactories: Array<() => ViewerHandle | null> = [() => null];

    constructor(props: SequenceLayoutProps & InternalProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedElementIdx: 0,
        };
    }

    private _getHandle(): SequenceLayoutHandle {
        const { isHighlighted, selectedElementIdx } = this.state;
        return {
            selectedElementIdx,
            elements: this._elementFactories.map((factory) => factory()),
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
        };
    }

    componentDidMount() {
        const { registerFragmentHandleFactory: registerFragmentHandle } = this.props.interactions;
        registerFragmentHandle(() => this._getHandle());
    }

    componentDidUpdate(prevProps, prevState) {
        const { viewerId, emitEvent } = this.props.interactions;
        const { isHighlighted, selectedElementIdx } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent('Viewer.DidHighlight', {
                    viewerId: viewerId,
                });
            } else {
                emitEvent('Viewer.DidUnhighlight', {
                    viewerId: viewerId,
                });
            }
        }
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emitEvent('Sequence.DidChangeElement', {
                viewerId: viewerId,
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
            passdown,
            interactions,
            orientation,
            startMotif,
            endMotif,
        } = this.props;
        const { emitEvent, viewerId } = interactions;
        const { isHighlighted, selectedElementIdx } = this.state;

        this._elementFactories = elements.map(() => () => null);

        return (
            <div
                className={clsx({
                    [classes.root]: true,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                <div
                    className={clsx({
                        [classes.motif]: true,
                        [classes.horizontal]: orientation === 'horizontal',
                        [classes.vertical]: orientation === 'vertical',
                    })}
                >
                    {startMotif}
                </div>
                {elements.map((fragmentId: FragmentId, i: number) => {
                    return (
                        <div
                            className={clsx({
                                [classes.cell]: true,
                                [classes.horizontal]: orientation === 'horizontal',
                                [classes.vertical]: orientation === 'vertical',
                                [classes.cellSelected]: isHighlighted && selectedElementIdx === i,
                            })}
                            key={i}
                        >
                            <Viewer
                                {...passdown}
                                fragmentId={fragmentId}
                                registerViewerHandleFactory={(factory) => this._elementFactories[i] = factory}
                            />
                        </div>
                    );
                })}
                <div
                    className={clsx({
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
// TODO: update to match SwitchLayout
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

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(SequenceLayout) as React.ComponentClass<SequenceLayoutProps>;
