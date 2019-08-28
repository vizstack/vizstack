import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { KeyValueLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
type KeyValueLayoutProps = FragmentProps<KeyValueLayoutFragment>;

type KeyValueLayoutState = {
    selectedEntryIdx: number,
    selectedEntryType: 'key' | 'value',
};

export type KeyValueLayoutHandle = {
    entries: { key: ViewerId, value: ViewerId }[]
    selectedEntryIdx: number,
    selectedEntryType: 'key' | 'value',
    doSelectEntry: (idx: number) => void,
    doIncrementEntry: (delta?: number) => void,
    doSelectKey: () => void,
    doSelectValue: () => void,
};

type KeyValueDidSelectEntryEvent = {
    topic: 'KeyValue.DidSelectEntry',
    message: {
        viewerId: ViewerId,
        selectedEntryIdx: number,
        selectedEntryType: 'key' | 'value',
        prevSelectedEntryIdx: number,
        prevSelectedEntryType: 'key' | 'value',
    },
};

export type KeyValueLayoutEvent =
    | KeyValueDidSelectEntryEvent;

class KeyValueLayout extends React.PureComponent<KeyValueLayoutProps & InternalProps, KeyValueLayoutState> {
    static defaultProps: Partial<KeyValueLayoutProps> = {
        separator: ':',
    };

    private _childViewers: { key?: Viewer, value?: Viewer }[] = [];
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(idx: number, type: 'key' | 'value') {
        const key = `${idx}-${type}`;
        if(!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => {
                if(!this._childViewers[idx]) this._childViewers[idx] = {};
                 this._childViewers[idx][type] = viewer;
            }
        }
        return this._childViewerCallbacks[key];
    }

    constructor(props: KeyValueLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedEntryIdx: 0,
            selectedEntryType: 'key',
        };
        this._getChildViewerCallback.bind(this);
    }

    public getHandle(): KeyValueLayoutHandle {
        const { selectedEntryIdx, selectedEntryType } = this.state;
        return {
            entries: this._childViewers.map(({ key, value }) => ({
                key: key!.viewerId,
                value: value!.viewerId,
            })),
            selectedEntryIdx,
            selectedEntryType,
            doSelectEntry: (idx: number) => {
                this.setState({ selectedEntryIdx: idx });
            },
            doIncrementEntry: (delta: number = 1) => {
                const { entries } = this.props;
                this.setState((state) => {
                    let entryIdx = state.selectedEntryIdx + delta;
                    // Ensure wrapping to valid array index.
                    entryIdx = (entryIdx % entries.length + entries.length) % entries.length;
                    return { selectedEntryIdx: entryIdx };
                });
            },
            doSelectKey: () => {
                this.setState({ selectedEntryType: 'key' });
            },
            doSelectValue: () => {
                this.setState({ selectedEntryType: 'value' });
            },
        };
    }

    componentDidUpdate(prevProps: KeyValueLayoutProps & InternalProps, prevState: KeyValueLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedEntryIdx, selectedEntryType } = this.state;
        if (selectedEntryIdx !== prevState.selectedEntryIdx ||
            selectedEntryType !== prevState.selectedEntryType) {
            emit<KeyValueLayoutEvent>('KeyValue.DidSelectEntry', {
                viewerId, selectedEntryIdx, selectedEntryType, prevSelectedEntryIdx: prevState.selectedEntryIdx, prevSelectedEntryType: prevState.selectedEntryType,
            });
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
        const { entries, separator, startMotif, endMotif } = this.props;

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div className={classes.container}>
                    <div className={classes.motif}>{startMotif}</div>
                    {entries.map(({ key, value }, idx) => (
                            <div className={clsx({
                                [classes.entry]: true,
                                [classes.spacing]: idx < entries.length - 1,
                            })}>
                                <div className={classes.indices}>{idx}</div>
                                <div className={classes.slot}>
                                    <Viewer
                                        ref={this._getChildViewerCallback(idx, 'key')}
                                        key={`k${idx}`}
                                        {...passdown}
                                        fragmentId={key}
                                    />
                                </div>
                                <span className={classes.separator}>{separator}</span>
                                <div
                                    className={classes.slot}>
                                    <Viewer
                                        ref={this._getChildViewerCallback(idx, 'value')}
                                        key={`v${idx}`}
                                        {...passdown}
                                        fragmentId={value}
                                    />
                                </div>
                            </div>
                        ))}
                    <div className={classes.motif}>{endMotif}</div>
                </div>
            </Frame>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        whiteSpace: 'nowrap',
    },
    entry: {
        display: 'flex',
        flexDirection: 'row',
    },
    indices: {
        display: 'inline-block',
        borderRightColor: theme.vars.slot.borderColor,
        borderRightStyle: theme.vars.slot.borderStyle,
        borderRightWidth: theme.vars.slot.borderWidth,
        paddingRight: theme.vars.slot.padding,
        marginRight: theme.vars.slot.spacing,
        textAlign: 'right',
        ...theme.vars.text.caption,
        color: theme.vars.emphasis.less,
    },
    spacing: {
        marginBottom: theme.vars.slot.padding,
    },
    separator: {
        display: 'inline-block',
        marginLeft: theme.vars.slot.spacing,
        marginRight: theme.vars.slot.spacing,
    },
    slot: {
        display: 'inline-block',
    },
    motif: {
        display: 'block',
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(KeyValueLayout) as React.ComponentClass<KeyValueLayoutProps>;
