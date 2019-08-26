import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { KeyValueLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

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
    topic: 'KeyValue.DidSelectEntryEvent',
    message: {
        viewerId: ViewerId,
        selectedEntryIdx: number,
        selectedEntryType: 'key' | 'value',
    },
};

export type KeyValueLayoutEvent =
    | KeyValueDidSelectEntryEvent;

class KeyValueLayout extends React.PureComponent<KeyValueLayoutProps & InternalProps, KeyValueLayoutState> {
    static defaultProps: Partial<KeyValueLayoutProps> = {
        separator: ':',
    };

    private _childViewers: { key?: Viewer, value?: Viewer }[] = [];

    private _registerViewer(viewer: Viewer, idx: number, type: 'key' | 'value') {
        if(!this._childViewers[idx]) this._childViewers[idx] = {};
        this._childViewers[idx][type] = viewer;
    }

    constructor(props: KeyValueLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedEntryIdx: 0,
            selectedEntryType: 'key',
        };
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
            emit<KeyValueLayoutEvent>('KeyValue.DidSelectEntryEvent', {
                viewerId, selectedEntryIdx, selectedEntryType
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
        const { selectedEntryIdx, selectedEntryType: selectedType } = this.state;

        return (
            <div
                className={clsx({
                    [classes.frame]: true,
                    [classes.frameLowlight]: light === 'lowlight',
                    [classes.frameHighlight]: light === 'highlight',
                    [classes.frameSelected]: light === 'selected',
                })}
                {...mouseHandlers}
            >
                <div className={classes.motif}>{startMotif}</div>
                {entries.map(({ key, value }, idx) => (
                        <div className={clsx({
                            [classes.entry]: true,
                            [classes.spacing]: idx < entries.length - 1,
                        })}>
                            <div className={classes.indices}>{idx}</div>
                            <div className={classes.slot}>
                                <Viewer
                                    ref={(viewer) => this._registerViewer(viewer!, idx, 'key')}
                                    key={`k${idx}`}
                                    {...passdown}
                                    fragmentId={key}
                                />
                            </div>
                            <span className={classes.separator}>{separator}</span>
                            <div
                                className={classes.slot}>
                                <Viewer
                                    ref={(viewer) => this._registerViewer(viewer!, idx, 'value')}
                                    key={`v${idx}`}
                                    {...passdown}
                                    fragmentId={value}
                                />
                            </div>
                        </div>
                    ))}
                <div className={classes.motif}>{endMotif}</div>
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    frame: {
        display: 'inline-flex',
        flexDirection: 'column',
        whiteSpace: 'nowrap',
        ...theme.vars.framed.normal,
    },
    frameHighlight: {
        ...theme.vars.framed.highlight,
    },
    frameLowlight: {
        ...theme.vars.framed.lowlight,
    },
    frameSelected: {
        ...theme.vars.framed.selected,
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
        // paddingTop: theme.vars.slot.padding,
        // paddingBottom: theme.vars.slot.padding,
    },
    motif: {
        display: 'block',
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(KeyValueLayout) as React.ComponentClass<KeyValueLayoutProps>;
