// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { FragmentId } from '@vizstack/schema';
import type { ViewerToViewerProps } from '../../Viewer';
import type {
    ViewerDidMouseEvent, ViewerDidHighlightEvent, ViewerId,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';


/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type KeyValueLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (KeyValueLayoutHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: KeyValueLayoutPub>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Key-value pairs where each key and value will be rendered as a `Viewer`. */
    entries: Array<{key: FragmentId, value: FragmentId}>,

    /** A string to be shown between each key and value. */
    itemSep?: string,

    /** A string to show at the beginning of the sequence. */
    startMotif?: string,

    /** A string to show at the end of the sequence. */
    endMotif?: string,
};

export type KeyValueLayoutHandle = {|
    selectedEntryIdx: number,
    selectedType: 'key' | 'value',
    selectedViewerId: ?ViewerId,
    isHighlighted: boolean,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectEntry: (entryIdx: number) => void,
    doIncrementEntry: (entryIdxDelta: number) => void,
    doSelectKey: () => void,
    doSelectValue: () => void,
|};

type KeyValueLayoutDefaultProps = {|
    updateHandle: (KeyValueLayoutHandle) => void,
    itemSep: ':',
|};

type KeyValueLayoutState = {|
    selectedEntryIdx: number,
    selectedType: 'key' | 'value',
    isHighlighted: boolean,
|};

export type KeyValueDidChangeEntryEvent = {|
    topic: 'KeyValue.DidChangeEntry',
    message: {|
        viewerId: ViewerId,
    |},
|};

// Emitted whenever the selected type switches from 'key' to 'value' or vice-versa.
export type KeyValueDidChangeTypeEvent = {|
    topic: 'KeyValue.DidChangeType',
    message: {|
        viewerId: ViewerId,
    |},
|}

type KeyValueLayoutPub = ViewerDidMouseEvent | ViewerDidHighlightEvent | KeyValueDidChangeEntryEvent | KeyValueDidChangeTypeEvent;

class KeyValueLayout extends React.PureComponent<KeyValueLayoutProps, KeyValueLayoutState> {
    /** Prop default values. */
    static defaultProps: KeyValueLayoutDefaultProps = {
        updateHandle: () => {},
        itemSep: ':',
    };

    childRefs: Array<{
        key: {current: null | Viewer},
        value: {current: null | Viewer},
    }> = [];

    constructor(props) {
        super(props);
        this.state = {
            selectedEntryIdx: 0,
            selectedType: 'key',
            isHighlighted: false,
        }
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted, selectedEntryIdx, selectedType } = this.state;
        let selectedViewerId = null;
        if (this.childRefs.length > selectedEntryIdx && this.childRefs[selectedEntryIdx][selectedType].current) {
            selectedViewerId = this.childRefs[selectedEntryIdx][selectedType].current.viewerId;
        }
        updateHandle({
            selectedEntryIdx,
            selectedType,
            selectedViewerId,
            isHighlighted,
            doHighlight: () => {
                this.setState({ isHighlighted: true, });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false, });
            },
            doSelectEntry: (entryIdx) => {
                this.setState({ selectedEntryIdx: entryIdx });
            },
            doIncrementEntry: (entryIdxDelta = 1) => {
                const { entries } = this.props;
                this.setState((state) => {
                    let entryIdx = state.selectedEntryIdx + entryIdxDelta;
                    while (entryIdx < 0) {
                        entryIdx += entries.length;
                    }
                    while (entryIdx >= entries.length) {
                        entryIdx -= entries.length;
                    }
                    return {selectedEntryIdx: entryIdx};
                });
            },
            doSelectKey: () => {
                this.setState({selectedType: 'key'});
            },
            doSelectValue: () => {
                this.setState({selectedType: 'value'});
            },
        });
    }

    componentDidMount() {
        this._updateHandle();
    }

    componentDidUpdate(prevProps, prevState) {
        this._updateHandle();
        const { viewerId, emitEvent } = this.props;
        const { isHighlighted, selectedEntryIdx, selectedType } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', { viewerId: (viewerId: ViewerId), });
            }
            else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', { viewerId: (viewerId: ViewerId), });
            }
        }
        if (selectedEntryIdx !== prevState.selectedEntryIdx) {
            emitEvent<KeyValueDidChangeEntryEvent>('KeyValue.DidChangeEntry', { viewerId: (viewerId: ViewerId), });
        }
        if (selectedType !== prevState.selectedType) {
            emitEvent<KeyValueDidChangeTypeEvent>('KeyValue.DidChangeType', { viewerId: (viewerId: ViewerId), });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, entries, viewerToViewerProps, emitEvent, viewerId, itemSep, startMotif, endMotif } = this.props;
        const { isHighlighted, selectedEntryIdx, selectedType } = this.state;

        this.childRefs = [];

        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                <div className={classNames({
                    [classes.motif]: true,
                })}>{startMotif}</div>
                {entries.map(({key, value}, i) => {
                    const keyRef = React.createRef();
                    const valueRef = React.createRef();
                    this.childRefs.push({key: keyRef, value: valueRef,});
                    return (
                        <div className={classNames({
                            [classes.entry]: true,
                        })}>
                            <div className={classNames({
                                [classes.cell]: true,
                                [classes.cellSelected]: isHighlighted && selectedEntryIdx === i && selectedType === 'key',
                            })}>
                                <Viewer key={`k${i}`} ref={keyRef} {...viewerToViewerProps} fragmentId={key} />
                            </div>
                            <span>{itemSep}</span>
                            <div className={classNames({
                                [classes.cell]: true,
                                [classes.cellSelected]: isHighlighted && selectedEntryIdx === i && selectedType === 'value',
                            })}>
                                <Viewer key={`v${i}`} ref={valueRef} {...viewerToViewerProps} fragmentId={value} />
                            </div>
                        </div>
                    );
                })}
                <div className={classNames({
                    [classes.motif]: true,
                })}>{endMotif}</div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    root: {
        display: 'inline-block',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        whiteSpace: 'nowrap',
    },
    entry: {
        display: 'block',
    },
    cell: {
        margin: theme.spacing.large,
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: "rgba(255, 0, 0, 0)",
        display: 'inline-block',
    },
    motif: {
        margin: theme.spacing.large,
        display: 'block',
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(KeyValueLayout);
