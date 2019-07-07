// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import type { ViewerId, ViewerDidMouseEvent, ViewerDidHighlightEvent } from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
type TextPrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (TextPrimitiveHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: TextPrimitivePub>(
        $PropertyType<E, 'topic'>,
        $PropertyType<E, 'message'>,
    ) => void,

    /** Text string displayed by the component. */
    text: string,

    /** The color scheme of the component. */
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',

    /** Whether the component is plain text or a token. */
    variant?: 'plain' | 'token',
};

type TextPrimitiveDefaultProps = {|
    color: 'default',
    variant: 'plain',
    updateHandle: (TextPrimitiveHandle) => void,
|};

type TextPrimitiveState = {|
    textSize: 'small' | 'medium' | 'large',
    isHighlighted: boolean,
|};

export type TextRequestResizeEvent = {|
    topic: 'Text.RequestResize',
    message: {|
        viewerId: ViewerId,
        textSize: 'small' | 'medium' | 'large',
    |},
|};

export type TextDidResizeEvent = {|
    topic: 'Text.DidResize',
    message: {|
        viewerId: ViewerId,
        textSize: 'small' | 'medium' | 'large',
    |},
|};

type TextPrimitivePub =
    | ViewerDidMouseEvent
    | ViewerDidHighlightEvent
    | TextRequestResizeEvent
    | TextDidResizeEvent;

export type TextPrimitiveHandle = {
    isHighlighted: boolean,
    textSize: 'small' | 'medium' | 'large',
    doHighlight: () => void,
    doUnhighlight: () => void,
    doResize: ('small' | 'medium' | 'large') => void,
};

class TextPrimitive extends React.PureComponent<TextPrimitiveProps, TextPrimitiveState> {
    static defaultProps: TextPrimitiveDefaultProps = {
        color: 'default',
        variant: 'plain',
        updateHandle: () => {},
    };

    constructor(props: TextPrimitiveProps) {
        super(props);
        this.state = {
            textSize: 'medium',
            isHighlighted: false,
        };
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted, textSize } = this.state;
        updateHandle({
            isHighlighted,
            textSize,
            doHighlight: () => {
                this.setState({ isHighlighted: true });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false });
            },
            doResize: (textSize) => {
                this.setState({ textSize });
            },
        });
    }

    componentDidMount() {
        this._updateHandle();
    }

    componentDidUpdate(prevProps, prevState): void {
        this._updateHandle();
        const { viewerId, emitEvent } = this.props;
        const { textSize, isHighlighted } = this.state;
        if (textSize !== prevState.textSize) {
            emitEvent<TextDidResizeEvent>('Text.DidResize', {
                viewerId: (viewerId: ViewerId),
                textSize,
            });
        }
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            } else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', {
                    viewerId: (viewerId: ViewerId),
                });
            }
        }
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, variant, emitEvent, viewerId } = this.props;
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
            <div className={names} {...getViewerMouseFunctions(emitEvent, viewerId)}>
                {lines}
            </div>
        ) : (
            <span className={names} {...getViewerMouseFunctions(emitEvent, viewerId)}>
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

export default withStyles(styles)(TextPrimitive);
