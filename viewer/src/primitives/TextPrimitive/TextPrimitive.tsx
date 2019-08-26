import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { TextPrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer';


/* This pure dumb component renders visualization for a text string that represents a token. */
type TextPrimitiveProps = FragmentProps<TextPrimitiveFragment>;

type TextPrimitiveState = {};

export type TextPrimitiveHandle = {};

export type TextPrimitiveEvent = {};

class TextPrimitive extends React.PureComponent<TextPrimitiveProps & InternalProps, TextPrimitiveState> {
    static defaultProps: Partial<TextPrimitiveProps> = {
        variant: 'body',
        emphasis: 'normal',
    };

    constructor(props: TextPrimitiveProps & InternalProps) {
        super(props);
        this.state = {};
    }

    public getHandle(): TextPrimitiveHandle {
        return {};
    }

    componentDidUpdate(prevProps: any, prevState: TextPrimitiveState): void {}

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, variant, emphasis, interactions, light } = this.props;
        const { mouseHandlers } = interactions;

        const split = text.split('\n');
        const lines = split.map((text, i) => (
            <span key={i}>
                {text}
                {i < split.length - 1 ? <br /> : null}
            </span>
        ));
        const names = clsx({
            [classes.container]: true,
            [classes.containerLowlight]: light === 'lowlight',
            [classes.containerHighlight]: light === 'highlight',
            [classes.containerSelected]: light === 'selected',

            [classes.emphasisNormal]: emphasis === 'normal',
            [classes.emphasisLess]: emphasis === 'less',
            [classes.emphasisMore]: emphasis === 'more',

            [classes.variantBody]: variant === 'body',
            [classes.variantCaption]: variant === 'caption',
            [classes.variantSubheading]: variant === 'subheading',
            [classes.variantHeading]: variant === 'heading',
        });
        return (
            <span className={names} {...mouseHandlers}>
                {lines}
            </span>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        textAlign: 'left',
        overflow: 'hidden',
        width: 'fit-content',
        backgroundColor: theme.vars.unframed.normal.backgroundColor,
        borderBottomStyle: theme.vars.unframed.normal.borderStyle,
        borderBottomWidth: theme.vars.unframed.normal.borderWidth,
        borderBottomColor: theme.vars.unframed.normal.borderColor,
    },
    containerHighlight: {
        borderBottomColor: theme.vars.unframed.highlight.borderColor,
    },
    containerLowlight: {
        // ...theme.vars.unframed.lowlight,
    },
    containerSelected: {
        borderBottomColor: theme.vars.unframed.selected.borderColor,
    },

    emphasisNormal: { color: theme.vars.emphasis.normal },
    emphasisLess: { color: theme.vars.emphasis.less },
    emphasisMore: { color: theme.vars.emphasis.more },

    variantBody: { ...theme.vars.text.body },
    variantCaption: { ...theme.vars.text.caption },
    variantSubheading: { ...theme.vars.text.subheading },
    variantHeading: { ...theme.vars.text.heading },

    // TODO: Add light.
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(TextPrimitive) as React.ComponentClass<TextPrimitiveProps>;
