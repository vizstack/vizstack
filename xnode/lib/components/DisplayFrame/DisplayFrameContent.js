'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';


/**
 * This dumb component creates a content container for a display frame that vertically lays out its children
 * components.
 * TODO: This component could be improved by incorporating more complex grid layout functionality (using flexbox grid)
 * in order to more closely resemble Java's JPanel.
 */
class DisplayFrameContent extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes:  PropTypes.object.isRequired,

        /** React components within opening & closing tags. */
        children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),

        /** Class tags to allow additional styling of container. */
        className: PropTypes.string,
    };

    /**
     * Renders a content container with specific styling and vertical layout properties.
     */
    render() {
        const { classes, children, className } = this.props;
        return (
            <div className={classNames(classes.content, className)}>
                {children}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    content: {
        flexGrow: 1,            // Fill rest of vertical space in DisplayFrame container

        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',

        padding: 8,
    },
});

export default withStyles(styles)(DisplayFrameContent);
