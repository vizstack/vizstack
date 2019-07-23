import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { SequenceLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout.
 * TODO: Ensure on change of props.elements _childViewerFactories is updated too.
 */
type SequenceLayoutProps = FragmentProps<SequenceLayoutFragment>;

type SequenceLayoutState = {
    selectedElementIdx: number,
};

export type SequenceLayoutHandle = {
    elements: ViewerId[],
    selectedElementIdx: number,
    doSelectElement: (elementIdx: number) => void,
    doIncrementElement: (elementIdxDelta: number) => void,
};

export type SequenceDidChangeElementEvent = {
    topic: 'Sequence.DidChangeElement',
    message: { viewerId: ViewerId },
};

type SequenceLayoutEvent =
    | SequenceDidChangeElementEvent;

class SequenceLayout extends React.PureComponent<SequenceLayoutProps & InternalProps, SequenceLayoutState> {

    static defaultProps: Partial<SequenceLayoutProps> = {
        orientation: 'horizontal',
    };

    private _childViewers: Viewer[] = [];

    private _registerViewer(viewer: Viewer, idx: number) {
        this._childViewers[idx] = viewer;
    }

    constructor(props: SequenceLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
        };
    }

    public getHandle(): SequenceLayoutHandle {
        const { selectedElementIdx } = this.state;
        return {
            elements: this._childViewers.map((viewer) => viewer.viewerId),
            selectedElementIdx,
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

    componentDidUpdate(prevProps: any, prevState: SequenceLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedElementIdx } = this.state;
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emit<SequenceLayoutEvent>('Sequence.DidChangeElement', { viewerId });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, passdown, interactions, light } = this.props;
        const { mouseHandlers } = interactions;
        const { elements, orientation, startMotif, endMotif } = this.props;
        const { selectedElementIdx } = this.state;

        return (
            <div
                className={clsx({
                    [classes.root]: true,
                })}
                {...mouseHandlers}
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
                {elements.map((fragmentId, idx) => (
                    <div
                        className={clsx({
                            [classes.cell]: true,
                            [classes.horizontal]: orientation === 'horizontal',
                            [classes.vertical]: orientation === 'vertical',
                            [classes.cellSelected]: light === 'highlight' && selectedElementIdx === idx,
                        })}
                    >
                        <Viewer
                            ref={(viewer) => this._registerViewer(viewer!, idx)}
                            key={`${idx}-${fragmentId}`}
                            {...passdown}
                            fragmentId={fragmentId}
                        />
                    </div>
                ))}
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

const styles = (theme: Theme) => createStyles({
    root: {
        display: 'inline-block',
        ...theme.vars.fragmentContainer,
        whiteSpace: 'nowrap',
    },
    cell: {
        margin: theme.scale(16),
        ...theme.vars.fragmentContainer,
        borderColor: 'rgba(255, 0, 0, 0)',
    },
    motif: {
        margin: theme.scale(16),
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
