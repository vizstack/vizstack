import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

/**
 * This pure dumb component creates a subheader bar for a display frame that horizontally lays out its children
 * components. A subheader is thinner and is emphasized with an accent color; it will typically contain only icons,
 * grouped with `div`s appropriately for the desired spacing.
 */
class DisplayFrameHeader extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** React components within opening & closing tags. */
    children: React.Node,

    /** Class tags to allow additional styling of container. */
    className?: string,
}> {
    /**
     * Renders a subheader container with specific styling and horizontal layout properties.
     */
    render() {
        const { classes, children, className } = this.props;
        return (
            <div className={classNames('xn-display-frame-subheader', classes.header, className)}>
                {children}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    header: {
        // Layout child components horizontally
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

        // No text selection within header
        userSelect: 'none',

        // Padding
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: theme.spacing.unit,
        paddingRight: theme.spacing.unit,

        // Fixed height (no change)
        flex: 'none',

        // Text styling
        '& span': {
            flex: 1,
            color: '#FFFFFF',
            overflow: 'hidden',
            fontFamily: theme.typography.monospace.fontFamily,
            fontSize: '9pt',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            cursor: 'default',
        },

        // Transitions
        transition: theme.transitions.create(['background'], {
            duration: theme.transitions.duration.shortest,
        }),
    },
});

export default withStyles(styles)(DisplayFrameHeader);
