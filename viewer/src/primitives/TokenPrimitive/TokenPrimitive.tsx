import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

import { TokenPrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer/index';


/* This pure dumb component renders visualization for a text string that represents a token. */
type TokenPrimitiveProps = FragmentProps<TokenPrimitiveFragment>;

type TokenPrimitiveState = {};

export type TokenPrimitiveHandle = {};

export type TokenPrimitiveEvent = {};

class TokenPrimitive extends React.PureComponent<TokenPrimitiveProps & InternalProps, TokenPrimitiveState> {
    static defaultProps: Partial<TokenPrimitiveProps> = {
        color: 'gray',
    };

    constructor(props: TokenPrimitiveProps & InternalProps) {
        super(props);
        this.state = {};
    }

    public getHandle(): TokenPrimitiveHandle {
        return {};
    }

    componentDidUpdate(prevProps: any, prevState: TokenPrimitiveState): void {}

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, text, color, interactions, light } = this.props;
        const { mouseHandlers } = interactions;

        const split = text.split('\n');
        const lines = split.map((text, i) => (
            <span key={i}>
                {text}
                {i < split.length - 1 ? <br /> : null}
            </span>
        ));
        const names = clsx({
            [classes.token]: true,
            [classes.gray]: color === 'gray',
            [classes.brown]: color === 'brown',
            [classes.purple]: color === 'purple',
            [classes.blue]: color === 'blue',
            [classes.green]: color === 'green',
            [classes.yellow]: color === 'yellow',
            [classes.orange]: color === 'orange',
            [classes.red]: color === 'red',
            [classes.pink]: color === 'pink',
        });

        return (
            <div className={names} {...mouseHandlers}>
                {lines}
            </div>
        );;
    }
}

const styles = (theme: Theme) => createStyles({
    token: {
        textAlign: 'left',
        verticalAlign: 'middle',
        wordWrap: 'break-word',

        display: 'inline-block',
        overflow: 'hidden',
        width: 'fit-content',
        padding: `${theme.scale(2)}px ${theme.scale(4)}px`,
        borderRadius: theme.scale(2),

        color: theme.vars.emphasis.normal,
        ...theme.vars.text.body,
    },

    gray: { backgroundColor: theme.vars.fills.gray },
    brown: { backgroundColor: theme.vars.fills.brown },
    purple: { backgroundColor: theme.vars.fills.purple },
    blue: { backgroundColor: theme.vars.fills.blue },
    green: { backgroundColor: theme.vars.fills.green },
    yellow: { backgroundColor: theme.vars.fills.yellow },
    orange: { backgroundColor: theme.vars.fills.orange },
    red: { backgroundColor: theme.vars.fills.red },
    pink: { backgroundColor: theme.vars.fills.pink },

    // TODO: Add light.
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(TokenPrimitive) as React.ComponentClass<TokenPrimitiveProps>;
