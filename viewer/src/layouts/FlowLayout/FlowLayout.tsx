import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { FlowLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

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
    doSelectElement: (idx: number) => void,
    doIncrementElement: (delta?: number) => void,
};

type FlowDidSelectElementEvent = {
    topic: 'Flow.DidSelectElement',
    message: {
        viewerId: ViewerId,
        prevSelectedElementIdx: number,
        selectedElementIdx: number,
    },
};

export type FlowLayoutEvent = 
    | FlowDidSelectElementEvent;

class FlowLayout extends React.PureComponent<FlowLayoutProps & InternalProps, FlowLayoutState> {

    private _childViewers: Viewer[] = [];
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(idx: number) {
        const key = `${idx}`;
        if(!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => this._childViewers[idx] = viewer;
        }
        return this._childViewerCallbacks[key];
    }

    constructor(props: FlowLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedElementIdx: 0,
        };
        this._getChildViewerCallback.bind(this);
    }

    public getHandle(): FlowLayoutHandle {
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

    componentDidUpdate(prevProps: any, prevState: FlowLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedElementIdx } = this.state;
        if (selectedElementIdx !== prevState.selectedElementIdx) {
            emit<FlowLayoutEvent>('Flow.DidSelectElement', { viewerId, selectedElementIdx, prevSelectedElementIdx: prevState.selectedElementIdx });
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
        const { elements } = this.props;

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                {elements.map((fragmentId, idx) => (
                    <React.Fragment key={`${idx}-${fragmentId}`}>
                        <Viewer
                            ref={this._getChildViewerCallback(idx)}
                            key={`${idx}-${fragmentId}`}
                            {...passdown}
                            fragmentId={fragmentId}
                        />
                        {idx < elements.length - 1 ? <span className={classes.spacer}/> : null}
                    </React.Fragment>
                ))}
            </Frame>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    spacer: {
        marginRight: theme.vars.slot.spacing,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(FlowLayout) as React.ComponentClass<FlowLayoutProps>;
