import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { withSize } from 'react-sizeme';
import { createSelector } from 'reselect';
import { line, curveBasis, curveLinear } from 'd3';

import type {
    DagElementId,
    DagEdgeId,
    DagEdgeSpec,
    DagContainerSpec,
} from '../../../state/viztable/outputs';
import Viewer from '../../Viewer';
import type { ViewerProps } from '../../Viewer';
import layout from './layout';
import type { DagEdgeLayoutSpec, DagNodeLayoutSpec } from './layout';

function buildArrowheadMarker(id, color) {
    return (
        <marker
            key={id}
            id={id}
            viewBox='-5 -3 5 6'
            refX='0'
            refY='0'
            markerUnits='strokeWidth'
            markerWidth='4'
            markerHeight='3'
            orient='auto'
        >
            <path
                d='M 0 0 l 0 1 a 32 32 0 0 0 -5 2 l 1.5 -3 l -1.5 -3 a 32 32 0 0 0 5 2 l 0 1 z'
                fill={color}
            />
        </marker>
    );
}

/**
 * This pure dumb component renders a graph node as an SVG component that contains a Viewer.
 */
class DagNode extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Props to the `Viewer` sub-component. */
    viewerProps: ViewerProps,

    /** Position and size properties. */
    x: number,
    y: number,
    width: number,
    height: number,
}> {
    render() {
        const { classes, x, y, width, height, viewerProps } = this.props;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} className={classes.node} />
                <foreignObject x={x} y={y} width={width} height={height}>
                    <Viewer {...viewerProps} />
                </foreignObject>
            </g>
        );
    }
}

/**
 * This pure dumb component renders a graph edge as an SVG component that responds to mouse events
 * based on prop values.
 */
class DagEdge extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    id: number,
    baseColor: {},
    selectedColor: {},
    points: Array,
    isCurved: boolean,
    isBackground: boolean,
    isHovered: boolean,
    isSelected: boolean,
    isOtherActive: boolean,
    label: string,
    onClick?: () => void,
    onDoubleClick?: () => void,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
}> {
    render() {
        const {
            classes,
            id,
            baseColor,
            selectedColor,
            points,
            isCurved,
            isBackground,
            isHovered,
            isSelected,
            isOtherActive,
            label,
            onClick,
            onDoubleClick,
            onMouseEnter,
            onMouseLeave,
        } = this.props;
        let pathString = null;
        if (isCurved) {
            let curveGenerator = line().curve(curveBasis);
            pathString = curveGenerator(points.map(({ x, y }) => [x, y]));
        } else {
            let linearGenerator = line().curve(curveLinear);
            pathString = linearGenerator(points.map(({ x, y }) => [x, y]));
        }

        // Edge id needs to be globally unique, not just within this svg component
        return (
            <g>
                <path
                    d={pathString}
                    className={classNames({
                        [classes.edgeHotspot]: true,
                    })}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                />
                <path
                    id={id}
                    d={pathString}
                    pointerEvents='none'
                    style={{
                        stroke: isSelected ? selectedColor[kArrowStroke] : baseColor[kArrowStroke],
                        markerEnd: isSelected
                            ? `url(#arrowheadSelected${id})`
                            : `url(#arrowheadBase${id})`,
                    }}
                    className={classNames({
                        [classes.edge]: true,
                        [classes.edgeBackground]: isBackground,
                        [classes.edgeIsOtherActive]: isOtherActive,
                        [classes.edgeHovered]: isHovered,
                        [classes.edgeSelected]: isSelected,
                    })}
                />
                <text
                    dy='-1.5'
                    textAnchor='end'
                    pointerEvents='none'
                    className={classNames({
                        [classes.edgeLabel]: true,
                        [classes.edgeIsOtherActive]: isOtherActive,
                        [classes.edgeLabelHovered]: isHovered,
                        [classes.edgeLabelSelected]: isSelected,
                    })}
                >
                    <textPath xlinkHref={`#${id}`} startOffset='95%'>
                        {label}
                    </textPath>
                </text>
            </g>
        );
    }
}

/**
 * This pure dumb component renders a directed acyclic graph.
 */
class DagLayout extends React.PureComponent<
    {
        /** CSS-in-JS styling object. */
        classes: {},

        /** Node elements that are props to `Viewer` sub-components. */
        nodes: {
            [DagElementId]: ViewerProps,
        },

        /** Edge specifications of which nodes to connect. */
        edges: {
            [DagEdgeId]: DagEdgeSpec,
        },

        /** Container specifications for how to layout and group nodes. */
        containers: {
            [DagElementId]: DagContainerSpec,
        },
    },
    {
        /** Whether the graph needs to be re-layout. */
        shouldLayout: boolean,

        /** Graph element specifications, but now with size and position information. */
        nodes: {
            [DagElementId]: ViewerProps | DagNodeLayoutSpec,
        },
        edges: {
            [DagEdgeId]: DagEdgeSpec | DagEdgeLayoutSpec,
        },
        containers: {
            [DagElementId]: DagContainerSpec | DagNodeLayoutSpec,
        },

        /** Graph elements after layout sorted in ascending z-order. */
        elements: Array<{
            type: 'node' | 'edge' | 'container',
            id: DagElementId | DagEdgeId,
            z: number,
        }>,
    },
