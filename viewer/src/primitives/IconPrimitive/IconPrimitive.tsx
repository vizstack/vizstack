import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import Icon from '@material-ui/core/Icon';
import 'material-icons';  // TODO: Replace with better solution.

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
            <div className={classes.container}>
                <Icon
                    className={clsx({
                        [classes.icon]: true,
                        [classes.emphasisNormal]: emphasis === 'normal',
                        [classes.emphasisLess]: emphasis === 'less',
                        [classes.emphasisMore]: emphasis === 'more',
                    })}
                    
                    {...mouseHandlers}
                >
                    {`${name}_outlined`}
                </Icon>
            </div> 
        );
    }
}

const styles = (theme: Theme) => createStyles({
    container: {
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    icon: {
        ...theme.vars.icon,
    },

    emphasisNormal: { color: theme.vars.emphasis.normal },
    emphasisLess: { color: theme.vars.emphasis.less },
    emphasisMore: { color: theme.vars.emphasis.more },

    // TODO: Add light.
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(IconPrimitive) as React.ComponentClass<IconPrimitiveProps>;
