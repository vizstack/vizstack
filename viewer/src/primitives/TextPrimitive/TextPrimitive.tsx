import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { TextPrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer';
import Frame from '../../Frame';


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
        return (
            <Frame component='span' style='unframed' light={light} mouseHandlers={mouseHandlers}>
                <span className={clsx({
                    [classes.container]: true,

                    [classes.emphasisNormal]: emphasis === 'normal',
                    [classes.emphasisLess]: emphasis === 'less',
                    [classes.emphasisMore]: emphasis === 'more',

                    [classes.variantBody]: variant === 'body',
                    [classes.variantCaption]: variant === 'caption',
                    [classes.variantSubheading]: variant === 'subheading',
                    [classes.variantHeading]: variant === 'heading',
                })}>
                    {split.map((text, i) => (
                        <span key={i}>
                            {text}
                            {i < split.length - 1 ? <br /> : null}
                        </span>
                    ))}
                </span>
            </Frame>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        textAlign: 'left',
        overflow: 'hidden',
        width: 'fit-content',
    },

    emphasisNormal: { color: theme.vars.emphasis.normal },
    emphasisLess: { color: theme.vars.emphasis.less },
    emphasisMore: { color: theme.vars.emphasis.more },

    variantBody: { ...theme.vars.text.body },
    variantCaption: { ...theme.vars.text.caption },
    variantSubheading: { ...theme.vars.text.subheading },
    variantHeading: { ...theme.vars.text.heading },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(TextPrimitive) as React.ComponentClass<TextPrimitiveProps>;
