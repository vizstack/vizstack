import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../Viewer';
import type { ViewerProps } from '../Viewer';
import ColorLightBlue from "@material-ui/core/colors/lightBlue";

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class GridLayout extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    isHovered: boolean,

    isCompact: boolean,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    geometries: Array<[ViewerProps, number, number, number, number]>,
}> {
    /** Prop default values. */
    static defaultProps = {
    };

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const {
            classes,
            geometries,
            isCompact,
            isHovered,
        } = this.props;

        return (
            <div className={classNames({
                [classes.grid]       : true,
                [classes.compactGrid]: isCompact,
                [classes.hoveredGrid]    : isHovered,
                [classes.notHoveredGrid] : !isHovered,
            })}>
                {geometries.map(([viewerProps, col, row, width, height]) => {
                    return (
                        <div
                            key={viewerProps.vizId}
                            className={classNames({
                                [classes.cell]           : true,
                                [classes.hoveredCell]    : isHovered,
                                [classes.notHoveredCell] : !isHovered,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }
                        }>
                            <Viewer {...viewerProps}/>
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
    grid: {
        display: 'inline-grid',
        gridGap: '10px',
        justifyContent: 'start',
        gridAutoColumns: 'max-content',
        gridAutoRows: 'max-content',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: theme.shape.borderRadius.regular,
    },
    compactGrid: {
        gridGap: '0px',
    },
    hoveredGrid: {
        borderColor: ColorLightBlue[400], // TODO: Dehardcode this
    },
    notHoveredGrid: {
        borderColor: 'transparent',
    },
    cell: {
    },
    hoveredCell: {
    },
    notHoveredCell: {
    }
});

export default withStyles(styles)(GridLayout);
