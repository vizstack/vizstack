// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { ViewerToViewerProps } from '../../Viewer';

import type { FragmentId } from '@vizstack/schema';
import type {
    ViewerDidMouseEvent, ViewerDidHighlightEvent, ViewerId,
} from '../../interaction';
import {getViewerMouseFunctions} from '../../interaction';


/**
 * This pure dumb component renders visualization for a stack of elements that can be switched
 * between.
 */
type SwitchLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (SwitchLayoutHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: SwitchLayoutPub>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    modes: FragmentId[],
};

type SwitchLayoutDefaultProps = {|
    updateHandle: (SwitchLayoutHandle) => void;
|};

type SwitchLayoutState = {|
    isHighlighted: boolean,
    selectedModeIdx: number,
|};

export type SwitchLayoutHandle = {|
    isHighlighted: boolean,
    selectedModeIdx: number,
    selectedViewerId: ?ViewerId,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectMode: (modeIdx: number) => void,
    doIncrementMode: (modeIdxDelta: number) => void,
|};

export type SwitchRequestSelectModeEvent = {|
    topic: 'Switch.RequestSelectMode',
    message: {|
        viewerId: ViewerId,
        modeIdx: number,
    |},
|};

export type SwitchDidChangeModeEvent = {|
    topic: 'Switch.DidChangeMode',
    message: {|
        viewerId: ViewerId,
    |}
|}

type SwitchLayoutPub = ViewerDidMouseEvent | ViewerDidHighlightEvent | SwitchRequestSelectModeEvent | SwitchDidChangeModeEvent;

class SwitchLayout extends React.PureComponent<SwitchLayoutProps, SwitchLayoutState> {
    /** Prop default values. */
    static defaultProps: SwitchLayoutDefaultProps = {
        updateHandle: () => {},
    };

    childRef: {current: null | Viewer} = React.createRef();

    constructor(props: SwitchLayoutProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedModeIdx: 0,
        };
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted, selectedModeIdx, } = this.state;
        updateHandle({
            isHighlighted,
            selectedModeIdx,
            selectedViewerId: this.childRef.current ? this.childRef.current.viewerId : null,
            doHighlight: () => {
                this.setState({ isHighlighted: true, });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false, });
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
                    return {selectedModeIdx: modeIdx};
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
        const { isHighlighted, selectedModeIdx } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', { viewerId: (viewerId: ViewerId), });
            }
            else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', { viewerId: (viewerId: ViewerId), });
            }
        }
        if (selectedModeIdx !== prevState.selectedModeIdx) {
            emitEvent<SwitchDidChangeModeEvent>('Switch.DidChangeMode', { viewerId: (viewerId: ViewerId), });
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
                className={classNames({
                    [classes.container]: true,
                    [classes.containerHovered]: isHighlighted,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                <div key={fragmentId}>
                    <Viewer {...viewerToViewerProps} fragmentId={fragmentId} ref={this.childRef}/>
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
        display: 'inline-block',  // Wraps the switch to its contents, allowing it to fit in flow layouts
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(SwitchLayout);
