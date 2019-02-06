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

    isHovered: boolean,

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
            isHovered,
            text,
            color,
        } = this.props;

        let background = undefined;

        // TODO: pick these colors and use theme instead
        switch(color) {
            case 'primary':
                background = `rgba(90, 90, 90, ${isHovered ? 1.0: 0.5})`;
                break;
            case 'secondary':
                background = `rgba(90, 90, 90, ${isHovered ? 1.0: 0.5})`;
                break;
            case 'emphasis':
                background = `rgba(90, 90, 90, ${isHovered ? 1.0: 0.5})`;
                break;
            case 'error':
                background = `rgba(160, 25, 25, ${isHovered ? 1.0: 0.5})`;
                break;
            case 'invisible':
                background = 'transparent';
                break;
        }
        const textBreaks = text.split('\n');
        return (
            <span className={classNames({
                [classes.tokenText]  : true,
                })}
                style={{
                    backgroundColor: background,
            }}>{textBreaks.map((text, i) => {
                if (i < textBreaks.length - 1) {
                    return (
                        <span key={i}>{text}<br/></span>
                    )
                } else {
                    return <span key={i}>{text}</span>
                }
            })}</span>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
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
});

export default withStyles(styles)(TextPrimitive);
