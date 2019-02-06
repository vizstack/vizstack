import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../Viewer';
import type { ViewerProps } from '../Viewer';
import ColorLightBlue from "@material-ui/core/colors/lightBlue";

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class FlowLayout extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    isHovered: boolean,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewerProps>,
}> {
    /** Prop default values. */
    static defaultProps = {
    };

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const {
            classes,
            elements,
            isHovered,
        } = this.props;

        return (
            <div className={classNames({
                [classes.root]: true,
                [classes.hovered]: isHovered,
                [classes.notHovered]: !isHovered,
            })}>
                {elements.map((viewerProps, i) => {
                    return (
                        <Viewer key={i} {...viewerProps} />
                    )
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
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: theme.shape.borderRadius.regular,
    },
    hovered: {
        borderColor: ColorLightBlue[400],
    },
    notHovered: {
        borderColor: 'transparent',
    },
});

export default withStyles(styles)(FlowLayout);
