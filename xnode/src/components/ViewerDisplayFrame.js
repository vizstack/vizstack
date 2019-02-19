import * as React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import DisplayFrame, { DisplayFrameContent } from './DisplayFrame/index';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';

/**
 * This dumb component renders a `DisplayFrame` and `DisplayFrameHeader`, which together factor out the elements and
 * functions common to all `[*]ViewerSpec`.
 * TODO: Add save to image button.
 */
class ViewerDisplayFrame extends React.Component<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** React components within opening & closing tags. */
    children: React.Node,

    /** Right-justified button elements to overlay on content, with the following data schema:
     * [{title: "Click  Me", onClick: myFn, icon: <MyIcon/>},...] */
    buttons?: Array<{
        title: string,
        onClick: () => mixed,
        icon: React.Node,
    }>,
}> {
    /**
     * Renders child components inside the common frame/header/content, with `additionalIcons`/`additionalText`
     * providing any viewer-specific modifications to header.
     */
    render() {
        const { classes, children, buttons } = this.props;

        const buttonsComponents = buttons.map((button, idx) => (
            <Tooltip key={idx} placement='bottom' title={button.title}>
                <IconButton aria-label={button.title} onClick={button.onClick}>
                    {button.icon}
                </IconButton>
            </Tooltip>
        ));

        return (
            <div className={classes.container}>
                <DisplayFrame>
                    <DisplayFrameContent orientation="horizontal">
                        <div className={classes.contents}>
                            {children}
                        </div>
                        <div className={classes.buttons}>{buttonsComponents}</div>
                    </DisplayFrameContent>
                </DisplayFrame>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        paddingTop: theme.spacing.unit,
        paddingBottom: theme.spacing.unit,
    },
    contents: {
        flexGrow: 1,
        overflow: 'auto',
    },
    buttons: {
        display: 'flex',
        flexDirection: 'column',
    },
});

export default withStyles(styles)(ViewerDisplayFrame);
