import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { SwitchLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

/* This pure dumb component renders visualization for a stack of elements that can be switched
 * between. */
type SwitchLayoutProps = FragmentProps<SwitchLayoutFragment>;

type SwitchLayoutState = {
    selectedModeIdx: number;
};

export type SwitchLayoutHandle = {
    mode: ViewerId;
    selectedModeIdx: number;
    doSelectMode: (idx: number) => void;
    doIncrementMode: (delta?: number) => void;
};

type SwitchDidSelectModeEvent = {
    topic: 'Switch.DidSelectMode';
    message: {
        viewerId: ViewerId;
        selectedModeIdx: number;
    };
};

export type SwitchLayoutEvent = SwitchDidSelectModeEvent;

class SwitchLayout extends React.PureComponent<
    SwitchLayoutProps & InternalProps,
    SwitchLayoutState
> {
    static defaultProps: Partial<SwitchLayoutProps> = {
        showLabels: true,
    };

    private _childViewer?: Viewer;
    private _childViewerCallback = (viewer: Viewer) => (this._childViewer = viewer);

    private _getChildViewerCallback() {
        return this._childViewerCallback;
    }

    constructor(props: SwitchLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedModeIdx: 0,
        };
        this._childViewerCallback.bind(this);
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
                    modeIdx = ((modeIdx % modes.length) + modes.length) % modes.length;
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
        const { classes, passdown, interactions, light } = this.props;
        const { mouseHandlers } = interactions;
        const { modes, showLabels } = this.props;
        const { selectedModeIdx } = this.state;

        const fragmentId = modes[selectedModeIdx];

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div className={classes.slot}>
                    <Viewer
                        ref={this._getChildViewerCallback()}
                        key={fragmentId}
                        {...passdown}
                        fragmentId={fragmentId}
                    />
                </div>
                <div className={classes.border}>
                    <div className={classes.indicator}>
                        {modes.map((_, idx) => (idx === selectedModeIdx ? '\u25CF' : '\u25CB'))}
                    </div>
                    {showLabels ? <div className={classes.label}>{selectedModeIdx}</div> : null}
                </div>
            </Frame>
        );
    }
}

const styles = (theme: Theme) =>
    createStyles({
        slot: {
            paddingLeft: theme.vars.slot.padding,
            paddingRight: theme.vars.slot.padding,
            paddingBottom: theme.vars.slot.padding,
            verticalAlign: 'bottom',
        },
        border: {
            borderTopColor: theme.vars.slot.borderColor,
            borderTopStyle: theme.vars.slot.borderStyle,
            borderTopWidth: theme.vars.slot.borderWidth,
        },
        indicator: {
            display: 'inline-block',
            float: 'left',
            paddingLeft: theme.vars.slot.padding,
            ...theme.vars.text.caption,
            color: theme.vars.emphasis.less,
        },
        label: {
            display: 'inline-block',
            float: 'right',
            paddingRight: theme.vars.slot.padding,
            paddingBottom: theme.vars.slot.padding,
            ...theme.vars.text.caption,
            color: theme.vars.emphasis.less,
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(SwitchLayout) as React.ComponentClass<
    SwitchLayoutProps
>;
