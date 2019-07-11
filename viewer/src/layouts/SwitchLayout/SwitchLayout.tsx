import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import { ViewerToViewerProps } from '../../Viewer';

import { FragmentId } from '@vizstack/schema';
import {
    ViewerDidMouseEvent,
    ViewerDidHighlightEvent,
    ViewerId,
    ViewerHandle
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/* This pure dumb component renders visualization for a stack of elements that can be switched
 * between. */
type SwitchLayoutProps = {
    // TODO: Factor out with `InteractionProps`.
    viewerId: ViewerId,
    provideHandleFactory: (factory: () => SwitchLayoutHandle) => void,
    emitEvent: (topic: string, message: Record<string, any>) => void,

    // TODO: Factor out with `ViewerToViewerProps`.
    viewerToViewerProps: ViewerToViewerProps,

    /* Elements of the sequence that serve as props to `Viewer` sub-components. */
    modes: FragmentId[],
};

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

export type SwitchRequestSelectModeEvent = {
    topic: 'Switch.RequestSelectMode',
    message: {
        viewerId: ViewerId,
        modeIdx: number,
    },
};

export type SwitchDidChangeModeEvent = {
    topic: 'Switch.DidChangeMode',
    message: {
        viewerId: ViewerId,
    },
};

type SwitchLayoutPub =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | SwitchRequestSelectModeEvent
    | SwitchDidChangeModeEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps & InternalProps, SwitchLayoutState> {
    selectedModeFactory: () => ViewerHandle | null = () => null;

    constructor(props: SwitchLayoutProps & InternalProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedModeIdx: 0,
        };
    }

    _getHandle(): SwitchLayoutHandle {
        const { isHighlighted, selectedModeIdx } = this.state;
        return {
            isHighlighted,
            selectedModeIdx,
            selectedMode: this.selectedModeFactory(),
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
                    while (modeIdx < 0) {
                        modeIdx += modes.length;
                    }
                    while (modeIdx >= modes.length) {
                        modeIdx -= modes.length;
                    }
                    return { selectedModeIdx: modeIdx };
                });
            },
        };
    }

    componentDidMount() {
        this.props.provideHandleFactory(() => this._getHandle());
    }

    componentDidUpdate(prevProps, prevState) {
        const { viewerId, emitEvent } = this.props;
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
        const { classes, modes, emitEvent, viewerId, viewerToViewerProps } = this.props;
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
                    <Viewer {...viewerToViewerProps}
                            fragmentId={fragmentId}
                            provideHandleFactory={(factory) => this.selectedModeFactory = factory} />
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        padding: theme.spacing.unit,
        display: 'inline-block', // Wraps the switch to its contents, allowing it to fit in flow layouts
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(SwitchLayout) as React.ComponentClass<SwitchLayoutProps>;
