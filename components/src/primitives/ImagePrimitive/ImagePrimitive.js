// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import type {
    ViewerDidMouseEvent, ViewerId, ViewerDidHighlightEvent
} from '../../interaction';
import { getViewerMouseFunctions } from '../../interaction';
import type {TextDidResizeEvent, TextPrimitiveHandle} from "../TextPrimitive";

/**
 * This pure dumb component renders visualization for a text string that represents a token.
 */
type ImagePrimitiveProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** The `ViewerId` of the `Viewer` rendering this component. */
    viewerId: ViewerId,

    /** Updates the `ViewerHandle` of the `Viewer` rendering this component to reflect its current
     * state. Should be called whenever this component updates. */
    updateHandle: (ImagePrimitiveHandle) => void,

    /** Publishes an event to this component's `InteractionManager`. */
    emitEvent: <E: ImagePrimitivePub>($PropertyType<E, 'topic'>, $PropertyType<E, 'message'>) => void,

    /** Path at which the image file is saved. */
    filePath: string,
};

type ImagePrimitiveDefaultProps = {|
    updateHandle: (TextPrimitiveHandle) => void,
|};

type ImagePrimitiveState = {|
    isHighlighted: boolean,
|};

export type ImagePrimitiveHandle = {|
    isHighlighted: boolean,
    doHighlight: () => void,
    doUnhighlight: () => void,
|};

type ImagePrimitivePub = ViewerDidMouseEvent | ViewerDidHighlightEvent;

class ImagePrimitive extends React.PureComponent<ImagePrimitiveProps, ImagePrimitiveState> {
    static defaultProps: ImagePrimitiveDefaultProps = {
        updateHandle: () => {},
    };

    constructor(props: ImagePrimitiveProps) {
        super(props);
        this.state = {
            isHighlighted: false,
        };
    }

    _updateHandle() {
        const { updateHandle } = this.props;
        const { isHighlighted } = this.state;
        updateHandle({
            isHighlighted,
            doHighlight: () => {
                this.setState({ isHighlighted: true, });
            },
            doUnhighlight: () => {
                this.setState({ isHighlighted: false, },)
            },
        });
    }

    componentDidMount() {
        this._updateHandle();
    }

    componentDidUpdate(prevProps, prevState) {
        this._updateHandle();
        const { viewerId, emitEvent } = this.props;
        const { isHighlighted } = this.state;
        if (isHighlighted !== prevState.isHighlighted) {
            if (isHighlighted) {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidHighlight', { viewerId: (viewerId: ViewerId), });
            }
            else {
                emitEvent<ViewerDidHighlightEvent>('Viewer.DidUnhighlight', { viewerId: (viewerId: ViewerId), });
            }
        }
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, filePath, emitEvent, viewerId } = this.props;
        const { isHighlighted } = this.state;

        return (
            <img
                className={classNames({
                    [classes.image]: true,
                    [classes.imageHighlight]: isHighlighted,
                })}
                src={filePath}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                        '/Users/Nikhil/Desktop/xnode/xnode/src/components/primitives/ImagePrimitive/img-not-found.png'; // TODO: Remove this hack!
                }}
                title={filePath.replace('/Users/Nikhil/Desktop/xnode/python/demo/', '')}
                {...getViewerMouseFunctions(emitEvent, viewerId)}
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

    imageHighlight: {
        borderColor: theme.palette.primary.light,
    },
});

export default withStyles(styles)(ImagePrimitive);
