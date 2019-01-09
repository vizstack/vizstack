import * as React from 'react';
import classNames from 'classnames';
import Immutable from 'seamless-immutable';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import { line, curveBasis, curveLinear } from 'd3';
import Measure from 'react-measure';

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
import { arr2obj, obj2arr, obj2obj } from '../../../services/data-utils';

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

    /** Callback on component resize. */
    onResize: (number, number) => void,
}> {
    render() {
        const { classes, x, y, width, height, viewerProps, onResize } = this.props;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} className={classes.node} />
                <foreignObject x={x} y={y} width={width} height={height}>
                    <Measure
                        bounds
                        onResize={(contentRect) =>
                            onResize(contentRect.bounds.width, contentRect.bounds.height)
                        }
                    >
                        {({ measureRef }) => (
                            <div ref={measureRef} style={{width: 100}}>
                                <Viewer {...viewerProps} />
                            </div>
                        )}
                    </Measure>
                </foreignObject>
            </g>
        );
    }
}

/**
 * This pure dumb component renders a graph container as an SVG component that contains other nodes
 * and containers.
 */
class DagContainer extends React.PureComponent<{
    /** CSS-in-JS styling object. */
    classes: {},

    /** Position and size properties. */
    x: number,
    y: number,
    width: number,
    height: number,
}> {
    render() {
        const { classes, x, y, width, height } = this.props;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} className={classes.dagContainer} />
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

    /** Curve point coordinates. */
    points: Array<[number, number]>,

    id: number,
    baseColor: string,
    selectedColor: string,
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
    static defaultProps = {
        baseColor: '#FF0000',
        selectedColor: '#00FF00',
    };

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

        if (!points) {
            return null;
        }

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
                        stroke: isSelected ? selectedColor : baseColor,
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
class DagLayout extends React.Component<
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
            [DagElementId]: DagNodeLayoutSpec,
        },
        edges: {
            [DagEdgeId]: DagEdgeLayoutSpec,
        },
        containers: {
            [DagElementId]: DagNodeLayoutSpec,
        },

        /** Arrangement of graph elements after layout, sorted in ascending z-order. */
        ordering: Array<{
            type: 'node' | 'edge' | 'container',
            id: DagElementId | DagEdgeId,
        }>,

        /** Size of the graph determined by layout engine. */
        size: {
            width: number,
            height: number,
        },
    },
