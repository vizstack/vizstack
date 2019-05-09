// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import type {
    Event,
    OnMouseEvent,
    MouseEventProps,
    ReadOnlyViewerHandle,
    PrimitiveSize,
    ResizeEvent,
    OnResizeEvent,
} from '../../interaction';
import { useMouseInteractions } from '../../interaction';
import type { InteractionProps } from '../../Viewer';


/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
type TextPrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** Property inherited from the `useMouseInteractions()` HOC. Publish mouse interaction-related
     * events when spread onto an HTML element. */
    mouseProps: MouseEventProps,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    /** Events published to this view's `InteractionManager` which should be consumed by this
     * view. The message of each event in this array includes a "viewerId" field which is equal to
     * `props.viewerHandle.viewerId`. Each event in the array should be consumed only once. */
    lastEvents: Array<TextPrimitiveSub>,

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

type TextPrimitivePub = OnMouseEvent | OnResizeEvent;

type TextPrimitiveSub = {
          // Changes the appearance of the text to be brighter
          eventName: 'highlight',
          message: {
              viewerId: string,
          },
      }
    | {
          // Returns the appearance of the text to normal
          eventName: 'unhighlight',
          message: {
              viewerId: string,
          },
      }
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
        const { lastEvents } = this.props;
        lastEvents.forEach((event: TextPrimitiveSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
            if (event.eventName === 'highlight') {
                this.setState({
                    isHighlighted: true,
                });
            }
            if (event.eventName === 'unhighlight') {
                this.setState({
                    isHighlighted: false,
                });
            }
            if (event.eventName === 'resize') {
                this.setState({
                    textSize: event.message.newSize,
                });
            }
        });
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, variant, mouseProps } = this.props;
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
    useMouseInteractions<React.Config<TextPrimitiveProps, TextPrimitiveDefaultProps>>(
        TextPrimitive,
    ),
);
