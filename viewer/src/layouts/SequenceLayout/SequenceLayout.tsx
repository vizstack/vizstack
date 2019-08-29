import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { SequenceLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

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
    doSelectElement: (idx: number) => void,
    doIncrementElement: (delta?: number) => void,
};

type SequenceDidSelectElementEvent = {
    topic: 'Sequence.DidSelectElement',
    message: {
        viewerId: ViewerId,
        selectedElementIdx: number,
        prevSelectedElementIdx: number,
    },
};

export type SequenceLayoutEvent =
    | SequenceDidSelectElementEvent;

class SequenceLayout extends React.PureComponent<SequenceLayoutProps & InternalProps, SequenceLayoutState> {

    static defaultProps: Partial<SequenceLayoutProps> = {
        orientation: 'horizontal',
    };

    private _childViewers: Viewer[] = [];
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(idx: number) {
        const key = `${idx}`;
        if(!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => this._childViewers[idx] = viewer;
        }
        return this._childViewerCallbacks[key];
    }

    constructor(props: SequenceLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
        };
        this._getChildViewerCallback.bind(this);
    }

    public getHandle(): SequenceLayoutHandle {
        const { selectedElementIdx } = this.state;
        return {
            elements: this._childViewers.map((viewer) => viewer.viewerId),
            selectedElementIdx,
            doSelectElement: (idx) => {
                this.setState({ selectedElementIdx: idx });
            },
            doIncrementElement: (delta = 1) => {
                const { elements } = this.props;
                this.setState((state) => {
                    let elementIdx = state.selectedElementIdx + delta;
                    // Ensure wrapping to valid array index.
                    elementIdx = (elementIdx % elements.length + elements.length) % elements.length;
                    return { selectedElementIdx: elementIdx };
                });
            },
        };
    }

    componentDidUpdate(prevProps: any, prevState: SequenceLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedElementIdx } = this.state;
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emit<SequenceLayoutEvent>('Sequence.DidSelectElement', { viewerId, selectedElementIdx, prevSelectedElementIdx: prevState.selectedElementIdx, });
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

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div className={classes.container}>
                <div
                    className={clsx({
                        [classes.motif]: true,
                        [classes.horizontal]: orientation === 'horizontal',
                        [classes.vertical]: orientation === 'vertical',
                    })}
                    key='startMotif'
                >
                    {startMotif}
                </div>
                {elements.map((fragmentId, idx) => (
                    <div
                        className={clsx({
                            [classes.spacing]: idx < elements.length - 1,
                            [classes.horizontal]: orientation === 'horizontal',
                            [classes.vertical]: orientation === 'vertical',
                        })}
                        key={idx}
                    >
                        <div className={classes.slot}>
                            <Viewer
                                ref={this._getChildViewerCallback(idx)}
                                key={`${idx}-${fragmentId}`}
                                {...passdown}
                                fragmentId={fragmentId}
                            />
                        </div>
                        <div className={classes.indices}>
                            {idx}
                        </div>
                    </div>
                ))}
                <div
                    className={clsx({
                        [classes.motif]: true,
                        [classes.horizontal]: orientation === 'horizontal',
                        [classes.vertical]: orientation === 'vertical',
                    })}
                    key='endMotif'
                >
                    {endMotif}
                </div>
                </div>
            </Frame>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        // All elements in a sequences must fall on single line.
        whiteSpace: 'nowrap',
    },
    slot: {
        paddingLeft: theme.vars.slot.padding,
        paddingRight: theme.vars.slot.padding,
    },
    spacing: {
        marginRight: theme.vars.slot.spacing,
    },
    motif: {

    },
    indices: {
        borderTopColor: theme.vars.slot.borderColor,
        borderTopStyle: theme.vars.slot.borderStyle,
        borderTopWidth: theme.vars.slot.borderWidth,
        paddingLeft: theme.vars.slot.padding,
        paddingRight: theme.vars.slot.padding,
        textAlign: 'left',
        ...theme.vars.text.caption,
        color: theme.vars.emphasis.less,
    },
    horizontal: {
        display: 'inline-block',
    },
    vertical: {
        display: 'block',
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(SequenceLayout) as React.ComponentClass<SequenceLayoutProps>;
