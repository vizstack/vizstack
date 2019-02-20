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
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    variant?: 'plain' | 'token',
}> {
    static defaultProps = {
        color: 'default',
        type: 'plain',
    };

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const {
            classes,
            text,
            color,
            variant,
            mouseProps,
        } = this.props;

        const textBreaks = text.split('\n');
        return (
            <span className={classNames({
                [classes.text]: true,

                [classes.sansSerif]: variant === 'plain',
                [classes.monospace]: variant === 'token',
                [classes.framed]: variant === 'token',
                [classes.invisible]: color === 'invisible',

                [classes.primaryText]: variant === 'plain' && color === 'primary',
                [classes.secondaryText]: variant === 'plain' && color === 'secondary',
                [classes.errorText]: variant === 'plain' && color === 'error',

                [classes.primaryMono]: variant === 'token' && color === 'primary',
                [classes.secondaryMono]: variant === 'token' && color === 'secondary',
                [classes.errorMono]: variant === 'token' && color === 'error',
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
    text: {
        textAlign: 'left',
        overflow: 'hidden',
        width: 'fit-content',
        fontSize: theme.typography.fontSize.primary,
        color: theme.palette.text.primary,
    },

    // Font styles.
    sansSerif: theme.typography.sansSerif,
    monospace: theme.typography.monospace,
    framed: {
        padding: theme.spacing.small,
        borderRadius: theme.shape.border.radius,
    },
    invisible: {
        visibility: 'hidden',
    },

    // Sans-serif styles.
    primaryText: {
        color: theme.palette.primary.main,
    },
    secondaryText: {
        color: theme.palette.secondary.main,
    },
    errorText: {
        color: theme.palette.error.main,
    },

    // Monospace styles.
    primaryMono: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.primary.light,
        }
    },
    secondaryMono: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.secondary.light,
        }
    },
    errorMono: {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&:hover': {
            backgroundColor: theme.palette.error.light,
        }
    },
});

export default withStyles(styles)(TextPrimitive);
