// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import type { Event, InteractionMessage } from '../../interaction';

type TextPrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    lastEvent?: Event,
    publishEvent: (eventName: string, message: InteractionMessage) => void,

    /** Text string displayed by token. */
    text: string,

    /** The color scheme of the token. */
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    variant?: 'plain' | 'token',
};

type TextPrimitiveState = {
    isHovered: boolean,
};

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
class TextPrimitive extends React.PureComponent<TextPrimitiveProps, TextPrimitiveState> {
    static defaultProps = {
        color: 'default',
        variant: 'plain',
    };

    constructor(props: TextPrimitiveProps) {
        super(props);
        this.state = {
            isHovered: false,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        const { lastEvent } = this.props;
        if (prevProps.lastEvent !== lastEvent && lastEvent !== undefined && lastEvent !== null) {
            const { eventName } = lastEvent;
            if (eventName === 'hover') {
                this.setState({
                    isHovered: true,
                });
            }
            if (eventName === 'unhover') {
                this.setState({
                    isHovered: false,
                });
            }
        }
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, variant, publishEvent } = this.props;
        const { isHovered } = this.state;

        const mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                publishEvent('click', {});
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                publishEvent('mouseOver', {});
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                publishEvent('mouseOut', {});
            },
        };

        const split = text.split('\n');
        const lines = split.map((text, i) =>
            i < split.length - 1 ? (
                <span key={i}>
                    {text}
                    <br />
                </span>
            ) : (
                <span key={i}>{text}</span>
            ),
        );
        const names = classNames({
            [classes.text]: true,

            [classes.sansSerif]: variant === 'plain',
            [classes.monospace]: variant === 'token',
            [classes.framed]: variant === 'token',
            [classes.invisible]: color === 'invisible',

            [classes.defaultPlain]: variant === 'plain' && color === 'default',
            [classes.primaryPlain]: variant === 'plain' && color === 'primary',
            [classes.secondaryPlain]: variant === 'plain' && color === 'secondary',
            [classes.errorPlain]: variant === 'plain' && color === 'error',

            [classes.defaultToken]: variant === 'token' && color === 'default',
            [classes.primaryToken]: variant === 'token' && color === 'primary',
            [classes.secondaryToken]: variant === 'token' && color === 'secondary',
            [classes.errorToken]: variant === 'token' && color === 'error',

            [classes.defaultTokenHover]: variant === 'token' && color === 'default' && isHovered,
            [classes.primaryTokenHover]: variant === 'token' && color === 'primary' && isHovered,
            [classes.secondaryTokenHover]:
                variant === 'token' && color === 'secondary' && isHovered,
            [classes.errorTokenHover]: variant === 'token' && color === 'error' && isHovered,
        });
        return variant === 'token' ? (
            <div className={names} {...mouseProps}>
                {lines}
            </div>
        ) : (
            <span className={names} {...mouseProps}>
                {lines}
            </span>
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
        display: 'inline-block',
        verticalAlign: 'middle',
        wordWrap: 'break-word',
    },
    invisible: {
        visibility: 'hidden',
    },

    // Sans-serif styles.
    defaultPlain: {
        color: theme.palette.atom.text,
    },
    primaryPlain: {
        color: theme.palette.primary.main,
    },
    secondaryPlain: {
        color: theme.palette.secondary.main,
    },
    errorPlain: {
        color: theme.palette.error.main,
    },

    // Monospace styles.
    defaultToken: {
        backgroundColor: theme.palette.default.main,
        color: theme.palette.atom.text,
    },
    primaryToken: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
    secondaryToken: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
    },
    errorToken: {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
    },

    // Hovered monospace styles
    defaultTokenHover: {
        backgroundColor: theme.palette.default.light,
    },
    primaryTokenHover: {
        backgroundColor: theme.palette.primary.light,
    },
    secondaryTokenHover: {
        backgroundColor: theme.palette.secondary.light,
    },
    errorTokenHover: {
        backgroundColor: theme.palette.error.light,
    },
});

export default withStyles(styles)(TextPrimitive);
