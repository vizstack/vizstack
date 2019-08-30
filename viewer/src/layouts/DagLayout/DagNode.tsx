import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import Measure from 'react-measure';

/** The pixel width of the interactive border surrounding expansible/collapsible nodes. */
const kBorderWidth = 8;

/**
 * This pure dumb component renders a graph node as an SVG component that contains a Viewer.
 */
type DagNodeProps = {
    /** React components within opening & closing tags. */
    children?: React.ReactNode;

    /** Position and size properties. */
    x: number;
    y: number;
    width: number;
    height: number;

    /** Expansion state. */
    isExpanded: boolean;
    isInteractive?: boolean;
    isVisible?: boolean;

    /** Mouse event handlers which should be spread on the interactive region of the node. */
    mouseHandlers: {
        onClick?: (e: React.SyntheticEvent) => void;
        onDoubleClick?: (e: React.SyntheticEvent) => void;
        onMouseOver?: (e: React.SyntheticEvent) => void;
        onMouseOut?: (e: React.SyntheticEvent) => void;
    };

    /** Whether the node should highlight if expanded and not invisible. */
    isHighlighted: boolean;

    /** Callback on component resize. */
    onResize: (width: number, height: number) => void;
};

class DagNode extends React.PureComponent<DagNodeProps & InternalProps> {
    static defaultProps: Partial<DagNodeProps> = {
        isInteractive: true,
        isVisible: true,
    };

    render() {
        const {
            classes,
            x,
            y,
            width,
            height,
            children,
            isVisible,
            isInteractive,
            isHighlighted,
            isExpanded,
            mouseHandlers,
            onResize,
        } = this.props;

        // If the node is expanded, render an interactive rectangle
        if (isExpanded) {
            return (
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    className={clsx({
                        [classes.nodeInvisible]: isVisible === false,
                        [classes.nodeExpanded]: isVisible !== false,
                        [classes.nodeHighlighted]: isVisible !== false && isHighlighted,
                    })}
                    {...mouseHandlers}
                />
            );
        }

        // If not expanded, render the node, surrounded by an interactive border if `isInteractive`
        const foreignObjectPos = isInteractive
            ? {
                  x: x + kBorderWidth,
                  y: y + kBorderWidth,
                  width: width - kBorderWidth * 2,
                  height: height - kBorderWidth * 2,
              }
            : {
                  x,
                  y,
                  width,
                  height,
              };

        return (
            <g>
                {isInteractive ? (
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        stroke={'black'}
                        strokeOpacity={isHighlighted ? 0.4 : 0.2}
                        strokeWidth={kBorderWidth}
                        fill={'none'}
                        {...mouseHandlers}
                    />
                ) : null}
                <foreignObject
                    {...foreignObjectPos}
                    className={clsx({
                        [classes.node]: true,
                    })}
                >
                    <Measure
                        bounds
                        onResize={(contentRect) => {
                            const bounds = contentRect.bounds;
                            if (bounds) {
                                return isInteractive
                                    ? onResize(
                                          bounds.width + kBorderWidth * 2,
                                          bounds.height + kBorderWidth * 2,
                                      )
                                    : onResize(bounds.width, bounds.height);
                            }
                        }}
                    >
                        {({ measureRef }) => (
                            <div ref={measureRef} style={{ display: 'inline-block' }}>
                                {children}
                            </div>
                        )}
                    </Measure>
                </foreignObject>
            </g>
        );
    }
}

const styles = (theme: Theme) =>
    createStyles({
        node: {
            // fillOpacity: 0.2,
            // stroke: 'transparent', // TODO: Remove this?
            // strokeWidth: 4,
            // rx: 4,
            // ry: 4,
            // transition: [
            //     theme.transitions.create(['width', 'height', 'x', 'y'], {
            //         duration: theme.transitions.duration.short,
            //     }),
            //     theme.transitions.create(['fill-opacity'], {
            //         duration: theme.transitions.duration.shortest,
            //         delay: theme.transitions.duration.short,
            //     }),
            // ].join(', '),
        },

        nodeInvisible: {
            fill: '#FFFFFF', // TODO: Change this.
            fillOpacity: 0.1,
        },

        nodeExpanded: {
            fill: '#000000', // TODO: Change this.
            fillOpacity: 0.1,
        },

        nodeHighlighted: {
            fillOpacity: 0.2,
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(DagNode) as React.ComponentClass<DagNodeProps>;
