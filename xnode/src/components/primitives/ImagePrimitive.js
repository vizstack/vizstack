import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Typography from '@material-ui/core/Typography';
import ColorLightBlue from '@material-ui/core/colors/lightBlue';
import ColorBlue from '@material-ui/core/colors/blue';

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
class ImagePrimitive extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Whether the Viz is currently being hovered over by the cursor. */
    isHovered: boolean,

    /** Whether the Viz should lay out its contents spaciously. */
    isFullyExpanded: boolean,

    /** Event listeners which should be assigned to the Viz's outermost node. */
    mouseProps: {
        onClick: (e) => void,
        onMouseOver: (e) => void,
        onMouseOut: (e) => void,
    },

    /** Path at which the image file is saved. */
    filePath: string,
}> {
    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const {
            classes,
            filePath,
            mouseProps,
            isFullyExpanded,
        } = this.props;

        return (
            <img className={classNames({
                [classes.image]: true,
                [classes.compactImage]: !isFullyExpanded
            })} src={filePath} {...mouseProps} />
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    image: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: '100%',
        height: '100%',
    },
    compactImage: {
        width: '50%',
        height: '50%',
    }
});

export default withStyles(styles)(ImagePrimitive);
