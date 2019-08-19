import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { SwitchLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

/* This pure dumb component renders visualization for a stack of elements that can be switched
 * between. */
type SwitchLayoutProps = FragmentProps<SwitchLayoutFragment>;

type SwitchLayoutState = {
    selectedModeIdx: number,
};

export type SwitchLayoutHandle = {
    mode: ViewerId,
    selectedModeIdx: number,
    doSelectMode: (idx: number) => void,
    doIncrementMode: (delta?: number) => void,
};

type SwitchDidSelectModeEvent = {
    topic: 'Switch.DidSelectMode',
    message: {
        viewerId: ViewerId,
        selectedModeIdx: number,
    },
};

export type SwitchLayoutEvent =
    | SwitchDidSelectModeEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps & InternalProps, SwitchLayoutState> {
    
    private _childViewer?: Viewer;

    private _registerViewer(viewer: Viewer) {
        this._childViewer = viewer;
    }

    constructor(props: SwitchLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedModeIdx: 0,
        };
    }

    public getHandle(): SwitchLayoutHandle {
        const { selectedModeIdx } = this.state;
        return {
            mode: this._childViewer!.viewerId,
            selectedModeIdx,
            doSelectMode: (idx) => {
                this.setState({ selectedModeIdx: idx });
            },
            doIncrementMode: (delta = 1) => {
                const { modes } = this.props;
                this.setState((state) => {
                    let modeIdx = state.selectedModeIdx + delta;
                    // Ensure wrapping to valid array index.
                    modeIdx = (modeIdx % modes.length + modes.length) % modes.length;
                    return { selectedModeIdx: modeIdx };
                });
            },
        };
    }

    componentDidUpdate(prevProps: any, prevState: SwitchLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedModeIdx } = this.state;
        if (selectedModeIdx !== prevState.selectedModeIdx) {
            emit<SwitchLayoutEvent>('Switch.DidSelectMode', { viewerId, selectedModeIdx });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, modes, passdown, interactions, light } = this.props;
        const { mouseHandlers } = interactions;
        const { selectedModeIdx } = this.state;

        const fragmentId = modes[selectedModeIdx];

        return (
            <div
                className={clsx({
                    [classes.container]: true,
                    [classes.containerHovered]: light === 'highlight',
                })}
                {...mouseHandlers}
            >
                <div key={fragmentId}>
                    <Viewer
                        ref={(viewer) => this._registerViewer(viewer!)}
                        key={fragmentId}
                        {...passdown}
                        fragmentId={fragmentId} />
                </div>
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        ...theme.vars.fragmentContainer,
        padding: theme.scale(4),

        // Wrap the switch to its contents, allowing it to fit in flow layouts.
        display: 'inline-block', 
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(SwitchLayout) as React.ComponentClass<SwitchLayoutProps>;
