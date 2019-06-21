// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import type {
    Event,
    OnViewerMouseEvent,
    MouseEventProps,
    ReadOnlyViewerHandle,
    PrimitiveSize,
    ResizeEvent,
    HighlightEvent,
} from '../../interaction';
import { getViewerMouseFunctions, consumeEvents } from '../../interaction';
import type { InteractionProps } from '../../Viewer';


/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
type TextPrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    eventHandler: (TextPrimitive) => void,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: TextPrimitivePub) => void,

    /** Text string displayed by token. */
    text: string,

    /** The color scheme of the token. */
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    variant?: 'plain' | 'token',
};

type TextPrimitiveDefaultProps = {
    color: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    variant: 'plain' | 'token',
};

type TextPrimitiveState = {
    textSize: PrimitiveSize,
    isHighlighted: boolean,
};

type TextPrimitivePub = OnViewerMouseEvent;

type TextPrimitiveSub =
    | HighlightEvent
    | UnhighlightEvent
    | ResizeEvent;

class TextPrimitive extends React.PureComponent<TextPrimitiveProps, TextPrimitiveState> {
    static defaultProps: TextPrimitiveDefaultProps = {
        color: 'default',
        variant: 'plain',
    };

    constructor(props: TextPrimitiveProps) {
        super(props);
        this.state = {
            textSize: 'medium',
            isHighlighted: false,
        };
    }

    componentDidUpdate(
        prevProps: $ReadOnly<TextPrimitiveProps>,
        prevState: $ReadOnly<TextPrimitiveState>,
    ): void {
        this.props.eventHandler(this);
    }


    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, variant, publishEvent, viewerHandle } = this.props;
        const { isHighlighted, textSize } = this.state;

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

            [classes.small]: textSize === 'small',
            [classes.medium]: textSize === 'medium',
            [classes.large]: textSize === 'large',

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

            [classes.defaultTokenHighlight]:
                variant === 'token' && color === 'default' && isHighlighted,
            [classes.primaryTokenHighlight]:
                variant === 'token' && color === 'primary' && isHighlighted,
            [classes.secondaryTokenHighlight]:
                variant === 'token' && color === 'secondary' && isHighlighted,
            [classes.errorTokenHighlight]:
                variant === 'token' && color === 'error' && isHighlighted,
        });
        return variant === 'token' ? (
            <div className={names} {...getViewerMouseFunctions(publishEvent, viewerHandle)}>
                {lines}
            </div>
        ) : (
            <span className={names} {...getViewerMouseFunctions(publishEvent, viewerHandle)}>
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
        color: theme.palette.text.primary,
    },

    // Font sizes; one for each value in `PrimitiveSize`.
    small: {
        fontSize: theme.typography.fontSize.caption,
    },
    medium: {
        fontSize: theme.typography.fontSize.primary,
    },
    large: {
        fontSize: theme.typography.fontSize.emphasis,
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

    // Highlighted monospace styles
    defaultTokenHighlight: {
        backgroundColor: theme.palette.default.light,
    },
    primaryTokenHighlight: {
        backgroundColor: theme.palette.primary.light,
    },
    secondaryTokenHighlight: {
        backgroundColor: theme.palette.secondary.light,
    },
    errorTokenHighlight: {
        backgroundColor: theme.palette.error.light,
    },
});

export default withStyles(styles)(
    consumeEvents({
        'highlight': (primitive) => primitive.setState({ isHighlighted: true }),
        'unhighlight': (primitive) => primitive.setState({ isHighlighted: false }),
        'resize': (primitive, message) => primitive.setState({ textSize: message.newSize }),
    }, TextPrimitive));
