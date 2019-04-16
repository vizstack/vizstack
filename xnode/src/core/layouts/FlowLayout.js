// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../Viewer';
import type { ViewerProps } from '../Viewer';

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class FlowLayout extends React.PureComponent<{
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

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewerProps>,
}> {
    /** Prop default values. */
    static defaultProps = {};

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, isHovered, mouseProps } = this.props;

        return (
            <div
                className={classNames({
                    [classes.root]: true,
                    [classes.hovered]: isHovered,
                    [classes.notHovered]: !isHovered,
                })}
                {...mouseProps}
            >
                {elements.map((viewerProps, i) => {
                    return <Viewer key={i} {...viewerProps} />;
                })}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    root: {
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
    },
    hovered: {
        borderColor: theme.palette.primary.light,
    },
    notHovered: {
        borderColor: 'transparent',
    },
});

export default withStyles(styles)(FlowLayout);
