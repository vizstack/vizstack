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

    /** Whether the Viz is currently being hovered over by the cursor. */
    isHovered: boolean,

    /** Whether the Viz should lay out its contents spaciously. */
    isFullyExpanded: boolean,

    /** Event listeners which should be assigned to the Viz's outermost node. */
    mouseProps: {
        onClick: (e) => void,
        onMouseOver: (e) => void,
        onMouseOut: (e) => void,
    },

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
            mouseProps,
        } = this.props;

        const textBreaks = text.split('\n');
        return (
            <span className={classNames({
                [classes.tokenText]  : true,
                [classes.primary] : color === 'primary',
                [classes.secondary] : color === 'secondary',
                [classes.emphasis] : color === 'emphasis',
                [classes.error] : color === 'error',
                })}
                  {...mouseProps}
            >{textBreaks.map((text, i) => {
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
        paddingLeft: theme.spacing.unit / 2,
        paddingRight: theme.spacing.unit / 2,
        paddingTop: theme.spacing.unit / 2,
        paddingBottom: theme.spacing.unit / 2,
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        textAlign: 'left',
        overflow: 'hidden',
        width: 'fit-content',
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: theme.typography.fontSize.primary,
        color: theme.palette.text.primary,
        borderRadius: theme.shape.border.radius,
    },
    primary: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.primary.light,
        }
    },
    secondary: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.secondary.light,
        }
    },
    emphasis: {
        backgroundColor: theme.palette.emphasis.main,
        color: theme.palette.emphasis.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.emphasis.light,
        }
    },
    error: {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.error.light,
        }
    },
});

export default withStyles(styles)(TextPrimitive);
