import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';


/**
 * This dumb component creates a display frame that vertically lays out any number of the following components:
 * DisplayFrameHeader, DisplayFrameSubheader, DisplayFrameContent.
 */
class DisplayFrame extends React.PureComponent<{

    /** CSS-in-JS styling object. */
    classes: {},

    /** React components within opening & closing tags. */
    children: React.Node,

    /** Class tags to allow additional styling of container. */
    className?: string,

}> {

    /**
     * Renders a container with specific styling and vertical layout properties.
     */
    render() {
        const { classes, children, className } = this.props;
        return (
            <div className={classNames('xn-display-frame-container', classes.container, className)}>
                {children}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: theme.shape.borderRadius.regular,
    },
});

export default withStyles(styles)(DisplayFrame);