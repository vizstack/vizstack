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
                    [classes.divComponent]: Component === 'div',
                    [classes.spanComponent]: Component === 'span',

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
        // Allow placement in flow.
        display: 'inline-block',  
        // Vertically centered in flow.
        verticalAlign: 'middle',  
        // If parent too small, allow v/h scroll bars.
        overflow: 'auto',  
        // As wide as possible within the parent, but no wider than the content actually needs. By
        // default, divs will take up whole width of parent, even for content that is smaller.
        width: 'fit-content',  
        // Font size must be 0 so text (e.g. in a span) has precise minimal height.
        fontSize: 0,
        // Line height must be 1 so text (e.g. in a span) has precise minimal spacing.
        lineHeight: 1,
    },
    spanComponent: {
        // Default setting properly aligns. Using 'middle' causes offset.
        verticalAlign: 'initial',  
        overflow: 'auto',
        fontSize: 0,
        lineHeight: 1,
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
