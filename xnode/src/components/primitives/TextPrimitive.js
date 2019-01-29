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
class TextPrimitive extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Text string displayed by token. */
    text: string,

    /** The color scheme of the token. */
    color: 'emphasis' | 'primary' | 'secondary' | 'error' | 'invisible',
}> {
    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const {
            classes,
            text,
            color,
        } = this.props;

        let background = undefined;

        // TODO: pick these colors and use theme instead
        switch(color) {
            case 'primary':
                background = '#31363f';
                break;
            case 'secondary':
                background = '#31363f';
                break;
            case 'emphasis':
                background = '#31363f';
                break;
            case 'error':
                background = '#911e15';
                break;
            case 'invisible':
                background = 'transparent';
                break;
        }
        return (
            <span className={classes.tokenText} style={{
                backgroundColor: background,
            }}>{text}</span>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    tokenBox: {
        // Base shape properties
        // background: '#31363f', // TODO: Dehardcode this, allow conditional coloring

        // Border for highlighting

        // Content padding

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
    smallTokenBox: {
    },
    hovered: {
        borderColor: ColorLightBlue[400],
    },
    selected: {
        borderColor: ColorBlue[600],
    },
    tokenText: {
        borderRadius: theme.shape.borderRadius.regular,
        borderColor: 'transparent',
        borderStyle: 'solid',
        borderWidth: 1, // TODO: Dehardcode this
        paddingLeft: 2, // TODO: Dehardcode this
        paddingRight: 2, // TODO: Dehardcode this
        paddingTop: 0, // TODO: Dehardcode this
        paddingBottom: 0, // TODO: Dehardcode this
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
    smallTokenText: {
    },
    textEllipsis: {
        textOverflow: 'ellipsis',
    },
});

export default withStyles(styles)(TextPrimitive);
