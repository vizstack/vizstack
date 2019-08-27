import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../theme';

/**
 * This pure dumb component renders a frame that wraps a Fragment component.
 */
type FrameProps = {
    children?: React.ReactNode,
    component?: 'div' | 'span',
    style?: 'framed' | 'unframed',
    light?: 'normal' | 'highlight' | 'lowlight' | 'selected',
    mouseHandlers?: {},
};

type FrameState = {};

class Frame extends React.PureComponent<FrameProps & InternalProps, FrameState> {
    static defaultProps: Partial<FrameProps> = {
        component: 'div',
        light: 'normal',
        mouseHandlers: {},
        style: 'framed',
    };

    render() {
        const { classes, children, component, light, style, mouseHandlers } = this.props;
        const Component = component || 'div';

        return (
            <Component
                className={clsx({
                    [classes.framed]: style === 'framed',
                    [classes.framedLowlight]: style === 'framed' && light === 'lowlight',
                    [classes.framedHighlight]: style === 'framed' && light === 'highlight',
                    [classes.framedSelected]: style === 'framed' && light === 'selected',

                    [classes.unframed]: style === 'unframed',
                    [classes.unframedLowlight]: style === 'unframed' && light === 'lowlight',
                    [classes.unframedHighlight]: style === 'unframed' && light === 'highlight',
                    [classes.unframedSelected]: style === 'unframed' && light === 'selected',
                })}
                {...mouseHandlers}
            >
                {children}
            </Component>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    divComponent: {
        display: 'inline-block',  // Can be placed in flow.
        verticalAlign: 'middle',  // Vertically centered in flow.
        // display: 'inline-flex',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: 'fit-content',
        
    },
    spanComponent: {
        overflow: 'hidden',
        width: 'fit-content',
        verticalAlign: 'middle',  // Vertically centered in flow.
    },
    framed: {
        ...theme.vars.framed.normal,
    },
    framedHighlight: {
        ...theme.vars.framed.highlight,
    },
    framedLowlight: {
        ...theme.vars.framed.lowlight,
    },
    framedSelected: {
        ...theme.vars.framed.selected,
    },
    unframed: {
        ...theme.vars.unframed.normal,
    },
    unframedHighlight: {
        ...theme.vars.unframed.highlight,
    },
    unframedLowlight: {
        ...theme.vars.unframed.lowlight,
    },
    unframedSelected: {
        ...theme.vars.unframed.selected,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(Frame) as React.ComponentClass<FrameProps>;
