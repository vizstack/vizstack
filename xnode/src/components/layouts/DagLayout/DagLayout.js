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
import type { ViewerCreationProps } from '../../Viewer';

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

    /** Contents of node that serve as props to the `Viewer` sub-component. */
    element: ViewerCreationProps,

    /** Position and size properties. */
    x: number,
    y: number,
    width: number,
    height: number,
}> {
    render() {
        const { classes, x, y, width, height, element } = this.props;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} className={classes.node} />
                <foreignObject x={x} y={y} width={width} height={height}>
                    <Viewer {...element} />
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
class DagLayout extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Node elements that serve as props to `Viewer` sub-components. */
    nodes: {
        [DagElementId]: ViewerCreationProps,
    },

    /** Edge specifications of which nodes to connect. */
    edges: {
        [DagEdgeId]: DagEdgeSpec,
    },

    /** Container specifications for how to layout and group nodes. */
    containers: {
        [DagContainerId]: DagContainerSpec,
    },
}> {
    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = Immutable({
            nodeSizes: {},
        });

        const foo: { foo: bool } = { foo: true };
    }

    componentDidMount() {

    }

    componentDidUpdate() {
        if(true /* coniditon*/) {

        }
    }

    updateGraph() {
        const { classes } = this.props;
        const { nodes, edges, containers } = this.props;

        const nodeComponents = nodes.map((node) => {
            return {
                component: (
                    <DagNode ref={(r) => this.nodeRefs[node.vizId]} classes={classes} {...node} />
                ),
                z: node.z,
            };
        });
        const edgeComponents = edges.map((edge) => {
            return {
                component: <DagEdge classes={classes} {...edge} />,
                z: edge.z,
            };
        });

        const graphComponents = nodeComponents
            .concat(edgeComponents)
            .sort(({ z: z1 }, { z: z2 }) => z1 - z2)
            .map(({ component }) => component);

        // TODO: Return or save?
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
