'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Typography from '@material-ui/core/Typography';
import ColorLightBlue from '@material-ui/core/colors/lightBlue';
import ColorBlue from '@material-ui/core/colors/blue';


/**
 * This dumb component renders visualization for a text string that represents a token.
 */
class TokenViz extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Data model rendered by this viz. */
        model: PropTypes.string.isRequired,

        /** Token box dimension constraints (in px or '%'). */
        minWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        maxWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        maxHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

        /** Whether text should wrap if it exceeds token width. */
        shouldTextWrap: PropTypes.bool,

        /** Token interaction state. */
        isHovered: PropTypes.bool,
        isSelected: PropTypes.bool,

        /** Mouse handler functions. */
        onClick: PropTypes.func,
        onDoubleClick: PropTypes.func,
        onMouseEnter: PropTypes.func,
        onMouseLeave: PropTypes.func,
    };

    /** Prop default values object. */
    static defaultProps = {
        shouldTextWrap: false,
        isHovered: false,
        isSelected: false,
    };

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, model, minWidth, minHeight, maxWidth, maxHeight, shouldTextWrap,
            isHovered, isSelected, onClick, onDoubleClick, onMouseEnter, onMouseLeave } = this.props;

        // Construct style dict
        const style = {
            minWidth,
            maxWidth,
            minHeight,
            maxHeight,
        };

        return (
            <div className={classNames({
                [classes.tokenBox]: true,
                [classes.hovered]:  isHovered,
                [classes.selected]: isSelected,
            })}
                 style={style}
                 onClick={onClick}
                 onDoubleClick={onDoubleClick}
                 onMouseEnter={onMouseEnter}
                 onMouseLeave={onMouseLeave}>
                <Typography className={classNames({
                    [classes.tokenText]:  true,
                    [classes.textWrap]:   shouldTextWrap,
                    [classes.textNoWrap]: !shouldTextWrap,
                })}>{model}</Typography>
            </div>
        );
    }
}


// To inject styles into component
// -------------------------------


/** CSS-in-JS styling function. */
const styles = theme => ({
    tokenBox: {
        // Set shape properties
        background:     '#4d78cc',  // TODO: Dehardcode this, allow conditional coloring
        borderColor:    'transparent',
        borderStyle:    'solid',
        borderWidth:    2,  // TODO: Dehardcode this
        borderRadius:   theme.shape.borderRadius.small,

        // Content padding
        paddingLeft:    2,  // TODO: Dehardcode this
        paddingRight:   2,  // TODO: Dehardcode this

        // Vertically center text
        display:        'inline-flex',
        flexDirection:  'column',
        justifyContent: 'center',

        // No stretch along either axis (if within flex parent)
        alignSelf:      'flex-start',
        flex:           'none',

        // No text selection
        userSelect:     'none',
        cursor:         'default',
    },
    hovered: {
        borderColor:    ColorLightBlue[400],
    },
    selected: {
        borderColor:    ColorBlue[600],
    },
    tokenText: {
        textAlign:      'center',
        textOverflow:   'ellipsis',
        overflow:       'hidden',
        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '10pt',  // TODO: Dehardcode this
        color:          '#fff', // TODO: Dehardcode this
    },
    textWrap: {
        wordBreak:      'break-all',
    },
    textNoWrap: {
        whiteSpace:     'nowrap',
    }
});

export default withStyles(styles)(TokenViz);
