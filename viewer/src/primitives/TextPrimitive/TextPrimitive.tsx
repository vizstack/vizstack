import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { TextPrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';


/* This pure dumb component renders visualization for a text string that represents a token. */
type TextPrimitiveProps = FragmentProps<TextPrimitiveFragment>;

type TextPrimitiveState = {
    textSize: 'small' | 'medium' | 'large',
};

export type TextPrimitiveHandle = {
    textSize: 'small' | 'medium' | 'large';
    doResize: (size: 'small' | 'medium' | 'large') => void;
};

type TextDidResizeEvent = {
    topic: 'Text.DidResize',
    message: {
        viewerId: ViewerId,
        textSize: 'small' | 'medium' | 'large',
    },
};

export type TextPrimitiveEvent =
    | TextDidResizeEvent;

class TextPrimitive extends React.PureComponent<TextPrimitiveProps & InternalProps, TextPrimitiveState> {
    static defaultProps: Partial<TextPrimitiveProps> = {
        color: 'default',
        variant: 'plain',
    };

    constructor(props: TextPrimitiveProps & InternalProps) {
        super(props);
        this.state = {
            textSize: 'medium',
        };
    }

    public getHandle(): TextPrimitiveHandle {
        const { textSize } = this.state;
        return {
            textSize,
            doResize: (size) => {
                this.setState({ textSize: size });
            },
        };
    }

    componentDidUpdate(prevProps: any, prevState: TextPrimitiveState): void {
        const { viewerId, emit } = this.props.interactions;
        const { textSize } = this.state;
        if (textSize !== prevState.textSize) {
            emit<TextPrimitiveEvent>('Text.DidResize', { viewerId, textSize });
        }
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, variant, interactions, light } = this.props;
        const { mouseHandlers } = interactions;
        const { textSize } = this.state;

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
        const names = clsx({
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
                variant === 'token' && color === 'default' && light === 'highlight',
            [classes.primaryTokenHighlight]:
                variant === 'token' && color === 'primary' && light === 'highlight',
            [classes.secondaryTokenHighlight]:
                variant === 'token' && color === 'secondary' && light === 'highlight',
            [classes.errorTokenHighlight]:
                variant === 'token' && color === 'error' && light === 'highlight',

            [classes.defaultTokenSelected]:
                variant === 'token' && color === 'default' && light === 'selected',
            [classes.primaryTokenSelected]:
                variant === 'token' && color === 'primary' && light === 'selected',
            [classes.secondaryTokenSelected]:
                variant === 'token' && color === 'secondary' && light === 'selected',
            [classes.errorTokenSelected]:
                variant === 'token' && color === 'error' && light === 'selected',
        });
        return variant === 'token' ? (
            <div className={names} {...mouseHandlers}>
                {lines}
            </div>
        ) : (
            <span className={names} {...mouseHandlers}>
                {lines}
            </span>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    text: {
        textAlign: 'left',
        overflow: 'hidden',
        width: 'fit-content',
        color: theme.palette.text.primary,
    },

    // Font sizes.
    small: {
        fontSize: theme.scale(12),
    },
    medium: {
        fontSize: theme.scale(14),
    },
    large: {
        fontSize: theme.scale(16),
    },

    // Font styles.
    sansSerif: {
        fontFamily: theme.fonts.sans,
    },
    monospace: {
        fontFamily: theme.fonts.monospace,
        fontSize: 'small',  // Need to adjust for difference.
    },
    framed: {
        padding: `${theme.scale(1)}px ${theme.scale(2)}px`,
        borderRadius: theme.shape.borderRadius,
        display: 'inline-block',
        verticalAlign: 'middle',
        wordWrap: 'break-word',
    },
    invisible: {
        visibility: 'hidden',
    },

    // Sans-serif styles.
    defaultPlain: {
        color: theme.color.grey.d3,
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
        backgroundColor: theme.color.grey.l2,
        color: theme.color.grey.d2,
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
    // TODO: choose colors for these styles
    defaultTokenHighlight: {
        backgroundColor: theme.palette.primary.light,
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

    // Selected monospace styles
    // TODO: choose colors for these styles
    defaultTokenSelected: {
        backgroundColor: theme.palette.primary.light,
    },
    primaryTokenSelected: {
        backgroundColor: theme.palette.primary.light,
    },
    secondaryTokenSelected: {
        backgroundColor: theme.palette.secondary.light,
    },
    errorTokenSelected: {
        backgroundColor: theme.palette.error.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(TextPrimitive) as React.ComponentClass<TextPrimitiveProps>;
