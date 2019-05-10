// @flow
import * as React from 'react';
import classNames from 'classnames';
import Immutable from 'seamless-immutable';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import { line, curveBasis, curveLinear } from 'd3';
import Measure from 'react-measure';

import type { DagNodeId, DagNodeModel, DagEdgeId, DagEdgeModel, ViewId } from '../../schema';
import Viewer from '../../Viewer';
import type { ViewerToViewerProps} from '../../Viewer';

import layout from './layout';
import type { EdgeIn, NodeIn, EdgeOut, NodeOut } from './layout';
import { arr2obj, obj2arr, obj2obj } from '../../../utils/data-utils';
import type {Event, MouseEventProps, ReadOnlyViewerHandle } from "../../interaction";
import { useMouseInteractions } from '../../interaction';


// =================================================================================================

/**
 * This pure dumb component renders a graph node as an SVG component that contains a Viewer.
 */
type DagNodeProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** React components within opening & closing tags. */
    children?: React.Node,

    /** Position and size properties. */
    x: number,
    y: number,
    width: number,
    height: number,

    /** Expansion state. */
    isExpanded?: boolean,
    isInteractive?: boolean,
    isVisible?: boolean,

    /** Callback on component resize. */
    onResize: (number, number) => void,
};
class DagNode extends React.PureComponent<DagNodeProps> {
    /** Prop default values. */
    static defaultProps = {
        isExpanded: true,
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
            isExpanded,
            onResize,
        } = this.props;

        return (
            <g>
                {isExpanded ? (
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        className={
                            isVisible === false ? classes.nodeInvisible : classes.nodeExpanded
                        }
                    />
                ) : (
                    <foreignObject
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        className={classes.node}
                    >
                        <Measure
                            bounds
                            onResize={(contentRect) =>
                                onResize(contentRect.bounds.width, contentRect.bounds.height)
                            }
                        >
                            {({ measureRef }) => (
                                <div ref={measureRef} style={{ display: 'inline-block' }}>
                                    {children}
                                </div>
                            )}
                        </Measure>
                    </foreignObject>
                )}
            </g>
        );
    }
}


// =================================================================================================

/**
 * This pure dumb component renders a graph edge as an SVG component that responds to mouse events
 * based on prop values.
 */
type DagEdgeProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** Curve point coordinates. */
    points: { x: number, y: number }[],

    shape?: 'curve' | 'line',

    color?: 'primary' | 'secondary',

    id: number,
    baseColor?: string,
    selectedColor?: string,
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
};

class DagEdge extends React.PureComponent<DagEdgeProps> {
    static defaultProps = {
        baseColor: '#FF0000',
        selectedColor: '#00FF00',
        shape: 'line',
        color: 'primary'
    };

