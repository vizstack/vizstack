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

        /** Left-justified icon element to display in header. */
        icon: PropTypes.element,

        /** Left-justified text string/element to display in header. */
        title: PropTypes.oneOfType(PropTypes.string, PropTypes.element),

        /** Right-justified button elements to display in header, with the following data schema:
         * [{title: "Click  Me", onClick: myFn, icon: <MyIcon/>},...] */
        buttons: PropTypes.array,
    };

    /**
     * Renders child components inside the common frame/header/content, with `additionalIcons`/`additionalText`
     * providing any viewer-specific modifications to header.
     */
    render() {
        const { classes, children, icon, title, buttons } = this.props;

        const buttonsComponents = buttons.map((button, idx) => (
            <Tooltip key={idx} placement='bottom' title={button.title}>
                <IconButton aria-label={button.title} onClick={button.onClick}>{button.icon}</IconButton>
            </Tooltip>
        ));

        return (
            <DisplayFrame>
                <DisplayFrameHeader>
                    <span className={classes.bundle}>
                        {icon ? <span className={classes.icon}>{icon}</span> : null}
                        {title ? <span className={classes.title}>{title}</span> : null}
                    </span>
                    <span className={classes.buttons}>
                        {buttonsComponents}
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
    bundle: {
       display: 'inline-flex',
    },
    icon: {
        textAlign: 'left',

        // Vertically center icon
        display: 'inline-flex',
        paddingRight: theme.spacing.unit,
    },
    title: {
        textAlign: 'left',
    },
    buttons: {
        textAlign: 'right',
    }
});

export default withStyles(styles)(ViewerDisplayFrame);
