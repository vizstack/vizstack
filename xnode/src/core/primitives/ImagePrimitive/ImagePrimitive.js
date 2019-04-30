// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import type {Event, InteractionMessage} from "../../interaction";

type ImagePrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    lastEvent?: Event,
    publishEvent: (eventName: string, message: InteractionMessage) => void,

    /** Path at which the image file is saved. */
    filePath: string,
}

type ImagePrimitiveState = {
    isHovered: boolean,
}

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
class ImagePrimitive extends React.PureComponent<ImagePrimitiveProps, ImagePrimitiveState> {

    constructor(props: ImagePrimitiveProps) {
        super(props);
        this.state = {
            isHovered: false,
        }
    }

    componentDidUpdate(prevProps: ImagePrimitiveProps, prevState: ImagePrimitiveState) {
        const { lastEvent } = this.props;
        if (prevProps.lastEvent !== lastEvent && lastEvent !== undefined && lastEvent !== null) {
            const { eventName } = lastEvent;
            if (eventName === 'hover') {
                this.setState({
                    isHovered: true,
                })
            }
            if (eventName === 'unhover') {
                this.setState({
                    isHovered: false,
                })
            }
        }
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, filePath, publishEvent } = this.props;
        const { isHovered } = this.state;

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

        return (
            <img
                className={classNames({
                    [classes.image]: true,
                    [classes.hovered]: isHovered,
                })}
                src={filePath}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                        '/Users/Nikhil/Desktop/xnode/xnode/src/components/primitives/ImagePrimitive/img-not-found.png'; // TODO: Remove this hack!
                }}
                title={filePath.replace('/Users/Nikhil/Desktop/xnode/python/demo/', '')}
                {...mouseProps}
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
    compactImage: {
        width: theme.shape.image.small.width,
    },
    hovered: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(ImagePrimitive);
