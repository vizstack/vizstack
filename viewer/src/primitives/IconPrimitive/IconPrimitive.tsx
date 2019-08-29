import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import './font.css';
import Frame from '../../Frame';

import defaultTheme from '../../theme';

import { IconPrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer/index';


/* This pure dumb component renders visualization for a text string that represents a token. */
type IconPrimitiveProps = FragmentProps<IconPrimitiveFragment>;

type IconPrimitiveState = {};

export type IconPrimitiveHandle = {};

export type IconPrimitiveEvent = {};

class IconPrimitive extends React.PureComponent<IconPrimitiveProps & InternalProps, IconPrimitiveState> {

    constructor(props: IconPrimitiveProps & InternalProps) {
        super(props);
        this.state = {};
    }

    public getHandle(): IconPrimitiveHandle {
        return {};
    }

    componentDidUpdate(prevProps: any, prevState: IconPrimitiveState) {}

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, name, emphasis, interactions, light } = this.props;
        const { mouseHandlers } = interactions;

        return (
            <Frame component='span' style='unframed' light={light} mouseHandlers={mouseHandlers}>
                <i
                    className={clsx({
                        [classes.icon]: true,
                        [classes.emphasisNormal]: emphasis === 'normal',
                        [classes.emphasisLess]: emphasis === 'less',
                        [classes.emphasisMore]: emphasis === 'more',
                    })}
                >
                    {// "add_circle" is an anomaly which requires "_outline" as a suffix
                    `${name}${name === 'add_circle' ? '_outline' : ''}`}
                </i>
            </Frame>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    icon: {
        ...theme.vars.icon,
        verticalAlign: 'middle',
        fontFamily: 'Material Icons Outlined',
        'font-weight': 'normal',
        'font-style': 'normal',
        // 'line-height': 1,
        'letter-spacing': 'normal',
        'text-transform': 'none',
        'display': 'inline-block',
        'white-space': 'nowrap',
        'word-wrap': 'normal',
        'direction': 'ltr',
        '-moz-font-feature-settings': 'liga',
        '-moz-osx-font-smoothing': 'grayscale',
    },

    emphasisNormal: { color: theme.vars.emphasis.normal },
    emphasisLess: { color: theme.vars.emphasis.less },
    emphasisMore: { color: theme.vars.emphasis.more },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(IconPrimitive) as React.ComponentClass<IconPrimitiveProps>;
