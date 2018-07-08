'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';
import { createSelector } from 'reselect';

import Typography from 'material-ui/Typography';
import ColorLightBlue from 'material-ui/colors/lightBlue';
import ColorBlue from 'material-ui/colors/blue';


/**
 * This dumb component renders visualization for an array, or a 1-D sequence of heterogeneous elements.
 */
class ArrayViz extends Component {

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

        /** Individual list item shape properties (in px). If `itemWidth` is set, all elements are the same width; else,
         *  the width conforms to the content size up to `itemMaxWidth`. */
        itemWidth: PropTypes.number,
        itemHeight: PropTypes.number,
        itemMaxWidth: PropTypes.number,
    };

    /** Prop default values object. */
    static defaultProps = {
        showIndices: true,
        startMotif: "",
        endMotif: "",
        itemMaxWidth: 75,
        itemHeight: 30,
    }

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = {
            hover: null,
            selected: null,
        }
    }

    /**
     * Renders the list, with each item being a fixed-width button. When clicked, the button opens the viewer, if
     * the clicked entry is a non-primitive.
     */
    render() {
        const { classes, model, onDoubleClick, showIndices, startMotif, endMotif,
            itemWidth, itemHeight, itemMaxWidth } = this.props;
        const { hover, selected } = this.state;

        // Construct style dict
        const itemStyle = { height: itemHeight, maxWidth: itemMaxWidth };
        if(itemWidth) itemStyle.width = itemWidth;

        const listItems = model.map((elem, idx) => {

            let onClick = () => {
                this.setState({
                    selected: idx,
                })
            };

            return (
                <div key={idx}>
                    <div className={classNames({
                        [classes.listItem]: true,
                        [classes.hover]: hover === idx,
                        [classes.selected]: selected === idx,
                    })}
                         style={itemStyle}
                         onClick={onClick}
                         onDoubleClick={onDoubleClick}
                         onMouseEnter={() => this.setState({hover: idx})}
                         onMouseLeave={() => this.setState({hover: null})}>
                        <Typography className={classes.listItemText}>{elem.text}</Typography>
                    </div>
                    {showIndices ? <span className={classes.indexText}>{idx}</span> : null}
                </div>
            );
        });

        const motifStyle = { height: itemHeight };

        return (
            <div className={classes.container} >
                <div className={classes.listBox}>
                    <div className={classes.list}>
                        <div className={classes.motifText} style={motifStyle} key="startMotif">{startMotif}</div>
                        {listItems}
                        <div className={classes.motifText} style={motifStyle} key="endMotif">{endMotif}</div>
                    </div>
                </div>
            </div>
        );
    }
}


// To inject styles into component
// -------------------------------


/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        // Center self vertically
        width:          '100%',
        margin:         'auto',

        // Layout child components vertically
        display:        'flex',
        flexDirection:  'column',
    },
    listBox: {
        overflow:       'auto',
        textAlign:      'center',
        paddingTop:     theme.spacing.unit,
        paddingBottom:  theme.spacing.unit,
    },
    list: {
        display:        'inline-flex',
        flexDirection:  'row',
        flexWrap:       'nowrap',
    },
    listItem: {
        // Set shape properties
        margin:         2,  // TODO: Dehardcode this
        padding:        2,  // TODO: Dehardcode this
        background:     '#4d78cc',  // TODO: Dehardcode this
        borderColor:    'transparent',
        borderStyle:    'solid',
        borderRadius:   theme.shape.borderRadius.small,

        // Vertically center text
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',

        // No text selection
        userSelect:     'none',
        cursor:         'default',
    },
    hover: {
        borderColor:    ColorLightBlue[400],
    },
    selected: {
        borderColor:    ColorBlue[600],
    },
    listItemText: {
        textAlign:      'center',
        overflow:       'hidden',
        textOverflow:   'ellipsis',
        whiteSpace:     'nowrap',
        textTransform:  'none',

        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '10pt',  // TODO: Dehardcode this
        color:          '#fff', // TODO: Dehardcode this
    },
    motifText: {
        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '14pt',  // TODO: Dehardcode this
        margin:         2,  // TODO: Dehardcode this

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

export default withStyles(styles)(ArrayViz);
