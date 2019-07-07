// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import { Viewer } from '../../Viewer';
import type { ViewerToViewerProps } from '../../Viewer';

import type { FragmentId } from '@vizstack/schema';
import type { ViewerDidMouseEvent, ViewerDidHighlightEvent, ViewerId } from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/**
 * This pure dumb component renders visualization for a 2D grid of elements.
 * TODO: Allow element-type-specific background coloring.
 */
type GridLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (GridLayoutHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: GridLayoutPub>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    /** Elements which should be rendered as children of the `GridLayout`. */
    cells: {
        fragmentId: FragmentId,
        col: number,
        row: number,
        width: number,
        height: number,
    }[],
};

export type GridLayoutHandle = {|
    selectedCellIdx: number,
    selectedViewerId: ?ViewerId,
    isHighlighted: boolean,
    doHighlight: () => void,
    doUnhighlight: () => void,
    doSelectCell: (elementIdx: number) => void,
    doSelectNeighborCell: (direction: 'north' | 'south' | 'east' | 'west') => void,
|};

type GridLayoutDefaultProps = {|
    updateHandle: (GridLayoutHandle) => void,
|};

type GridLayoutState = {|
    isHighlighted: boolean,
    selectedCellIdx: number,
|};

export type GridRequestSelectCellEvent = {|
    topic: 'Grid.RequestSelectCell',
    message: {|
        viewerId: ViewerId,
        elementIdx: number,
    |},
|};

export type GridDidChangeCellEvent = {|
    topic: 'Grid.DidChangeCell',
    message: {|
        viewerId: ViewerId,
    |},
|};

type GridLayoutPub =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | GridRequestSelectCellEvent
    | GridDidChangeCellEvent;

class GridLayout extends React.PureComponent<GridLayoutProps, GridLayoutState> {
    childRefs: Array<{ current: null | Viewer }> = [];

    /** Prop default values. */
    static defaultProps: GridLayoutDefaultProps = {
        updateHandle: () => {},
    };

    constructor(props: GridLayoutProps) {
        super(props);
        this.state = {
            isHighlighted: false,
            selectedCellIdx: 0,
        };
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted, selectedCellIdx } = this.state;
        updateHandle({
            selectedCellIdx,
            selectedViewerId:
                this.childRefs.length > selectedCellIdx && this.childRefs[selectedCellIdx].current
                    ? this.childRefs[selectedCellIdx].current.viewerId
                    : null,
            isHighlighted,
            doHighlight: () => {
                this.setState({ isHighlighted: true });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false });
            },
            doSelectCell: (cellIdx) => {
                this.setState({ selectedCellIdx: cellIdx });
            },
            doSelectNeighborCell: (direction) => {
                this.setState((state, props) => {
                    const { cells } = props;
                    const currentElem = cells[state.selectedCellIdx];
                    let mainAxis, offAxis, increaseMainAxis;
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
                        return {};
                    }
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
        const { isHighlighted, selectedCellIdx } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            } else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            }
        }
        if (selectedCellIdx !== prevState.selectedCellIdx) {
            emitEvent<GridDidChangeCellEvent>('Grid.DidChangeCell', {
                viewerId: (viewerId: ViewerId),
            });
        }
    }

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, cells, viewerId, emitEvent, viewerToViewerProps } = this.props;

        const { isHighlighted, selectedCellIdx } = this.state;

        this.childRefs = [];

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                })}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
            >
                {cells.map(({ fragmentId, col, row, width, height }, i) => {
                    const ref = React.createRef();
                    this.childRefs.push(ref);
                    return (
                        <div
                            key={fragmentId}
                            className={classNames({
                                [classes.cell]: true,
                                [classes.cellSelected]: isHighlighted && selectedCellIdx === i,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }}
                        >
                            <Viewer {...viewerToViewerProps} fragmentId={fragmentId} ref={ref} />
                        </div>
                    );
                })}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        display: 'inline-grid',
        verticalAlign: 'middle',
        gridGap: `${theme.spacing.large}px`, // Need px.
        justifyContent: 'start',
        gridAutoColumns: 'max-content',
        gridAutoRows: 'max-content',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
    },
    compactGrid: {
        gridGap: `${theme.spacing.large}px`, // Need px.
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
    cell: {
        textAlign: 'left',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: 'rgba(255, 0, 0, 0)',
    },
    cellSelected: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(GridLayout);
