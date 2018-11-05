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
class TokenPrimitive extends Component {

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

        /** Whether text should display ellipsis if too long. */
        shouldTextEllipsis: PropTypes.bool,

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
        shouldTextEllipsis: false,
        isHovered: false,
        isSelected: false,
    };

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, model, minWidth, minHeight, maxWidth, maxHeight, shouldTextWrap, shouldTextEllipsis,
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
                    [classes.tokenText]:    true,
                    [classes.textWrap]:     shouldTextWrap,
                    [classes.textNoWrap]:   !shouldTextWrap,
                    [classes.textEllipsis]: shouldTextEllipsis,
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
        // Base shape properties
        background:     '#31363f',  // TODO: Dehardcode this, allow conditional coloring

        // Border for highlighting
        borderRadius:   theme.shape.borderRadius.regular,
        borderColor:    'transparent',
        borderStyle:    'solid',
        borderWidth:    1,  // TODO: Dehardcode this

        // Content padding
        paddingLeft:    2,  // TODO: Dehardcode this
        paddingRight:   2,  // TODO: Dehardcode this
        paddingTop:     0,  // TODO: Dehardcode this
        paddingBottom:  0,  // TODO: Dehardcode this

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
        overflow:       'hidden',
        fontFamily:     theme.typography.monospace.fontFamily,
        fontSize:       '10pt',  // TODO: Dehardcode this
        color:          '#d7dae0', // TODO: Dehardcode this
    },
    textWrap: {
        wordBreak:      'break-all',
    },
    textNoWrap: {
        whiteSpace:     'nowrap',
    },
    textEllipsis: {
        textOverflow:   'ellipsis',
    }
});

export default withStyles(styles)(TokenPrimitive);