    render() {
        const {
            classes,
            points,
            shape,
            baseColor,
            selectedColor,
            onClick,
            onDoubleClick,
            onMouseEnter,
            onMouseLeave,
            id,
            isSelected,
            isBackground,
            isOtherActive,
            isHovered,
            label,
        } = this.props;

        if (!points || points.length === 0) {
            return null;
        }


        let path = null;
        switch (shape) {
            case 'curve':
                path = line().curve(curveBasis)(points.map((p) => [p.x, p.y]));
                break;
            case 'line':
            default:
                path = line().curve(curveLinear)(points.map((p) => [p.x, p.y]));
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

// =================================================================================================

/**
 * This pure dumb component renders a directed acyclic graph.
 */
const kNodeInitialWidth = 100000;
const kNodeResizeTolerance = 5;

type DagLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    /** Property inherited from the `useMouseInteractions()` HOC. Publish mouse interaction-related
     * events when spread onto an HTML element. */
    mouseProps: MouseEventProps,

    /** The handle to the `Viewer` component which is rendering this view. Used when publishing
     * interaction messages. */
    viewerHandle: ReadOnlyViewerHandle,

    /** Events published to this view's `InteractionManager` which should be consumed by this
     * view. The message of each event in this array includes a "viewerId" field which is equal to
     * `props.viewerHandle.viewerId`. Each event in the array should be consumed only once. */
    lastEvents: Array<DagLayoutSub>,

    /** A function which publishes an event with given name and message to this view's
     * `InteractionManager`. */
    publishEvent: (event: DagLayoutPub) => void,

    /** Contains properties which should be spread onto any `Viewer` components rendered by this
     * layout. */
    viewerToViewerProps: ViewerToViewerProps,

    nodes: {|
        [DagNodeId]: DagNodeModel,
    |},
    edges: {|
        [DagEdgeId]: DagEdgeModel,
    |},
    alignments?: Array<Array<DagNodeId>>,
    flowDirection?: 'north' | 'south' | 'east' | 'west',
    alignChildren?: boolean,
};

type DagLayoutState = {
    /** Whether the graph needs to be re-layout. */
    shouldLayout: boolean,

    /** Graph element specifications, but now with size and position information. */
    nodes: {|
        [DagNodeId]: NodeOut,
    |},
    edges: {|
        [DagEdgeId]: EdgeOut,
    |},

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
};

type DagLayoutPub = {};
type DagLayoutSub = {};

type DagLayoutDefaultProps = {};

class DagLayout extends React.Component<DagLayoutProps, DagLayoutState> {
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

    static defaultProps: DagLayoutDefaultProps = {};

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
                shouldLayout: false, // False so no layout until sizes all populated.
                nodes: obj2obj(this.props.nodes, (k, model) => [
                    k,
                    {
                        id: k,
                        children: model.children,
                        flowDirection: model.flowDirection,
                        alignChildren: model.alignChildren,
                        ports: model.ports,
                        width: kNodeInitialWidth, // Allow space for `Viewer` to be rendered.
                        height: undefined, // Needs to be populated.
                    },
                ]),
                edges: obj2obj(this.props.edges, (k, model) => [
                    k,
                    {
                        id: k,
                        startId: model.startId,
                        endId: model.endId,
                        startPort: model.startPort,
                        endPort: model.endPort,
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
            .filter((node) => node.children.length === 0) // Only keep leaves.
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
        console.warn(`DagLayout -- _onNodeResize(${nodeId}, ${width}, ${height})`);

        // Do not react to resizes beyond some tolerance, e.g. due to platform instabilities or
        // trivial appearance changes.
        const prevWidth = this.state.nodes[nodeId].width;
        const prevHeight = this.state.nodes[nodeId].height;
        if (
            prevWidth !== undefined &&
            prevHeight !== undefined &&
            Math.abs(prevWidth - width) < kNodeResizeTolerance &&
            Math.abs(prevHeight - height) < kNodeResizeTolerance
        ) {
            return;
        }

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
        const { nodes, edges } = this.state;
        const { alignments, flowDirection, alignChildren } = this.props;

        layout(
            Object.values(nodes.asMutable({ deep: true })),
            Object.values(edges.asMutable({ deep: true })),
            (width: number, height: number, nodes: NodeOut[], edges: EdgeOut[]) => {
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
            { alignments, flowDirection, alignChildren },
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
        const { classes, viewerToViewerProps } = this.props;
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
                                    const { viewId, isExpanded, isInteractive, isVisible, children } = this.props.nodes[id];
                                    const { x, y, width, height } = this.state.nodes[id];
                                    return (
                                        <DagNode
                                            key={`n${id}`}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            isExpanded={isExpanded !== false && children.length !== 0}
                                            isInteractive={isInteractive}
                                            isVisible={isVisible}
                                            classes={classes}
                                            onResize={(width, height) =>
                                                this._onNodeResize(id, width, height)
                                            }
                                        >
                                            <Viewer {...viewerToViewerProps} viewId={viewId} />
                                        </DagNode>
                                    );
                                }
                                case 'edge': {
                                    const { points } = this.state.edges[id];
                                    return (
                                        <DagEdge key={`e${id}`} points={points} classes={classes} />
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

    nodeInvisible: {
        fill: '#FFFFFF', // TODO: Change this.
        fillOpacity: 0.1,
    },

    nodeExpanded: {
        fill: '#000000', // TODO: Change this.
        fillOpacity: 0.1,
    },
});

export default withStyles(styles)(useMouseInteractions<React.Config<DagLayoutProps, DagLayoutDefaultProps>>(DagLayout));
