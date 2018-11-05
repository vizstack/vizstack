import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import TokenViz from '../primitives/TokenPrimitive';

/**
 * This dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 */
class SequenceViz extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Data model rendered by this viz. */
        model: PropTypes.arrayOf(
            PropTypes.shape({
                text:           PropTypes.string.isRequired,
                isHovered:      PropTypes.bool,
                isSelected:     PropTypes.bool,
                onClick:        PropTypes.func,
                onDoubleClick:  PropTypes.func,
                onMouseEnter:   PropTypes.func,
                onMouseLeave:   PropTypes.func,
            })
        ),

        /** Whether to display element index labels. */
        showIndices: PropTypes.bool,

        /** Characters to place at start/end of sequence as decoration, e.g. "{" and "}" for sets. */
        startMotif: PropTypes.string,
        endMotif:   PropTypes.string,

        /** Individual list item dimension constraints (in px or '%'). */
        itemMinWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemMaxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemHeight:   PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    };

    /** Prop default values object. */
    static defaultProps = {
        showIndices: true,
        startMotif: "",
        endMotif: "",
    };

    /**
     * Renders a sequence of TokenPrimitive elements, optionally numbered with indices. The sequence can have start/end
     * motifs, which are large characters that can be used to indicate a type of sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, model, showIndices, startMotif, endMotif,
            itemMinWidth, itemMaxWidth, itemHeight } = this.props;

        const items = model.map((elem) => {
            const { text, isHovered, isSelected, onClick, onDoubleClick, onMouseEnter, onMouseLeave } = elem;
            return (
                <TokenViz model={text}
                          minWidth={itemMinWidth}
                          maxWidth={itemMaxWidth}
                          minHeight={itemHeight}
                          maxHeight={itemHeight}
                          shouldTextWrap={false}
                          shouldTextEllipsis={true}
                          isHovered={isHovered}
                          isSelected={isSelected}
                          onClick={onClick}
                          onDoubleClick={onDoubleClick}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}/>
            );
        });

        const idxs = items.map((_, idx) => {
            return showIndices ? <span className={classes.indexText}>{idx}</span> : null;
        });

        return (
            <table className={classes.grid}>
                <tbody>
                    <tr>
                        <td><span className={classes.motifText}>{startMotif}</span></td>
                        {items.map((item, i) => <td key={i} className={classes.elemCell}>{item}</td>)}
                        <td><span className={classes.motifText}>{endMotif}</span></td>
                    </tr>
                    <tr>
                        <td>{/* start motif */}</td>
                        {idxs.map((idx, i) => <td key={i} className={classes.indexCell}>{idx}</td>)}
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
const styles = theme => ({
    grid: {
        textAlign:      'center',
        verticalAlign:  'middle',
    },
    elemCell: {
        paddingLeft:     1,  // TODO: Dehardcode this
        paddingRight:    1,  // TODO: Dehardcode this
        paddingTop:      1,  // TODO: Dehardcode this
        paddingBottom:   1,  // TODO: Dehardcode this
    },
    indexCell: {
        lineHeight:      '6pt', // TODO: Dehardcode this
    },
    motifText: {
        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '14pt',  // TODO: Dehardcode this, same as TokenPrimitive.tokenText
        verticalAlign:  '25%',  // Offset baseline for middle alignment

        // No text selection
        userSelect:     'none',
        cursor:         'default',
    },
    indexText: {
        fontSize:       '6pt',  // TODO: Dehardcode this
        userSelect:     'none',
        cursor:         'default',
    }
});

export default withStyles(styles)(SequenceViz);
