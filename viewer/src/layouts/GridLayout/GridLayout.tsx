import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import defaultTheme from '../../theme';

import { GridLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

/**
 * This pure dumb component renders visualization for a 2D grid of elements.
 * TODO: Allow element-type-specific background coloring.
 */
type GridLayoutProps = FragmentProps<GridLayoutFragment>;

type GridLayoutState = {
    selectedCellIdx: number;
};

export type GridLayoutHandle = {
    cells: ViewerId[];
    selectedCellIdx: number;
    doSelectCell: (idx: number) => void;
    doSelectNeighborCell: (direction: 'north' | 'south' | 'east' | 'west') => void;
};

type GridDidSelectCellEvent = {
    topic: 'Grid.DidSelectCell';
    message: {
        viewerId: ViewerId;
        selectedCellIdx: number;
        prevSelectedCellIdx: number;
    };
};

export type GridLayoutEvent = GridDidSelectCellEvent;

class GridLayout extends React.PureComponent<GridLayoutProps & InternalProps, GridLayoutState> {
    private _childViewers: Viewer[] = [];
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(idx: number) {
        const key = `${idx}`;
        if (!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => (this._childViewers[idx] = viewer);
        }
        return this._childViewerCallbacks[key];
    }

    constructor(props: GridLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedCellIdx: 0,
        };
        this._getChildViewerCallback.bind(this);
    }

    public getHandle(): GridLayoutHandle {
        const { selectedCellIdx } = this.state;
        return {
            cells: this._childViewers.map((viewer) => viewer.viewerId),
            selectedCellIdx,
            doSelectCell: (cellIdx) => {
                this.setState({ selectedCellIdx: cellIdx });
            },
            doSelectNeighborCell: (direction) => {
                this.setState((state, props) => {
                    const { cells } = props;
                    const currentElem = cells[state.selectedCellIdx];

                    // TODO: Rewrite with clearer logic.
                    let mainAxis: 'row' | 'col';
                    let offAxis: 'row' | 'col';
                    let increaseMainAxis: boolean;
                    switch (direction) {
                        case 'south':
                            mainAxis = 'row';
                            offAxis = 'col';
                            increaseMainAxis = true;
                            break;
                        case 'east':
                            mainAxis = 'col';
                            offAxis = 'row';
                            increaseMainAxis = true;
                            break;
                        case 'north':
                            mainAxis = 'row';
                            offAxis = 'col';
                            increaseMainAxis = false;
                            break;
                        default:
                        case 'west':
                            mainAxis = 'col';
                            offAxis = 'row';
                            increaseMainAxis = false;
                            break;
                    }
                    const mainSize = mainAxis === 'row' ? 'height' : 'width';
                    const mainEdge = increaseMainAxis
                        ? currentElem[mainAxis] + currentElem[mainSize]
                        : currentElem[mainAxis];
                    const cellPenalties = cells
                        .map((cell, i) => {
                            const penalty = { idx: i, off: 0, main: 0, valid: true };
                            if (
                                i === state.selectedCellIdx ||
                                (increaseMainAxis && cell[mainAxis] < mainEdge) ||
                                (!increaseMainAxis && cell[mainAxis] >= mainEdge)
                            ) {
                                penalty.valid = false;
                            }
                            penalty.off = Math.abs(cell[offAxis] - currentElem[offAxis]);
                            penalty.main = Math.abs(cell[mainAxis] - mainEdge);
                            return penalty;
                        })
                        .filter((c) => c.valid)
                        .sort((c1, c2) => {
                            return c1.off === c2.off ? c1.main - c2.main : c1.off - c2.off;
                        });
                    if (cellPenalties.length > 0) {
                        return { selectedCellIdx: cellPenalties[0].idx };
                    } else {
                        return { selectedCellIdx: selectedCellIdx };
                    }
                });
            },
        };
    }

    componentDidUpdate(prevProps: any, prevState: GridLayoutState) {
        const { viewerId, emit } = this.props.interactions;
        const { selectedCellIdx } = this.state;
        if (selectedCellIdx !== prevState.selectedCellIdx) {
            emit<GridLayoutEvent>('Grid.DidSelectCell', {
                viewerId,
                selectedCellIdx,
                prevSelectedCellIdx: prevState.selectedCellIdx,
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
        const { cells, rowHeight, colWidth, showLabels } = this.props;

        const maxRow = cells.reduce((max, { row, height }) => Math.max(max, row + height), -1);
        const maxCol = cells.reduce((max, { col, width }) => Math.max(max, col + width), -1);

        return (
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div
                    className={clsx({
                        [classes.grid]: true,
                        [classes.equalColumns]: colWidth === 'equal',
                        [classes.equalRows]: rowHeight === 'equal',
                    })}
                >
                    {cells.map(({ fragmentId, col, row, width, height }, idx) => (
                        <div
                            key={`${idx}-${fragmentId}`}
                            className={clsx({
                                [classes.cell]: true,
                                [classes.edgeTop]: row === 0,
                                [classes.edgeBottom]: row + height === maxRow,
                                [classes.edgeLeft]: col === 0,
                                [classes.edgeRight]: col + width === maxCol,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }}
                        >
                            <Viewer
                                ref={this._getChildViewerCallback(idx)}
                                {...passdown}
                                fragmentId={fragmentId}
                            />
                        </div>
                    ))}
                </div>
            </Frame>
        );
    }
}

const styles = (theme: Theme) =>
    createStyles({
        grid: {
            display: 'grid',
            justifyContent: 'start',
            gridAutoColumns: 'max-content',
            gridAutoRows: 'max-content',
        },
        equalRows: {
            gridAutoRows: '1fr',
        },
        equalColumns: {
            gridAutoColumns: '1fr',
        },
        cell: {
            flexGrow: 1,
            textAlign: 'left',
            padding: theme.vars.slot.spacing / 2,

            borderLeftStyle: theme.vars.slot.borderStyle,
            borderLeftColor: theme.vars.slot.borderColor,
            borderLeftWidth: theme.vars.slot.borderWidth,
            borderTopStyle: theme.vars.slot.borderStyle,
            borderTopColor: theme.vars.slot.borderColor,
            borderTopWidth: theme.vars.slot.borderWidth,
        },
        edgeLeft: {
            borderLeft: 'none',
            paddingLeft: theme.vars.slot.padding,
        },
        edgeRight: {
            paddingRight: theme.vars.slot.padding,
        },
        edgeTop: {
            borderTop: 'none',
            paddingTop: theme.vars.slot.padding,
        },
        edgeBottom: {
            paddingBottom: theme.vars.slot.padding,
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(GridLayout) as React.ComponentClass<
    GridLayoutProps
>;
