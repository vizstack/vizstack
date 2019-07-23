import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { FlowLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type FlowLayoutProps = FragmentProps<FlowLayoutFragment>;

type FlowLayoutState = {
    selectedElementIdx: number,
};

export type FlowLayoutHandle = {
    elements: ViewerId[],
    selectedElementIdx: number,
    doSelectElement: (elementIdx: number) => void,
    doIncrementElement: (elementIdxDelta: number) => void,
};

export type FlowDidChangeElementEvent = {
    topic: 'Flow.DidChangeElement',
    message: { viewerId: ViewerId },
};

type FlowLayoutEvent = 
    | FlowDidChangeElementEvent;

class FlowLayout extends React.PureComponent<FlowLayoutProps & InternalProps, FlowLayoutState> {

    private _childViewers: Viewer[] = [];

    private _registerViewer(viewer: Viewer, idx: number) {
        this._childViewers[idx] = viewer;
    }

    constructor(props: FlowLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
        };
    }

    public getHandle(): FlowLayoutHandle {
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

    componentDidUpdate(prevProps: any, prevState: FlowLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedElementIdx } = this.state;
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emit<FlowLayoutEvent>('Flow.DidChangeElement', { viewerId });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, passdown, interactions } = this.props;
        const { mouseHandlers } = interactions;

        return (
            <div
                className={clsx({
                    [classes.root]: true,
                })}
                {...mouseHandlers}
            >
                {elements.map((fragmentId, idx) => (
                    <Viewer
                        ref={(viewer) => this._registerViewer(viewer!, idx)}
                        key={`${idx}-${fragmentId}`}
                        {...passdown}
                        fragmentId={fragmentId}
                    />
                ))}
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    root: {
        ...theme.vars.fragmentContainer,
        borderColor: 'transparent',
    },
    hovered: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(FlowLayout) as React.ComponentClass<FlowLayoutProps>;
