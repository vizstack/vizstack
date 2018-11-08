import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';


import DisplayFrame, { DisplayFrameContent } from './DisplayFrame/index';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';


/**
 * This dumb component renders a `DisplayFrame` and `DisplayFrameHeader`, which together factor out the elements and
 * functions common to all `[*]ViewerSpec`.
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

        /** Left-justified text string/element to display before frame. */
        title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),

        /** Right-justified button elements to overlay on content, with the following data schema:
         * [{title: "Click  Me", onClick: myFn, icon: <MyIcon/>},...] */
        buttons: PropTypes.array,
    };

    /**
     * Renders child components inside the common frame/header/content, with `additionalIcons`/`additionalText`
     * providing any viewer-specific modifications to header.
     */
    render() {
        const { classes, children, title, buttons } = this.props;

        const buttonsComponents = buttons.map((button, idx) => (
            <Tooltip key={idx} placement='bottom' title={button.title}>
                <IconButton aria-label={button.title} onClick={button.onClick}>{button.icon}</IconButton>
            </Tooltip>
        ));

        return (
            <div>
                {title ? <span className={classes.title}>{title}</span> : null}
                <DisplayFrame>
                    <DisplayFrameContent>
                        {children}
                        <div className={classes.buttons}>
                            {buttonsComponents}
                        </div>
                    </DisplayFrameContent>
                </DisplayFrame>
            </div>
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
    title: {
        textAlign: 'left',
    },
    buttons: {
        position: 'absolute',
        right: 2, // TODO: Dehardcode this
        top: 2,   // TODO: Dehardcode this
    }
});

export default withStyles(styles)(ViewerDisplayFrame);
