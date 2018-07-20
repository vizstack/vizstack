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

        /** Data model rendered by this viewer:
         *  [{
         *      text: "list[4]",
         *      ref: "@id:..." | null,
         *  }, ...]
         *
         */
        model: PropTypes.array.isRequired,

        /**
         * Executed when any list element is double-clicked.
         *
         * @param ref
         *     The `ref` field of the target element.
         */
        onDoubleClick: PropTypes.func,

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
    }

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            hovered: null,
            selected: null,
        }
    }

    /**
     * Renders the list, with each item being a fixed-width button. When clicked, the button opens the viewer, if
     * the clicked entry is a non-primitive.
     */
    render() {
        const { classes, model, onDoubleClick, showIndices, startMotif, endMotif,
            itemMinWidth, itemMaxWidth, itemHeight } = this.props;
        const { hovered, selected } = this.state;

        const listItems = model.map((elem, idx) => {

            return (
                <div key={idx} className={classes.item}>
                    <TokenViz model={elem.text}
                              minWidth={itemMinWidth}
                              maxWidth={itemMaxWidth}
                              minHeight={itemHeight}
                              maxHeight={itemHeight}
                              shouldTextWrap={false}
                              isHovered={hovered == idx}
                              isSelected={selected === idx}
                              onClick={() => this.setState({selected: idx})}
                              onMouseEnter={() => this.setState({hovered: idx})}
                              onMouseLeave={() => this.setState({hovered: null})}
                              onDoubleClick={onDoubleClick} />
                    {showIndices ? <span className={classes.indexText}>{idx}</span> : null}
                </div>
            );
        });

        const motifStyle = { height: itemHeight };

        return (
            <div className={classes.listBox}>
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
    listBox: {
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
