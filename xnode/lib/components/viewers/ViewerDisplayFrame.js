'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';


import DisplayFrame, { DisplayFrameHeader, DisplayFrameContent } from '../DisplayFrame';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';


/**
 * This dumb component renders a `DisplayFrame` and `DisplayFrameHeader`, which together factor out the elements and
 * functions common to all `[*]Viewer`.
 * TODO: Add viewerId for easy identification
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

        /** Header icons in the following data schema: [{title: "Click Me", onClick: myFn, icon: <MyIcon />},...] */
        icons: PropTypes.array,

        /** Text element(s) to append to back of viewer-general text. */
        text: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]),
    };

    /**
     * Renders child components inside the common frame/header/content, with `additionalIcons`/`additionalText`
     * providing any viewer-specific modifications to header.
     */
    render() {
        const { classes, children, className, viewerType, viewerName, icons, text } = this.props;

        const iconComponents = icons.map((icon, idx) => (
            <Tooltip key={idx} placement='bottom' title={icon.title}>
                <IconButton aria-label={icon.title} onClick={icon.onClick}>{icon.icon}</IconButton>
            </Tooltip>
        ));

        return (
            <DisplayFrame className={className}>
                <DisplayFrameHeader>
                    <span>
                        <span className={classes.textType}>{`[${viewerType}]  `}</span>
                        {viewerName ? <span className={classes.textName}>{`${viewerName}`}</span> : null}
                        {text}
                    </span>
                    <span className={classes.icons}>
                        {iconComponents}
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
