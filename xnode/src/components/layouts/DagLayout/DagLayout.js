import * as React from 'react';
import classNames from 'classnames';
import Immutable from 'seamless-immutable';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import { line, curveBasis, curveLinear } from 'd3';
import Measure from 'react-measure';

import type {
    DagNodeId,
    DagNodeSpec,
    DagEdgeId,
    DagEdgeSpec,
} from '../../../state/viztable/outputs';
import Viewer from '../../Viewer';
import type { ViewerProps } from '../../Viewer';
import layout from './layout';
import type { Edge, Node } from './layout';
import { arr2obj, obj2arr, obj2obj } from '../../../services/data-utils';


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

    /** Expansion state. */
    isExpanded: boolean,

    /** Callback on component resize. */
    onResize: (number, number) => void,
}> {
    render() {
        const { classes, x, y, width, height, viewerProps, isExpanded, onResize } = this.props;

        return (
            <g>
                {isExpanded ? (
                    <rect x={x} y={y} width={width} height={height} className={classes.nodeExpanded} />
                ) : (
                    <foreignObject x={x} y={y} width={width} height={height} className={classes.node}>
                        <Measure
                            bounds
                            onResize={(contentRect) =>
                                onResize(contentRect.bounds.width, contentRect.bounds.height)
                            }
                        >
                            {({ measureRef }) => (
                                <div ref={measureRef} style={{ display: 'inline-block' }}>
                                    <Viewer {...viewerProps} />
                                </div>
                            )}
                        </Measure>
                    </foreignObject>
                )}
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

    shape?: "curve" | "line" ,

    color?: "primary" | "secondary",

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
            points,
            shape,

            id,
            baseColor,
            selectedColor,
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

        if (!points || points.length === 0) {
            return null;
        }

        let path = null;
        switch(shape) {
            case 'curve':
                path = line().curve(curveBasis)(points);
                break;
            case 'line':
            default:
                path = line().curve(curveLinear)(points);
                break;
        }

        // Edge id needs to be globally unique, not just within this svg component
        return (
            <g>
                <path
                    d={path}
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
                    d={path}
                    pointerEvents='none'
                    style={{
                        stroke: isSelected ? selectedColor : baseColor,
                        markerEnd: isSelected
                            ? `url(#arrow-selected${id})`
                            : `url(#arrow-base${id})`,
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
const kNodeInitialWidth = 100000;
const kNodeResizeTolerance = 5;
class DagLayout extends React.Component<
    {
        /** CSS-in-JS styling object. */
        classes: {},

        isHovered: boolean,

        /** Node elements that are props to `Viewer` sub-components. */
        nodes: {
            [DagNodeId]: {
                viewerProps: ViewerProps,
                spec: DagNodeSpec,
            },
        },

        /** Edge specifications of which nodes to connect. */
        edges: {
            [DagEdgeId]: DagEdgeSpec,
        },
    },
    {
        /** Whether the graph needs to be re-layout. */
        shouldLayout: boolean,

        /** Graph element specifications, but now with size and position information. */
        nodes: {
            [DagNodeId]: Node,
        },
        edges: {
            [DagEdgeId]: Edge,
        },

        /** Arrangement of graph elements after layout, sorted in ascending z-order. */
        ordering: Array<{
            type: 'node' | 'edge',
            id: DagNodeId | DagEdgeId,
        }>,

        /** Size of the graph determined by layout engine. */
        size: {
            width: number,
            height: number,
        },
    },
> {
    // The lifecycle of this component is as follows.
    //     constructor(): Initialize state to be empty.
    //     render(): Render nothing because state is empty.
    //     componentDidMount(): Populate state by transforming props. Call `forceUpdate()`.
    //     render(): Render the not layouted elements.
    //     componentDidUpdate(): The not layouted elements have been mounted. Do not layout until
    //         all their sizes have been populated by `_onElementResize()`.
    //     shouldComponentUpdate(): Trigger update when all sizes are populated.
    //     render(): Render the not layouted elements (again).
    //     componentDidUpdate(): Call `_layoutGraph()` to layout the elements.
    //     render(): Render the layouted elements.
    //     componentDidUpdate(): Do nothing, because `shouldLayout` set to false during layout.
    // TODO: Is there an extraneous rerender of not layouted elements?

    /** Constructor. */
    constructor(props) {
        super(props);
        this.state = Immutable({
            shouldLayout: false,
            nodes: {},
            edges: {},
            ordering: [],
            size: {
                width: 0,
                height: 0,
            },
        });
    }

    componentDidMount() {
        // At this point, a render() has been called but nothing was rendered since state is
        // initialized to be empty.
        console.debug('DagLayout -- componentDidMount(): mounted');

        this.setState(
            Immutable({
                shouldLayout: false,  // False so no layout until sizes all populated.
                nodes: obj2obj(this.props.nodes, (k, { spec }) => [
                    k,
                    {
                        id: k,
                        children: spec.children,
                        flowDirection: spec.flowDirection,
                        alignChildren: spec.alignChildren,
                        ports: spec.ports,
                        width: kNodeInitialWidth,  // Allow space for `Viewer` to be rendered.
                        height: undefined,  // Needs to be populated.
                    },
                ]),
                edges: obj2obj(this.props.edges, (k, spec) => [
                    k,
                    {
                        id: k,
                        startId: spec.startId,
                        endId: spec.endId,
                        startPort: spec.startPort,
                        endPort: spec.endPort,
                    },
                ]),
                ordering: [
                    ...obj2arr(this.props.nodes, (k, v) => ({ type: 'node', id: k })),
                    ...obj2arr(this.props.edges, (k, v) => ({ type: 'edge', id: k })),
                ],
                size: {
                    width: 0,
                    height: 0,
                },
            }),
        );

        // Force render and mount of the not layouted components so they get their sizes.
        this.forceUpdate();
    }

    shouldComponentUpdate(nextProps, nextState) {
        // Prevent component from re-rendering each time a dimension is populated/updated unless all
        // dimensions are populated.
        const shouldUpdate = Object.values(nextState.nodes)
            .filter((node) => node.children.length === 0)  // Only keep leaves.
            .every((node) => node.height);
        console.log('DagLayout -- shouldComponentUpdate(): ', shouldUpdate);
        return shouldUpdate;
    }

    componentDidUpdate() {
        // Performing the layout will change the state, so we wrap it in a condition to prevent
        // infinite looping.
        console.log('DagLayout -- componentDidUpdate()');
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
    _onNodeResize(nodeId: DagNodeId, width: number, height: number) {
        console.log(`DagLayout -- _onNodeResize(${nodeId}, ${width}, ${height})`);

        // Do not react to resizes beyond some tolerance, e.g. due to platform instabilities or
        // trivial appearance changes.
        const prevWidth = this.state.nodes[nodeId].width;
        const prevHeight = this.state.nodes[nodeId].height;
        if (
            prevWidth !== undefined &&
            prevHeight !== undefined &&
            -kNodeResizeTolerance < prevWidth - width < kNodeResizeTolerance &&
            -kNodeResizeTolerance < prevHeight - height < kNodeResizeTolerance
        ) {
            return;
        }

        this.setState((state) =>
            Immutable(state)
                .merge({ nodes: { [nodeId]: { width, height } } }, { deep: true })
                .set('shouldLayout', true)
        );
    }

    /**
     * Layout the graph using the current size dimensions.
     * @private
     */
    _layoutGraph() {
        const { nodes, edges } = this.state;

        layout(
            Object.values(nodes.asMutable({ deep: true })),
            Object.values(edges.asMutable({ deep: true })),
            (
                width: number,
                height: number,
                nodes: Array<Node>,
                edges: Array<Edge>,
            ) => {
                console.log('DagLayout -- _layoutGraph(): ELK callback triggered');
                // Sort elements by ascending z-order so SVGs can be overlaid correctly.
                const elements = [...nodes, ...edges];
                elements.sort(({ z: z1 }, { z: z2 }) => z1 - z2);

                // Save elements into state, and no more layout out until explicitly triggered.
                this.setState((state) =>
                    Immutable(state).merge({
                        nodes: arr2obj(nodes, (node) => [node.id, node]),
                        edges: arr2obj(edges, (edge) => [edge.id, edge]),
                        ordering: elements.map((elem) => ({
                            type: elem.points ? 'edge' : 'node',
                            id: elem.id,
                        })),
                        size: { width, height },
                        shouldLayout: false,
                    }),
                );
            },
        );
    }

    _buildArrowheadMarker(id, color) {
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
     * Renders a DAG with nodes and edges. Nodes can contain `Viewer` objects or other nodes,
     * depending on expansion mode. Edges can have string labels.
     */
    render() {
        const { classes } = this.props;
        const { ordering, size } = this.state;

        console.log('DagLayout -- render(): ordering =', ordering, 'state =', this.state);

        return (
            <div className={classes.frame}>
                <div className={classes.graph}>
                    <svg width={size.width} height={size.height}>
                        <defs>{[this._buildArrowheadMarker('arrow-base', '#FF0000')]}</defs>
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
                                    const { viewerProps, spec } = this.props.nodes[id];
                                    const { x, y, width, height } = this.state.nodes[id];
                                    return (
                                        <DagNode
                                            key={`n${id}`}
                                            viewerProps={viewerProps}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            isExpanded={spec.children.length !== 0}
                                            classes={classes}
                                            onResize={(width, height) =>
                                                this._onNodeResize(id, width, height)
                                            }
                                        />
                                    );
                                }
                                case 'edge': {
                                    const { points } = this.state.edges[id];
                                    return (
                                        <DagEdge
                                            key={`e${id}`}
                                            points={points}
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

    nodeExpanded: {
        fill: '#000000', // TODO: Change this.
        fillOpacity: 0.17,
        strokeWidth: 3,
    },
});

export default withStyles(styles)(DagLayout);
