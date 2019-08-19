import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

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

    private _childViewers: { key: Viewer, value: Viewer }[] = [];

    private _registerViewer(viewer: Viewer, idx: number, type: 'key' | 'value') {
        this._childViewers[idx][type] = viewer;
    }

    constructor(props: KeyValueLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedEntryIdx: 0,
            selectedEntryType: 'key',
        };
    }

    private _getHandle(): KeyValueLayoutHandle {
        const { selectedEntryIdx, selectedEntryType } = this.state;
        return {
            entries: this._childViewers.map(({ key, value }) => ({
                key: key.viewerId,
                value: value.viewerId,
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
                    [classes.root]: true,
                })}
                {...mouseHandlers}
            >
                <div
                    className={clsx({
                        [classes.motif]: true,
                    })}
                >
                    {startMotif}
                </div>
                {entries.map(({ key, value }, idx) => (
                        <div
                            className={clsx({
                                [classes.entry]: true,
                            })}
                        >
                            <div
                                className={clsx({
                                    [classes.cell]: true,
                                    [classes.cellSelected]:
                                        light === 'highlight' &&
                                        selectedEntryIdx === idx &&
                                        selectedType === 'key',
                                })}
                            >
                                <Viewer
                                    ref={(viewer) => this._registerViewer(viewer!, idx, 'key')}
                                    key={`k${idx}`}
                                    {...passdown}
                                    fragmentId={key}
                                />
                            </div>
                            <span>{separator}</span>
                            <div
                                className={clsx({
                                    [classes.cell]: true,
                                    [classes.cellSelected]:
                                        light === 'highlight' &&
                                        selectedEntryIdx === idx &&
                                        selectedType === 'value',
                                })}
                            >
                                <Viewer
                                    ref={(viewer) => this._registerViewer(viewer!, idx, 'key')}
                                    key={`v${idx}`}
                                    {...passdown}
                                    fragmentId={value}
                                />
                            </div>
                        </div>
                    ))}
                <div
                    className={clsx({
                        [classes.motif]: true,
                    })}
                >
                    {endMotif}
                </div>
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    root: {
        display: 'inline-block',
        ...theme.vars.fragmentContainer,
        whiteSpace: 'nowrap',
    },
    entry: {
        display: 'block',
    },
    cell: {
        margin: theme.scale(16),
        ...theme.vars.fragmentContainer,
        borderColor: 'rgba(255, 0, 0, 0)',
        display: 'inline-block',
    },
    motif: {
        margin: theme.scale(16),
        display: 'block',
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(KeyValueLayout) as React.ComponentClass<KeyValueLayoutProps>;