> {
    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = Immutable({
            shouldLayout: false,
            nodes: {},
            edges: {},
            containers: {},
            ordering: [],
            size: {
                width: 0,
                height: 0,
            },
        });
    }

    componentDidMount() {
        // At this point, self and children elements have been rendered and mounted into the DOM, so
        // they have defined sizes which have been populated in `this.state` and which the
        // layout engine may use.
        console.debug('DagLayout -- componentDidMount(): mounted');

        // We want us to be mounted already, then populate self. Triggering other render.
        this.setState(Immutable({
            shouldLayout: false,
            nodes: obj2obj(this.props.nodes, (k, v) => [
                k,
                { id: k, children: [], orientation: 'vertical' },
            ]), // TODO: remove orientation
            edges: obj2obj(this.props.edges, (k, v) => [
                k,
                { id: k, startId: v.startId, endId: v.endId },
            ]),
            containers: obj2obj(this.props.containers, (k, v) => [
                k,
                {
                    id: k,
                    children: v.elements,
                    orientation:
                        v.flowDirection === 'left' || v.flowDirection === 'right'
                            ? 'vertical'
                            : 'horizontal',
                },
            ]),
            ordering: [
                ...obj2arr(this.props.nodes, (k, v) => ({ type: 'node', id: k })),
                ...obj2arr(this.props.containers, (k, v) => ({ type: 'container', id: k })),
                ...obj2arr(this.props.edges, (k, v) => ({ type: 'edge', id: k })),
            ],
            size: {
                width: 0,
                height: 0,
            },
        }));

        this.forceUpdate();
    }

    shouldComponentUpdate(nextProps, nextState) {
        // Prevent component from re-rendering each time a dimension is populated/updated unless all
        // dimensions are populated.
        const shouldUpdate = Object.values(nextState.nodes).every((node) => node.height);  // TODO: Add width
        console.log("DagLayout -- shouldComponentUpdate(): ", shouldUpdate, "nextState.nodes", Object.values(nextState.nodes));
        return shouldUpdate;
    }


    componentDidUpdate() {
        // By default, a `PureComponent` will update if props and state have changed according to
        // a shallow comparison; since we use `Immutable` structures, this will trigger updates
        // at the correct conditions. Performing the layout will change the state, so we wrap it in
        // a condition to prevent infinite looping.
        if (this.state.shouldLayout) {
            console.debug('DagLayout -- componentDidUpdate(): shouldLayout = true so will layout');
            this._layoutGraph();
        }
    }

    /**
     * Callback function to update a node's size dimensions (upon interacting with its `Viewer`).
     * @param nodeId
     * @param width
     * @param height
     * @private
     */
    _onElementResize(nodeId: DagElementId, width: number, height: number) {
        console.log(`DagLayout -- _onElementResize(${nodeId}, ${width}, ${height})`);
        this.setState((state) =>
            Immutable(state)
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
        const containerKeys = new Set(Object.keys(containers));

        // TODO(rholmdahl): Layout.js magic here!
        layout(
            Object.values(nodes.asMutable({ deep: true })).concat(
                Object.values(containers.asMutable({ deep: true })),
            ),
            [], // Object.values(edges.asMutable({deep: true})),
            (
                width: number,
                height: number,
                nodes: Array<DagNodeLayoutSpec>,
                edges: Array<DagEdgeLayoutSpec>,
            ) => {
                console.log('DagLayout -- _layoutGraph(): ELK callback triggered')
                // Separate nodes from containers.
                let containers = nodes.filter((node) => containerKeys.has(node.id));

                // Sort elements by ascending z-order so SVGs can be overlaid correctly.
                const elements = [...nodes, ...edges];
                elements.sort(({ z: z1 }, { z: z2 }) => z1 - z2);

                // Save elements into state, and no more layout out until explicitly triggered.
                this.setState((state) =>
                    Immutable(state).merge({
                        nodes: arr2obj(nodes, (elem) =>
                            !containerKeys.has(elem.id) ? [elem.id, {...elem, width: 86, height: 86}] : undefined,  // TODO: Change value to elem
                        ),
                        containers: arr2obj(nodes, (elem) =>
                            containerKeys.has(elem.id) ? [elem.id, elem] : undefined,
                        ),
                        edges: arr2obj(edges, (elem) => [elem.id, elem]),
                        ordering: elements.map((elem) => ({
                            type: elem.points
                                ? 'edge'
                                : containerKeys.has(elem.id)
                                ? 'container'
                                : 'node',
                            id: elem.id,
                        })),
                        size: { width, height },
                        shouldLayout: false,
                    }),
                );
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
        const { classes } = this.props;
        const { ordering, size } = this.state;

        console.log('DagLayout -- render(): ordering =', ordering, 'state =', this.state);

        return (
            <div className={classes.frame}>
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
                        {ordering.map(({ type, id }) => {
                            switch (type) {
                                case 'node': {
                                    const viewerProps = this.props.nodes[id];
                                    const { x, y, width, height } = this.state.nodes[id];
                                    return (
                                        <DagNode
                                            key={`n${id}`}
                                            viewerProps={viewerProps}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            classes={classes}
                                            onResize={(width, height) =>
                                                this._onElementResize(id, width, height)
                                            }
                                        />
                                    );
                                }

                                case 'edge': {
                                    const { points } = this.state.edges[id];
                                    return <DagEdge key={`e${id}`} points={points} classes={classes} />;
                                }

                                case 'container': {
                                    const { x, y, width, height } = this.state.containers[id];
                                    return (
                                        <DagContainer
                                            key={`c${id}`}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            classes={classes}
                                        />
                                    );
                                }

                                default:
                                    console.error('Got unrecognized graph element');
                                    return null;
                            }
                        })}
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
    frame: {
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

    /** Container styles. */
    dagContainer: {
        fillColor: '#FFFFFF', // TODO: Change this.
        fillOpacity: 0.2,
    },
});

export default withStyles(styles)(DagLayout);
