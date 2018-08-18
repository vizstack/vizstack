'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import TokenViz from './TokenViz';

/**
 * This dumb component renders visualization for a 1-D sequence of heterogeneous elements.
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
        endMotif: PropTypes.string,

        /** Individual list item dimension constraints (in px or '%'). */
        itemMinWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemMaxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        itemHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    };

    /** Prop default values object. */
    static defaultProps = {
        showIndices: true,
        startMotif: "",
        endMotif: "",
        itemHeight: 30, // TODO: Match with text size
    };

    /**
     * Renders a sequence of TokenViz elements, optionally numbered with indices. The sequence can have start/end
     * motifs, which are large characters that can be used to indicate a type of sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, model, showIndices, startMotif, endMotif,
            itemMinWidth, itemMaxWidth, itemHeight } = this.props;

        const listItems = model.map((elem, idx) => {
            const { text, isHovered, isSelected, onClick, onDoubleClick, onMouseEnter, onMouseLeave } = elem;
            return (
                <div key={idx} className={classes.item}>
                    <TokenViz model={text}
                              minWidth={itemMinWidth}
                              maxWidth={itemMaxWidth}
                              minHeight={itemHeight}
                              maxHeight={itemHeight}
                              shouldTextWrap={false}
                              isHovered={isHovered}
                              isSelected={isSelected}
                              onClick={onClick}
                              onDoubleClick={onDoubleClick}
                              onMouseEnter={onMouseEnter}
                              onMouseLeave={onMouseLeave}/>
                    {showIndices ? <span className={classes.indexText}>{idx}</span> : null}
                </div>
            );
        });

        const motifStyle = { height: itemHeight };

        return (
            <div className={classes.keyValuePairList}>
                <div className={classes.motifText} style={motifStyle} key="startMotif">{startMotif}</div>
                {listItems}
                <div className={classes.motifText} style={motifStyle} key="endMotif">{endMotif}</div>
            </div>
        );
    }
}


// To inject styles into component
// -------------------------------


/** CSS-in-JS styling function. */
const styles = theme => ({
    keyValuePairList: {
        display:        'inline-flex',
        flexDirection:  'row',
        flexWrap:       'nowrap',
    },
    item: {
        marginLeft:     2,  // TODO: Dehardcode this
        marginRight:    2,  // TODO: Dehardcode this

        // Layout child components vertically
        display:        'flex',
        flexDirection:  'column',
    },
    motifText: {
        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '14pt',  // TODO: Dehardcode this

        // Vertically center text
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',

        // No text selection
        userSelect:     'none',
        cursor:         'default',
    },
    indexText: {
        textAlign:      'center',
        fontSize:       '8pt',  // TODO: Dehardcode this
        userSelect:     'none',
        cursor:         'default',
    }
});

export default withStyles(styles)(SequenceViz);
