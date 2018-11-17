import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Typography from '@material-ui/core/Typography';
import ColorLightBlue from '@material-ui/core/colors/lightBlue';
import ColorBlue from '@material-ui/core/colors/blue';

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
class TokenPrimitive extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Text string displayed by token. */
    text: string,

    /** Token box dimension constraints (in px or '%'). */
    minWidth?: number | string,
    maxWidth?: number | string,
    minHeight?: number | string,
    maxHeight?: number | string,

    /** Whether text should wrap if it exceeds token width. */
    shouldTextWrap?: boolean,

    /** Whether text should display ellipsis if too long. */
    shouldTextEllipsis?: boolean,

    /** Token interaction state. */
    isHovered?: boolean,
    isSelected?: boolean,

    /** Mouse handler functions. */
    onClick?: () => void,
    onDoubleClick?: () => void,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
}> {
    /** Prop default values. */
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
        const {
            classes,
            text,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            shouldTextWrap,
            shouldTextEllipsis,
            isHovered,
            isSelected,
            onClick,
            onDoubleClick,
            onMouseEnter,
            onMouseLeave,
        } = this.props;

        // Construct style dict
        const style = {
            minWidth,
            maxWidth,
            minHeight,
            maxHeight,
        };

        return (
            <div
                className={classNames({
                    [classes.tokenBox]: true,
                    [classes.hovered]: isHovered,
                    [classes.selected]: isSelected,
                })}
                style={style}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <Typography
                    className={classNames({
                        [classes.tokenText]: true,
                        [classes.textWrap]: shouldTextWrap,
                        [classes.textNoWrap]: !shouldTextWrap,
                        [classes.textEllipsis]: shouldTextEllipsis,
                    })}
                >
                    {text}
                </Typography>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    tokenBox: {
        // Base shape properties
        background: '#31363f', // TODO: Dehardcode this, allow conditional coloring

        // Border for highlighting
        borderRadius: theme.shape.borderRadius.regular,
        borderColor: 'transparent',
        borderStyle: 'solid',
        borderWidth: 1, // TODO: Dehardcode this

        // Content padding
        paddingLeft: 2, // TODO: Dehardcode this
        paddingRight: 2, // TODO: Dehardcode this
        paddingTop: 0, // TODO: Dehardcode this
        paddingBottom: 0, // TODO: Dehardcode this

        // Vertically center text
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',

        // No stretch along either axis (if within flex parent)
        alignSelf: 'flex-start',
        flex: 'none',

        // No text selection
        userSelect: 'none',
        cursor: 'default',
    },
    hovered: {
        borderColor: ColorLightBlue[400],
    },
    selected: {
        borderColor: ColorBlue[600],
    },
    tokenText: {
        textAlign: 'center',
        overflow: 'hidden',
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '10pt', // TODO: Dehardcode this
        color: '#d7dae0', // TODO: Dehardcode this
    },
    textWrap: {
        wordBreak: 'break-all',
    },
    textNoWrap: {
        whiteSpace: 'nowrap',
    },
    textEllipsis: {
        textOverflow: 'ellipsis',
    },
});

export default withStyles(styles)(TokenPrimitive);
