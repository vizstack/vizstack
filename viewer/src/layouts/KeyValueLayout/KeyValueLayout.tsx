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
    selectedEntryIdx: number;
    selectedEntryType: 'key' | 'value';
};

export type KeyValueLayoutHandle = {
    entries: { key: ViewerId; value: ViewerId }[];
    selectedEntryIdx: number;
    selectedEntryType: 'key' | 'value';
    doSelectEntry: (idx: number) => void;
    doIncrementEntry: (delta?: number) => void;
    doSelectKey: () => void;
    doSelectValue: () => void;
};

type KeyValueDidSelectEntryEvent = {
    topic: 'KeyValue.DidSelectEntry';
    message: {
        viewerId: ViewerId;
        selectedEntryIdx: number;
        selectedEntryType: 'key' | 'value';
        prevSelectedEntryIdx: number;
        prevSelectedEntryType: 'key' | 'value';
    };
};

export type KeyValueLayoutEvent = KeyValueDidSelectEntryEvent;

class KeyValueLayout extends React.PureComponent<
    KeyValueLayoutProps & InternalProps,
    KeyValueLayoutState
> {
    static defaultProps: Partial<KeyValueLayoutProps> = {
        separator: ':',
        alignSeparators: false,
        showLabels: true,
    };

    private _childViewers: { key?: Viewer; value?: Viewer }[] = [];
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(idx: number, type: 'key' | 'value') {
        const key = `${idx}-${type}`;
        if (!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => {
                if (!this._childViewers[idx]) this._childViewers[idx] = {};
                this._childViewers[idx][type] = viewer;
            };
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
            // If there are no children, we should not return an empty list, since this will raise
            // an exception if a user, in the interaction manager, tries to access 
            // `entries[selectedEntryIdx][selectedEntryType]`. Instead, we put `{key, value}` object
            // as the only entry so that the access does not throw an error but will return invalid
            // Viewer IDs.
            entries: this._childViewers.length > 0 ? this._childViewers.map(({ key, value }) => ({
                key: key!.viewerId,
                value: value!.viewerId,
            })) : [{key: '', value: ''}],
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
                    entryIdx = ((entryIdx % entries.length) + entries.length) % entries.length;
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

    componentDidUpdate(
        prevProps: KeyValueLayoutProps & InternalProps,
        prevState: KeyValueLayoutState,
    ) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedEntryIdx, selectedEntryType } = this.state;
        if (
            selectedEntryIdx !== prevState.selectedEntryIdx ||
            selectedEntryType !== prevState.selectedEntryType
        ) {
            emit<KeyValueLayoutEvent>('KeyValue.DidSelectEntry', {
                viewerId,
                selectedEntryIdx,
                selectedEntryType,
                prevSelectedEntryIdx: prevState.selectedEntryIdx,
                prevSelectedEntryType: prevState.selectedEntryType,
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
        const {
            entries,
            separator,
            startMotif,
            endMotif,
            alignSeparators,
            showLabels,
        } = this.props;

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div className={classes.container}>
                    <div className={clsx(classes.motif, classes.motifStart)}>{startMotif}</div>
                    <div className={classes.entries}>
                        {entries.map(({ key, value }, idx: number) => {
                            const ViewerKey = (
                                <Viewer
                                    ref={this._getChildViewerCallback(idx, 'key')}
                                    key={`k${idx}`}
                                    {...passdown}
                                    fragmentId={key}
                                />
                            );
                            const ViewerValue = (
                                <Viewer
                                    ref={this._getChildViewerCallback(idx, 'value')}
                                    key={`v${idx}`}
                                    {...passdown}
                                    fragmentId={value}
                                />
                            );
                            const gridRow = `${idx + 1} / ${idx + 2}`;

                            return (
                                <React.Fragment key={idx}>
                                    <div
                                        className={clsx({
                                            [classes.border]: true,
                                            [classes.label]: showLabels,
                                        })}
                                        style={{ gridColumn: `1 / 2`, gridRow }}
                                    >
                                        {showLabels ? idx : null}
                                    </div>
                                    {alignSeparators ? (
                                        <React.Fragment>
                                            <div
                                                className={classes.slot}
                                                style={{ gridColumn: `2 / 3`, gridRow }}
                                            >
                                                {ViewerKey}
                                            </div>
                                            <div
                                                className={classes.separator}
                                                style={{ gridColumn: `3 / 4`, gridRow }}
                                            >
                                                {separator}
                                            </div>
                                            <div
                                                className={classes.slot}
                                                style={{ gridColumn: `4 / 5`, gridRow }}
                                            >
                                                {ViewerValue}
                                            </div>
                                        </React.Fragment>
                                    ) : (
                                        <div style={{ gridColumn: `2 / 3`, gridRow }}>
                                            <div className={classes.slot}>{ViewerKey}</div>
                                            <div
                                                className={clsx(
                                                    classes.separator,
                                                    classes.spacingAround,
                                                )}
                                            >
                                                {separator}
                                            </div>
                                            <div className={classes.slot}>{ViewerValue}</div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                            // </div>
                        })}
                    </div>
                    <div className={clsx(classes.motif, classes.motifEnd)}>{endMotif}</div>
                </div>
            </Frame>
        );
    }
}

const styles = (theme: Theme) =>
    createStyles({
        container: {
            display: 'flex',
            flexDirection: 'column',
            whiteSpace: 'nowrap',
        },
        entries: {
            display: 'grid',
            gridRowGap: theme.vars.slot.padding,
            gridColumnGap: theme.vars.slot.spacing,
        },
        border: {
            borderRightColor: theme.vars.slot.borderColor,
            borderRightStyle: theme.vars.slot.borderStyle,
            borderRightWidth: theme.vars.slot.borderWidth,
        },
        label: {
            paddingRight: theme.vars.slot.padding,
            textAlign: 'right',
            ...theme.vars.text.caption,
            color: theme.vars.emphasis.less,
        },
        slot: {
            display: 'inline-block',
        },
        separator: {
            display: 'inline-block',
            ...theme.vars.text.body,
            color: theme.vars.emphasis.less,
        },
        spacingAround: {
            marginLeft: theme.vars.slot.spacing,
            marginRight: theme.vars.slot.spacing,
        },
        motif: {
            display: 'block',
            ...theme.vars.text.caption,
            color: theme.vars.emphasis.less,
        },
        motifStart: {
            textAlign: 'right',
        },
        motifEnd: {
            textAlign: 'left',
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(KeyValueLayout) as React.ComponentClass<
    KeyValueLayoutProps
>;
