import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../../core/Viewer';
import type { ViewerProps } from '../../../core/Viewer';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class SequenceLayout extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewerProps>,

    /** Whether to display element index labels. */
    showIndices?: boolean,

    /** Characters to place at start/end of sequence as decoration, e.g. "{" and "}" for sets. */
    startMotif?: string,
    endMotif?: string,

    /** Individual list item dimension constraints (in px or '%'). */
    itemMinWidth?: number | string,
    itemMaxWidth?: number | string,
    itemHeight?: number | string,
}> {
    /** Prop default values. */
    static defaultProps = {
        showIndices: true,
        startMotif: '',
        endMotif: '',
    };

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const {
            classes,
            elements,
            showIndices,
            startMotif,
            endMotif,
            itemMinWidth,
            itemMaxWidth,
            itemHeight,
        } = this.props;

        const items = elements.map((elem) => <Viewer {...elem} />);
        const idxs = elements.map((elem, idx) => {
            return showIndices ? <span className={classes.indexText}>{idx}</span> : null;
        });

        return (
            <table className={classes.container}>
                <tbody>
                    <tr>
                        <td>
                            <span className={classes.motifText}>{startMotif}</span>
                        </td>
                        {items.map((item, i) => (
                            <td key={i} className={classes.elemCell}>
                                {item}
                            </td>
                        ))}
                        <td>
                            <span className={classes.motifText}>{endMotif}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>{/* start motif */}</td>
                        {idxs.map((idx, i) => (
                            <td key={i} className={classes.indexCell}>
                                {idx}
                            </td>
                        ))}
                        <td>{/* end motif */}</td>
                    </tr>
                </tbody>
            </table>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        textAlign: 'center',
        verticalAlign: 'middle',
    },
    elemCell: {
        padding: theme.spacing.smallest,
    },
    indexCell: {
        lineHeight: theme.typography.fontSize.caption,
    },
    motifText: {
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '14pt', // TODO: Dehardcode this, same as TextPrimitive.tokenText
        verticalAlign: '25%', // Offset baseline for middle alignment

        // No text selection
        userSelect: 'none',
        cursor: 'default',
    },
    indexText: {
        fontSize: theme.typography.fontSize.caption,
        userSelect: 'none',
        cursor: 'default',
    },
});

export default withStyles(styles)(SequenceLayout);
