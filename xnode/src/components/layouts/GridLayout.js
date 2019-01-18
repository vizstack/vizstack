import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../Viewer';
import type { ViewerProps } from '../Viewer';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class GridLayout extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

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
        } = this.props;

        return (
            <div className={classes.grid}>
                {geometries.map(([viewerProps, col, row, width, height]) => {
                    return (
                        <div
                            key={viewerProps.vizId}
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
    },
    elemCell: {
        paddingLeft: 1, // TODO: Dehardcode this
        paddingRight: 1, // TODO: Dehardcode this
        paddingTop: 1, // TODO: Dehardcode this
        paddingBottom: 1, // TODO: Dehardcode this
    },
    indexCell: {
        lineHeight: '6pt', // TODO: Dehardcode this
    },
    motifText: {
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '14pt', // TODO: Dehardcode this, same as TokenPrimitive.tokenText
        verticalAlign: '25%', // Offset baseline for middle alignment

        // No text selection
        userSelect: 'none',
        cursor: 'default',
    },
    indexText: {
        fontSize: '6pt', // TODO: Dehardcode this
        userSelect: 'none',
        cursor: 'default',
    },
});

export default withStyles(styles)(GridLayout);
