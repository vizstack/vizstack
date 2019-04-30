// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../Viewer/Viewer';
import type { ViewId } from '../../schema';
import type { ViewerToViewerProps } from '../../Viewer/Viewer';
import type { Event, InteractionMessage } from '../../interaction';

type FlowLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    lastEvent?: Event,
    publishEvent: (eventName: string, message: InteractionMessage) => void,

    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: Array<ViewId>,
};

type FlowLayoutState = {};

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class FlowLayout extends React.PureComponent<FlowLayoutProps, FlowLayoutState> {
    /** Prop default values. */
    static defaultProps = {};

    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, viewerToViewerProps } = this.props;

        return (
            <div
                className={classNames({
                    [classes.root]: true,
                })}
            >
                {elements.map((viewId, i) => {
                    return <Viewer key={i} {...viewerToViewerProps} viewId={viewId} />;
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
        borderColor: 'transparent',
    },
    hovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(FlowLayout);
