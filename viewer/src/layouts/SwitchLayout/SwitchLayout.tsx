import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { SwitchLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';

import {
    ViewerId,
    ViewerHandle,
    ViewerDidMouseEvent,
    ViewerDidHighlightEvent,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/* This pure dumb component renders visualization for a stack of elements that can be switched
 * between. */
type SwitchLayoutProps = FragmentProps<SwitchLayoutFragment>;

type SwitchLayoutState = {
    isHighlighted: boolean,
    selectedModeIdx: number,
};

export type SwitchLayoutHandle = {
    isHighlighted: boolean,
    selectedModeIdx: number,
    selectedMode: ViewerHandle,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectMode: (modeIdx: number) => void,
    doIncrementMode: (modeIdxDelta: number) => void,
};

type SwitchRequestSelectModeEvent = {
    topic: 'Switch.RequestSelectMode',
    message: {
        viewerId: ViewerId,
        modeIdx: number,
    },
};

type SwitchDidChangeModeEvent = {
    topic: 'Switch.DidChangeMode',
    message: {
        viewerId: ViewerId,
    },
};

type SwitchLayoutEvent =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | SwitchRequestSelectModeEvent
    | SwitchDidChangeModeEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps & InternalProps, SwitchLayoutState> {
    private _selectedModeFactory: () => ViewerHandle | null = () => null;

    constructor(props: SwitchLayoutProps & InternalProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedModeIdx: 0,
        };
    }

    private _getHandle(): SwitchLayoutHandle {
        const { isHighlighted, selectedModeIdx } = this.state;
        return {
            isHighlighted,
            selectedModeIdx,
            selectedMode: this._selectedModeFactory(),
            doHighlight: () => {
                this.setState({ isHighlighted: true });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false });
            },
            doSelectMode: (modeIdx) => {
                this.setState({ selectedModeIdx: modeIdx });
            },
            doIncrementMode: (modeIdxDelta = 1) => {
                const { modes } = this.props;
                this.setState((state) => {
                    let modeIdx = state.selectedModeIdx + modeIdxDelta;
                    // Ensure it is a positive array index.
                    modeIdx = (modeIdx % modes.length + modes.length) % modes.length;
                    return { selectedModeIdx: modeIdx };
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
        const { isHighlighted, selectedModeIdx } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent('Viewer.DidHighlight', { viewerId });
            } else {
                emitEvent('Viewer.DidUnhighlight', { viewerId });
            }
        }
        if (selectedModeIdx !== prevState.selectedModeIdx) {
            emitEvent('Switch.DidChangeMode', { viewerId });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, modes, passdown, interactions } = this.props;
        const { emitEvent, viewerId } = interactions;
        const { isHighlighted, selectedModeIdx } = this.state;

        const fragmentId = modes[selectedModeIdx];

        return (
            <div
                className={clsx({
                    [classes.container]: true,
                    [classes.containerHovered]: isHighlighted,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                <div key={fragmentId}>
                    <Viewer
                        {...passdown}
                        fragmentId={fragmentId}
                        registerViewerHandleFactory={(factory) => this._selectedModeFactory = factory} />
                </div>
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        ...theme.domain.fragmentContainer,
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
