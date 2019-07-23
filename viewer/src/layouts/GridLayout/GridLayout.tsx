import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { GridLayoutFragment } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 2D grid of elements.
 * TODO: Allow element-type-specific background coloring.
 */
type GridLayoutProps = FragmentProps<GridLayoutFragment>;

type GridLayoutState = {
    selectedCellIdx: number,
};

export type GridLayoutHandle = {
    cells: ViewerId[],
    selectedCellIdx: number,
    doSelectCell: (elementIdx: number) => void,
    doSelectNeighborCell: (direction: 'north' | 'south' | 'east' | 'west') => void,
};

export type GridRequestSelectCellEvent = {
    topic: 'Grid.RequestSelectCell',
    message: {
        viewerId: ViewerId,
        elementIdx: number,
    },
};

export type GridDidChangeCellEvent = {
    topic: 'Grid.DidChangeCell',
    message: { viewerId: ViewerId },
};

type GridLayoutEvent =
    | GridRequestSelectCellEvent
    | GridDidChangeCellEvent;

class GridLayout extends React.PureComponent<GridLayoutProps & InternalProps, GridLayoutState> {
    
    private _childViewers: Viewer[] = [];

    private _registerViewer(viewer: Viewer, idx: number) {
        this._childViewers[idx] = viewer;
    }

    constructor(props: GridLayoutProps & InternalProps) {
        super(props);
        this.state = {
            selectedCellIdx: 0,
        };
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
                        case 'west':
                            mainAxis = 'col';
                            offAxis = 'row';
                            increaseMainAxis = false;
                            break;
                    }
                    let closest = -1;
                    cells.forEach((cell, i) => {
                        if (i === state.selectedCellIdx) {
                            return;
                        }
                        if (
                            (increaseMainAxis && cell[mainAxis] <= currentElem[mainAxis]) ||
                            (!increaseMainAxis && cell[mainAxis] >= currentElem[mainAxis])
                        ) {
                            return;
                        }
                        if (
                            closest === -1 ||
                            (increaseMainAxis
                                ? cell[mainAxis] < cells[closest][mainAxis]
                                : cell[mainAxis] > cells[closest][mainAxis]) ||
                            (cell[mainAxis] === cells[closest][mainAxis] &&
                                ((cells[closest][offAxis] >= currentElem[offAxis] &&
                                    cell[offAxis] >= currentElem[offAxis] &&
                                    cell[offAxis] - currentElem[offAxis] <
                                        cells[closest][offAxis] - currentElem[offAxis]) ||
                                    (cells[closest][offAxis] < currentElem[offAxis] &&
                                        cell[offAxis] > cells[closest][offAxis])))
                        ) {
                            closest = i;
                        }
                    });
                    if (closest >= 0) {
                        return { selectedCellIdx: closest };
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
            emit<GridLayoutEvent>('Grid.DidChangeCell', { viewerId });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, cells, passdown, interactions, light } = this.props;
        const { mouseHandlers } = interactions;
        const { selectedCellIdx } = this.state;

        return (
            <div
                className={clsx({
                    [classes.container]: true,
                })}
                {...mouseHandlers}
            >
                {cells.map(({ fragmentId, col, row, width, height }, idx) => (
                    <div
                        key={fragmentId}
                        className={clsx({
                            [classes.cell]: true,
                            [classes.cellSelected]: light === 'highlight' && selectedCellIdx === idx,
                        })}
                        style={{
                            gridColumn: `${col + 1} / ${col + 1 + width}`,
                            gridRow: `${row + 1} / ${row + 1 + height}`,
                        }}
                    >
                        <Viewer
                            ref={(viewer) => this._registerViewer(viewer!, idx)}
                            key={`${idx}-${fragmentId}`}
                            {...passdown}
                            fragmentId={fragmentId}
                        />
                    </div>
                ))}
            </div>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        display: 'inline-grid',
        verticalAlign: 'middle',
        gridGap: `${theme.scale(16)}px`, // Need px.
        justifyContent: 'start',
        gridAutoColumns: 'max-content',
        gridAutoRows: 'max-content',
        ...theme.vars.fragmentContainer,
    },
    compactGrid: {
        gridGap: `${theme.scale(16)}px`, // Need px.
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
    cell: {
        textAlign: 'left',
        ...theme.vars.fragmentContainer,
        borderColor: 'rgba(255, 0, 0, 0)',
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(GridLayout) as React.ComponentClass<GridLayoutProps>;
