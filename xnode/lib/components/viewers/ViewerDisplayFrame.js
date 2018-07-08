'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';
import { createSelector } from 'reselect';


import DisplayFrame, { DisplayFrameHeader, DisplayFrameContent } from '../DisplayFrame';
import Tooltip from 'material-ui/Tooltip';
import IconButton from 'material-ui/IconButton';

import CloseIcon from 'material-ui-icons/Close';
import CloneIcon from 'material-ui-icons/ContentCopy';
import FreezeIcon from 'material-ui-icons/History';  // Lock
import UnfreezeIcon from 'material-ui-icons/Update';  // LockOpen, Search


/**
 * This dumb component renders a `DisplayFrame` and `DisplayFrameHeader`, which together factor out the elements and
 * functions common to all `[*]Viewer`.
 * TODO: Add viewerId for easy identification
 * TODO: Close viewers that were watch-created vs. explored
 * TODO: Add save to image button.
 */
class ViewerDisplayFrame extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** React components within opening & closing tags. */
        children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),

        /** Class tags to allow additional styling of the `DisplayFrame` container. */
        className: PropTypes.string,

        /** Viewer text properties. */
        viewerType: PropTypes.string.isRequired,
        viewerName: PropTypes.string,

        /**
         * Callback to remove viewer from the Canvas.
         */
        onClickClose: PropTypes.func.isRequired,

        /* Whether viewer is currently frozen. */
        isFrozen: PropTypes.bool.isRequired,

        /**
         * Callbacks to freeze a viewer (view as initial/creation version) or unfreeze it (view as it was most
         * recently).
         */
        onClickFreeze: PropTypes.func.isRequired,
        onClickUnfreeze: PropTypes.func.isRequired,

        /**
         * Callback to make a copy of the viewer within the Canvas.
         */
        onClickClone: PropTypes.func.isRequired,

        /** Extra icon button React element(s) to append to front of viewer-general icon buttons. */
        additionalIcons: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),

        /** Extra text React element(s) to append to back of viewer-general text. */
        additionalText: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),
    };

    /**
     * Renders child components inside the common frame/header/content, with `additionalIcons`/`additionalText`
     * providing any viewer-specific modifications to header.
     */
    render() {
        const { classes, children, className, viewerType, viewerName, onClickClose,
            isFrozen, onClickFreeze, onClickUnfreeze, onClickClone, additionalIcons, additionalText } = this.props;

        return (
            <DisplayFrame className={className}>
                <DisplayFrameHeader>

                    <span>
                        <span className={classes.textType}>{`[${viewerType}]`}</span>
                        {viewerName ? <span className={classes.textName}>{`${viewerName}`}</span> : null}
                        {additionalText}
                    </span>

                    <span className={classes.icons}>
                        {additionalIcons}

                        <Tooltip placement='top' title='Clone'>
                            <IconButton aria-label='Clone' onClick={onClickClone}><CloneIcon /></IconButton>
                        </Tooltip>

                        { isFrozen ? (
                            <Tooltip placement='bottom' title='Unfreeze'>
                                <IconButton aria-label='Unfreeze' onClick={onClickUnfreeze}><UnfreezeIcon /></IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip placement='bottom' title='Freeze'>
                                <IconButton aria-label='Freeze' onClick={onClickFreeze}><FreezeIcon /></IconButton>
                            </Tooltip>
                        ) }

                        <Tooltip placement='bottom' title='Close'>
                            <IconButton aria-label='Close' onClick={onClickClose}><CloseIcon /></IconButton>
                        </Tooltip>
                    </span>

                </DisplayFrameHeader>

                <DisplayFrameContent className='ReactGridLayoutNoDrag'>
                    {children}
                </DisplayFrameContent>
            </DisplayFrame>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    textType: {
        textAlign: 'left',
    },
    textName: {
        textAlign: 'left',
    },
    icons: {
        textAlign: 'right',
    }
});

export default withStyles(styles)(ViewerDisplayFrame);
