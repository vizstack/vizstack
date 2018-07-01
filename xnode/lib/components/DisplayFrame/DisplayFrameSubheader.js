'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';


/**
 * This dumb component creates a subheader bar for a display frame that horizontally lays out its children components.
 * A header is thicker and is emphasized with an accent color; it will typically contain title/subtitle text and icons,
 * grouped with `div`s appropriately for the desired spacing.
 */
class DisplayFrameSubheader extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes:  PropTypes.object.isRequired,

        /** React components within opening & closing tags. */
        children: PropTypes.object,
    };

    /**
     * Renders a frame container that wraps the children components.
     */
    render() {
        const { classes, children } = this.props;
        return (
            <div className={classNames('xn-display-frame-header', classes.header, classes.title)}>
                {children}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        height: 20,
        userSelect: 'none',
    },
    title: {
        flex: 1,
        color: '#FFFFFF',
        overflow: 'hidden',
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '9pt',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
    },
});

export default withStyles(styles)(DisplayFrameSubheader);