> {
    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = Immutable({
            shouldLayout: true,
            nodes: {},
            edges: {},
            containers: {},
            elements: [],
        });
    }

    componentDidMount() {
        // At this point, self and children elements have been rendered and mounted into the DOM, so
        // they have defined sizes which have been populated in `this.state` and which the
        // layout engine may use.
        this._layoutGraph();
    }

    componentDidUpdate() {
        // By default, a `PureComponent` will update if props and state have changed according to
        // a shallow comparison; since we use `Immutable` structures, this will trigger updates
        // at the correct conditions. Performing the layout will change the state, so we wrap it in
        // a condition to prevent infinite looping.
        if (this.state.shouldLayout) {
            this._layoutGraph();
        }
    }

    /**
     * Callback function to update the
     * @param nodeId
     * @param width
     * @param height
     * @private
     */
    _onElementResize(nodeId: DagNodeId, width, height) {
        this.setState((state) =>
            state
                .merge({ nodes: { [nodeId]: { width, height } } }, { deep: true })
                .set('shouldLayout', true),
        );
    }

    /**
     * Layout the graph using the current size dimensions.
     * @private
     */
    _layoutGraph() {
        const { classes } = this.props;
        const { nodes, edges, containers } = this.state;

        // TODO(rholmdahl): Layout.js magic here!
        layout(
            nodes.values() + containers.values(),
            edges.values(),
            (width, height, nodes, edges) => {
                // Separate nodes from containers.
                // let containers = nodes.filter((node) => node.id in containers.keys());

                // Sort elements by ascending z-order so SVGs can be overlaid correctly.
                // sort(({ z: z1 }, { z: z2 }) => z1 - z2);

                // Save elements into state.
                // this.setState((state) => state.merge())
                this.setState((state) => state.set('shouldLayout', false));
            },
        );
    }

    /**
     * Renders a DAG with nodes, edges, and containers. Nodes can contain `Viewer` objects. Edges
     * can have string labels. Containers can be collapsed or expanded.
     */
    // arrowheads = [makeArrowheadMarker(...), ...]
    // <defs>{arrowheads}</defs>
    render() {
        const { classes, size } = this.props;
        const { graph } = this.state;

        return (
            <div className={classes.container}>
                <div className={classes.graph}>
                    <svg width={size.width} height={size.height}>
                        <rect
                            x={0}
                            y={0}
                            width={size.width}
                            height={size.height}
                            fill='transparent'
                            onClick={undefined}
                        />
                        {graph}
                    </svg>
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
        flex: 1, // expand to fill frame vertical

        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center', // along main axis (horizontal)
        alignItems: 'stretch', // along cross axis (vertical)
        overflow: 'hidden',
    },
    graph: {
        flex: 'auto', // makes graph fill remaining space so sidebar is on side
        overflow: 'auto',
        textAlign: 'left', // so SVG doesn't move
    },

    /** Edge styles. */
    edge: {
        fill: 'none',
        strokeWidth: 2.5,
    },
    edgeHotspot: {
        fill: 'none',
        stroke: 'transparent',
        strokeWidth: 12,
    },
    edgeHovered: {
        opacity: 1,
        strokeWidth: 3.5,
    },
    edgeSelected: {
        opacity: 1,
        strokeWidth: 3.5,
        markerEnd: 'url(#arrowheadBlue)',
    },
    edgeBackground: {
        opacity: 0.5,
    },
    edgeIsOtherActive: {
        opacity: 0.1,
    },
    edgeLabel: {
        opacity: 0,
        textAlign: 'right',
        fontFamily: theme.typography.monospace.fontFamily,
        fontSize: '7pt',
        userSelect: 'none',
    },
    edgeLabelHovered: {
        opacity: 1,
        fontWeight: theme.typography.fontWeightMedium,
    },
    edgeLabelSelected: {
        opacity: 1,
    },

    /** Node styles. */
    node: {
        fillOpacity: 0.2,
        stroke: 'transparent', // TODO: Remove this?
        strokeWidth: 4,
        rx: 4,
        ry: 4,
        transition: [
            theme.transitions.create(['width', 'height', 'x', 'y'], {
                duration: theme.transitions.duration.short,
            }),
            theme.transitions.create(['fill-opacity'], {
                duration: theme.transitions.duration.shortest,
                delay: theme.transitions.duration.short,
            }),
        ].join(', '),
    },
});

export default withSize()(withStyles(styles)(DagLayout));
