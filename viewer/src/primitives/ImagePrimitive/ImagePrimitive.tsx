import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { ImagePrimitiveFragment } from '@vizstack/schema';
import { FragmentProps } from '../../Viewer';
import { ViewerId } from '../../interaction';

/* This pure dumb component renders visualization for a text string that represents a token. */
type ImagePrimitiveProps = FragmentProps<ImagePrimitiveFragment>;

type ImagePrimitiveState = {};

export type ImagePrimitiveHandle = {};

export type ImagePrimitiveEvent = {};

class ImagePrimitive extends React.PureComponent<ImagePrimitiveProps & InternalProps, ImagePrimitiveState> {

    constructor(props: ImagePrimitiveProps & InternalProps) {
        super(props);
        this.state = {};
    }

    public getHandle(): ImagePrimitiveHandle {
        return {};
    }

    componentDidUpdate(prevProps: any, prevState: ImagePrimitiveState) {
    }

    /**
     * Renders the text as a 1 element sequence to ensure consistent formatting
     */
    render() {
        const { classes, filePath, interactions, light } = this.props;
        const { mouseHandlers } = interactions;

        return (
            <img
                className={clsx({
                    [classes.image]: true,
                    [classes.imageHighlight]: light === 'highlight',
                })}
                src={filePath}
                onError={(e: any) => {
                    e.target.onerror = null;
                    e.target.src = './img-not-found.png';
                }}
                {...mouseHandlers}
            />
        );
    }
}

const styles = (theme: Theme) => createStyles({
    image: {
        marginLeft: theme.scale(8),
        marginRight: theme.scale(8),
        ...theme.vars.fragmentContainer,
        borderColor: 'transparent',
    },

    imageHighlight: {
        borderColor: theme.palette.primary.light,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(ImagePrimitive) as React.ComponentClass<ImagePrimitiveProps>;
