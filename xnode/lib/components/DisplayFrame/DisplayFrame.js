'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';


/**
 * This dumb component creates a display frame that vertically lays out any number of the following components:
 * DisplayFrameHeader, DisplayFrameSubheader, DisplayFrameContent.
 */
class DisplayFrame extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes:  PropTypes.object.isRequired,

        /** React components within opening & closing tags. */
        children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
    };

    /**
     * Renders a container with specific styling and vertical layout properties.
     */
    render() {
        const { classes, children } = this.props;
        return (
            <div className={classNames('xn-display-frame-container', classes.container)}>
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
        borderRadius: 4,  // TODO: Dehardcode this
    },
});

export default withStyles(styles)(DisplayFrame);