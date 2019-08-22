import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

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
    doSelectCell: (idx: number) => void,
    doSelectNeighborCell: (direction: 'north' | 'south' | 'east' | 'west') => void,
};

type GridDidSelectCellEvent = {
    topic: 'Grid.DidSelectCell',
    message: {
        viewerId: ViewerId,
        selectedCellIdx: number,
    },
};

export type GridLayoutEvent =
    | GridDidSelectCellEvent;

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
                        default:
                        case 'west':
                            mainAxis = 'col';
                            offAxis = 'row';
                            increaseMainAxis = false;
                            break;
                    }
                    const mainSize = (mainAxis === 'row' ? 'height' : 'width');
                    const mainEdge = (increaseMainAxis ? currentElem[mainAxis] + currentElem[mainSize] : currentElem[mainAxis]);
                    const cellPenalties = cells.map((cell, i) => {
                        const penalty = {idx: i, off: 0, main: 0, valid: true};
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
                    }).filter((c) => {console.log(c); return c.valid}).sort((c1, c2) => {
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
            emit<GridLayoutEvent>('Grid.DidSelectCell', { viewerId, selectedCellIdx });
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
                        key={`${idx}-${fragmentId}`}
                        className={clsx({
                            [classes.cell]: true,
                            [classes.cellSelected]: light === 'selected' && selectedCellIdx === idx,
                        })}
                        style={{
                            gridColumn: `${col + 1} / ${col + 1 + width}`,
                            gridRow: `${row + 1} / ${row + 1 + height}`,
                        }}
                    >
                        <Viewer
                            ref={(viewer) => this._registerViewer(viewer!, idx)}
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

export default withStyles(styles, { defaultTheme })(GridLayout) as React.ComponentClass<GridLayoutProps>;
