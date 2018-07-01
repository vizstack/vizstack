'use babel';

import React, { Component } from 'react';
import PropTypes from "prop-types";
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';

import IconButton from 'material-ui/IconButton';
import CloseIcon from 'material-ui-icons/Close';


/**
 * This dump component creates a window that houses a single top-level viewer component, which populates the window
 * contents. TODO: Extend features to allow reshuffling of ViewerFrames on Canvas.
 */
class ViewerFrame extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes:  PropTypes.object.isRequired,

        /** React components within opening & closing tags. */
        children: PropTypes.object,

        viewerId: PropTypes.number.isRequired,
        type:     PropTypes.string.isRequired,
        name:     PropTypes.string,

        /**
         * Removes this viewer from the Canvas.
         */
        removeViewer: PropTypes.func.isRequired,
    };

    /**
     * Renders a frame with a close button, and any of the component's children..
     */
    render() {
        const { classes, children, name, type, removeViewer } = this.props;
        return (
            <div className={classNames('xn-display-frame-container', classes.container)}>
                <div className={classNames('xn-display-frame-header', classes.header)}>
                    <span className={classes.title}>
                        {`${name ? name + " " : ""}[${type}]`}
                    </span>
                    <IconButton aria-label="Close"
                                onClick={() => removeViewer()}>
                        <CloseIcon style={{color: '#FFFFFF'}}/>
                    </IconButton>
                </div>
                <div className={classNames(classes.content, "ReactGridLayoutNoDrag")}>
                    {children}
                </div>
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
        borderRadius: 4,
    },
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
    content: {
        overflow: 'hidden',
        flexGrow: 1,  // fill rest of frame vertical
        display: 'flex',
        flexDirection: 'column',
    },
});

export default withStyles(styles)(ViewerFrame);
