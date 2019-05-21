// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import type {
    Event,
    EventMessage,
    MouseEventProps,
    OnViewerMouseEvent,
    OnResizeEvent,
    ReadOnlyViewerHandle,
    ResizeEvent,
    PrimitiveSize,
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
type ImagePrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    /** Events published to this view's `InteractionManager` which should be consumed by this
     * view. The message of each event in this array includes a "viewerId" field which is equal to
     * `props.viewerHandle.viewerId`. Each event in the array should be consumed only once. */
    lastEvents: Array<ImagePrimitiveSub>,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: ImagePrimitivePub) => void,

    /** Path at which the image file is saved. */
    filePath: string,
};

type ImagePrimitiveDefaultProps = {};

type ImagePrimitiveState = {
    size: PrimitiveSize,
};

type ImagePrimitivePub = OnViewerMouseEvent | OnResizeEvent;

type ImagePrimitiveSub = ResizeEvent;

class ImagePrimitive extends React.PureComponent<ImagePrimitiveProps, ImagePrimitiveState> {
    static defaultProps: ImagePrimitiveDefaultProps = {};

    constructor(props: ImagePrimitiveProps) {
        super(props);
        this.state = {
            size: 'medium',
        };
    }

    componentDidUpdate(
        prevProps: $ReadOnly<ImagePrimitiveProps>,
        prevState: $ReadOnly<ImagePrimitiveState>,
    ) {
        const { lastEvents } = this.props;
        lastEvents.forEach((event: ImagePrimitiveSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
            if (event.eventName === 'resize') {
                this.setState({
                    size: event.message.newSize,
                });
            }
        });
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, filePath, publishEvent, viewerHandle } = this.props;
        const { size } = this.state;

        return (
            <img
                className={classNames({
                    [classes.image]: true,
                    [classes.small]: size === 'small',
                    [classes.medium]: size === 'medium',
                    [classes.large]: size === 'large',
                })}
                src={filePath}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                        '/Users/Nikhil/Desktop/xnode/xnode/src/components/primitives/ImagePrimitive/img-not-found.png'; // TODO: Remove this hack!
                }}
                title={filePath.replace('/Users/Nikhil/Desktop/xnode/python/demo/', '')}
                {...getViewerMouseFunctions(publishEvent, viewerHandle)}
            />
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
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderColor: 'transparent',
    },

    // Image size; one for each value of `PrimitiveSize`.
    small: {
        width: theme.shape.image.small.width,
    },
    medium: {
        width: theme.shape.image.medium.width,
    },
    large: {
        width: theme.shape.image.large.width,
    },

    highlighted: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(ImagePrimitive);
