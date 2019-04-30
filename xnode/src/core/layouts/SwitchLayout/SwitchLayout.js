// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../Viewer';
import type { ViewerToViewerProps } from '../../Viewer';

import type { ViewId } from '../../schema';
import type { Event, InteractionMessage } from '../../interaction';

type SwitchLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    lastEvent?: Event,
    publishEvent: (eventName: string, msg: InteractionMessage) => void,

    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: ViewId[],
};

type SwitchLayoutState = {
    isHovered: boolean,
    currElementIdx: number,
};

/**
 * This pure dumb component renders visualization for a stack of elements that can be switched
 * between.
 */
class SwitchLayout extends React.PureComponent<SwitchLayoutProps, SwitchLayoutState> {
    /** Prop default values. */
    static defaultProps = {};

    constructor(props: SwitchLayoutProps) {
        super(props);
        this.state = {
            isHovered: false,
            currElementIdx: 0,
        };
    }

    componentDidUpdate(prevProps, prevState) {
        const { lastEvent, elements } = this.props;
        const { currElementIdx } = this.state;
        if (prevProps.lastEvent !== lastEvent && lastEvent !== undefined && lastEvent !== null) {
            const { eventName } = lastEvent;
            if (eventName === 'hover') {
                this.setState({ isHovered: true });
            }
            if (eventName === 'unhover') {
                this.setState({ isHovered: false });
            }
            if (eventName === 'advance') {
                this.setState({ currElementIdx: (currElementIdx + 1) % elements.length });
            }
        }
    }
    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, publishEvent, viewerToViewerProps } = this.props;
        const { isHovered, currElementIdx } = this.state;

        // TODO: don't repeat this in every view
        const mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                publishEvent('click', {});
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                publishEvent('mouseOver', {});
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                publishEvent('mouseOut', {});
            },
        };

        const viewId = elements[currElementIdx];

        return (
            <div
                className={classNames({
                    [classes.container]: true,
                    [classes.containerHovered]: isHovered,
                })}
                {...mouseProps}
            >
                <div key={viewId}>
                    <Viewer {...viewerToViewerProps} viewId={viewId} />
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    container: {
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        padding: theme.spacing.unit,
    },
    containerHovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(SwitchLayout);
