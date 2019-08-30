import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import _ from 'lodash';

import defaultTheme from '../../theme';

import { DagLayoutFragment, DagNodeId, DagNode, DagEdgeId, DagEdge } from '@vizstack/schema';
import { Viewer, FragmentProps } from '../../Viewer';

import DagNodeComponent from './DagNode';
import DagEdgeComponent from './DagEdge';
import layout, { EdgeIn, NodeIn, EdgeOut, NodeOut } from './layout';
import { arr2obj, obj2arr, obj2obj } from '../../utils/data-utils';
import { ViewerId } from '../../interaction';

/**
 * This pure dumb component renders a directed acyclic graph.
 */
const kNodeInitialWidth = 100000;
const kNodeResizeTolerance = 5;

type DagLayoutProps = FragmentProps<DagLayoutFragment>;

type DagLayoutState = {
    /** Whether the graph needs to be re-layout. This should only be possible after all the node
     * sizes have been populated. */
    shouldLayout: boolean;

    /** Nodes and Edges after populated with size and position information. */
    nodes: {
        [nodeId: string]: any; // DagNodeId -> ...
    };
    edges: {
        [edgeId: string]: any; // DagEdgeId -> ...
    };

    /** Z-axis arrangement of graph elements after layout, sorted by ascending z-order. */
    ordering: Array<{ type: 'node'; id: DagNodeId } | { type: 'edge'; id: DagEdgeId }>;

    /** Size of the graph determined by the layout engine. */
    size: {
        width: number;
        height: number;
    };

    /** Whether each node is expanded. */
    expansion: {
        [nodeId: string]: boolean; // DagNodeId -> ...
    };

    /** Which edges and nodes should be highlighted. */
    // TODO: Make into object, with more than highlight state.
    highlightedEdges: Array<DagEdgeId>;
    highlightedNodes: Array<DagNodeId>;

    /** Which node or edge is selected */
    selectedNodeId: DagNodeId;
};

export type DagLayoutHandle = {
    nodes: Record<string, ViewerId>; // DagNodeId -> ...
    selectedNodeId: DagNodeId;
    doSelectNode: (nodeId: DagNodeId) => void;
    doSelectNeighborNode: (direction: 'north' | 'south' | 'east' | 'west') => void;
};

type DagDidSelectElementEvent = {
    topic: 'Dag.DidSelectNode';
    message: {
        viewerId: ViewerId;
        selectedNodeId: DagNodeId;
    };
};

type DagNodeDidMouseEvent = {
    topic:
        | 'Dag.NodeDidMouseOver'
        | 'Dag.NodeDidMouseOut'
        | 'Dag.NodeDidClick'
        | 'Dag.NodeDidDoubleClick';
    message: {
        viewerId: ViewerId;
        nodeId: DagNodeId;
        nodeExpanded: boolean;
        nodeViewerId: ViewerId;
    };
};

type DagEdgeDidMouseEvent = {
    topic:
        | 'Dag.EdgeDidMouseOver'
        | 'Dag.EdgeDidMouseOut'
        | 'Dag.EdgeDidClick'
        | 'Dag.EdgeDidDoubleClick';
    message: {
        viewerId: ViewerId;
        edgeId: DagEdgeId;
    };
};

type DagNodeDidChangeLightEvent = {
    topic: 'Dag.NodeDidChangeLight';
    message: {
        viewerId: ViewerId;
        nodeId: DagNodeId;
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    };
};

type DagEdgeDidChangeLightEvent = {
    topic: 'Dag.EdgeDidChangeLight';
    message: {
        viewerId: ViewerId;
        edgeId: DagEdgeId;
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    };
};

type DagNodeDidResizeEvent = {
    topic: 'Dag.NodeDidExpand' | 'Dag.NodeDidCollapse';
    message: {
        viewerId: ViewerId;
        nodeId: DagNodeId;
    };
};

export type DagLayoutEvent =
    | DagDidSelectElementEvent
    | DagNodeDidMouseEvent
    | DagEdgeDidMouseEvent
    | DagNodeDidChangeLightEvent
    | DagEdgeDidChangeLightEvent
    | DagNodeDidResizeEvent;

class DagLayout extends React.Component<DagLayoutProps & InternalProps, DagLayoutState> {
    // Initial layout:
    //     constructor(): Initialize state from props.
    //     render(): Render invisibly the unlayouted nodes.
    //     componentDidMount(): Since unlayouted nodes have been mounted, their size population
    //         callbacks have be called. Once all sizes are populated, the layout engine is called
    //         to perform the layout, which will `forceUpdate().
    // After initial layout:
    //     When existing dimensions changed, layout again.
    //     When expansion state changes (revealing new nodes), render invisibly the unlayouted
    //         nodes then perform a layout.

    constructor(props: DagLayoutProps & InternalProps) {
        super(props);
        this.state = {
            shouldLayout: false, // False so no layout until sizes all populated.
            nodes: obj2obj(this.props.nodes, (nodeId, node) => [
                nodeId,
                {
                    id: nodeId,
                    children: node.children,
                    flowDirection: node.flowDirection,
                    alignChildren: node.alignChildren,
                    ports: node.ports,
                    width: kNodeInitialWidth, // Allow space for `Viewer` to be rendered.
                    height: undefined, // Needs to be populated.
                    x: 0,
                    y: 0,
                    z: 0, // Default values.
                },
            ]),
            edges: obj2obj(this.props.edges, (edgeId, edge) => [
                edgeId,
                {
                    id: edgeId,
                    startId: edge.startId,
                    endId: edge.endId,
                    startPort: edge.startPort,
                    endPort: edge.endPort,
                },
            ]),
            size: {
                width: 0,
                height: 0,
            },
            ordering: [],
            expansion: obj2obj(this.props.nodes, (nodeId, node) => [
                nodeId,
                node.isExpanded === true,
            ]),
            highlightedNodes: [],
            highlightedEdges: [],
            selectedNodeId: `${Object.keys(this.props.nodes)[0]}`,
        };
        this._getChildViewerCallback.bind(this);
    }

    private _childViewers: Record<string, Viewer> = {}; // DagNodeId -> Viewer
    private _childViewerCallbacks: Record<string, (viewer: Viewer) => void> = {};

    private _getChildViewerCallback(nodeId: DagNodeId) {
        const key = `${nodeId}`;
        if (!this._childViewerCallbacks[key]) {
            this._childViewerCallbacks[key] = (viewer) => (this._childViewers[nodeId] = viewer);
        }
        return this._childViewerCallbacks[key];
    }

    public getHandle(): DagLayoutHandle {
        return {
            nodes: {}, // this._childViewers.mapValue((viewer) => viewer.viewerId)
            selectedNodeId: 'herro',
            doSelectNode: (nodeId) => {},
            doSelectNeighborNode: (direction) => {},
            // doSetLightNode: (light) => this.setState({ }),
            // doSetLightEdge: (light) => this.setState({ }),
            // doExpandNode: (nodeId) => null,
        };
    }

    componentDidMount() {
        // At this point, the unlayouted nodes.
        console.debug('DagLayout -- componentDidMount(): mounted');

        // // Find leaves
        // Object.entries(this.props.nodes)
        //     .filter(([, model]) => model.isExpanded === false)
        //     .forEach(([nodeId]) => {
        //         const { nodes, edges } = this._collapseNode(
        //             initialState.nodes,
        //             initialState.edges,
        //             nodeId,
        //         );
        //         initialState.nodes = nodes;
        //         initialState.edges = edges;
        //     });

        // initialState.ordering = [
        //     ...obj2arr(initialState.nodes, (k) => ({ type: 'node', id: k })),
        //     ...obj2arr(initialState.edges, (k) => ({ type: 'edge', id: k })),
        // ];
        // this.setState(initialState);

        // // Force render and mount of the not layouted components so they get their sizes.
        // this.forceUpdate();
    }

    shouldComponentUpdate(nextProps: any, nextState: DagLayoutState) {
        // Prevent component from re-rendering each time a dimension is populated/updated unless all
        // dimensions are populated.
        // const shouldUpdate = Object.values(nextState.nodes)
        //     .filter((node: NodeOut) => node.children.length === 0) // Only keep leaves.
        //     .every((node) => node.height);
        // console.log('DagLayout -- shouldComponentUpdate(): ', shouldUpdate);
        // return shouldUpdate;
        return true;
    }

    componentDidUpdate(prevProps: any, prevState: DagLayoutState) {
        // Performing the layout will change the state, so we wrap it in a condition to prevent
        // infinite looping.
        console.log('DagLayout -- componentDidUpdate()');
        const { viewerId, emit } = this.props.interactions;
        const { selectedNodeId } = this.state;
        if (selectedNodeId !== prevState.selectedNodeId) {
            emit<DagLayoutEvent>('Dag.DidSelectNode', { viewerId, selectedNodeId });
        }
    }

    // /**
    //  * Returns node and edge objects which represent the graph after a given node has been expanded.
    //  *
    //  * Does not update the component's state.
    //  * @param prevNodes
    //  * @param prevEdges
    //  * @param nodeId
    //  * @param nodeExpansionStates
    //  * @private
    //  */
    // _expandNode(
    //     prevNodes: Immutable<{ [DagNodeId]: NodeOut }>,
    //     prevEdges: ImmutableType<{ [DagEdgeId]: EdgeOut }>,
    //     nodeId: DagNodeId,
    //     nodeExpansionStates: { [DagNodeId]: boolean },
    // ): {
    //     nodes: { [DagNodeId]: NodeOut },
    //     edges: { [DagEdgeId]: EdgeOut },
    // } {
    //     // If node has no possible children
    //     if (this.props.nodes[nodeId].children.length === 0)
    //         return { nodes: prevNodes, edges: prevEdges };
    //     // If node is already expanded
    //     if (prevNodes[nodeId].children.length !== 0) return { nodes: prevNodes, edges: prevEdges };
    //     const nodes = Immutable.asMutable(prevNodes, { deep: true });
    //     let children = [nodeId];
    //     while (children.length > 0) {
    //         const childId = children.pop();
    //         const childModel = this.props.nodes[childId];
    //         nodes[childId] = {
    //             id: childId,
    //             children:
    //                 childId === nodeId || nodeExpansionStates[childId] ? childModel.children : [],
    //             flowDirection: childModel.flowDirection,
    //             alignChildren: childModel.alignChildren,
    //             ports: childModel.ports,
    //             width: kNodeInitialWidth, // Allow space for `Viewer` to be rendered.
    //             height: undefined, // Needs to be populated.
    //         };
    //         if (childId === nodeId || nodeExpansionStates[childId]) {
    //             children.push(...Immutable.asMutable(childModel.children));
    //         }
    //     }
    //     return { nodes, edges: this._rerouteEdges(nodes) };
    // }

    // /**
    //  * Returns node and edge objects which represent the graph after a given node has been collapsed.
    //  *
    //  * Does not update the component's state.
    //  * @param prevNodes
    //  * @param prevEdges
    //  * @param nodeId
    //  * @private
    //  */
    // _collapseNode(
    //     prevNodes: ImmutableType<{ [DagNodeId]: NodeOut }>,
    //     prevEdges: ImmutableType<{ [DagEdgeId]: EdgeOut }>,
    //     nodeId: DagNodeId,
    // ): {
    //     nodes: { [DagNodeId]: NodeOut },
    //     edges: { [DagEdgeId]: EdgeOut },
    // } {
    //     let children: Array<DagNodeId> = [...prevNodes[nodeId].children];
    //     const nodes = Immutable.asMutable(prevNodes, { deep: true });
    //     nodes[nodeId].children = [];
    //     while (children.length > 0) {
    //         const childId = children.pop();
    //         delete nodes[childId];
    //         children.push(...prevNodes[childId].children);
    //     }
    //     nodes[nodeId].width = kNodeInitialWidth;
    //     nodes[nodeId].height = undefined;
    //     return { nodes, edges: this._rerouteEdges(nodes) };
    // }

    // /**
    //  * Returns the edges of the graph which exist when a given set of nodes is present.
    //  *
    //  * If an edge in `this.props.edges` would connect to a node which does not exist in `nodes`, it
    //  * will instead connect to that node's most recent present ancestor. Edges which would self-loop
    //  * after being rerouted are not returned.
    //  * @param nodes
    //  * @private
    //  */
    // _rerouteEdges(nodes: ImmutableType<{ [DagNodeId]: NodeOut }>): { [DagEdgeId]: EdgeOut } {
    //     const edges = {};
    //     ((Object.entries(this.props.edges): any): Array<[DagEdgeId, DagEdge]>).forEach(
    //         ([edgeId, edge]) => {
    //             let { startId, endId, startPort, endPort } = edge;
    //             while (!(startId in nodes)) {
    //                 startId = Object.keys(this.props.nodes).find((nodeId) =>
    //                     this.props.nodes[nodeId].children.includes(startId),
    //                 );
    //                 startPort = undefined;
    //             }
    //             while (!(endId in nodes)) {
    //                 endId = Object.keys(this.props.nodes).find((nodeId) =>
    //                     this.props.nodes[nodeId].children.includes(endId),
    //                 );
    //                 endPort = undefined;
    //             }
    //             if (startId !== endId) {
    //                 edges[edgeId] = {
    //                     id: edgeId,
    //                     startId,
    //                     startPort,
    //                     endId,
    //                     endPort,
    //                 };
    //             }
    //         },
    //     );
    //     return edges;
    // }

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
            Math.abs(prevWidth - width) < kNodeResizeTolerance &&
            Math.abs(prevHeight - height) < kNodeResizeTolerance
        ) {
            return;
        }

        this.setState((state) =>
            _.merge({}, state, {
                shouldLayout: true,
                nodes: {
                    [nodeId]: { width, height },
                },
            }),
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
            Object.values(nodes),
            Object.values(edges),
            (width: number, height: number, nodes: NodeOut[], edges: EdgeOut[]) => {
                console.log('DagLayout -- _layoutGraph(): ELK callback triggered');
                // Sort elements by ascending z-order so SVGs can be overlaid correctly.
                const elements = [...nodes, ...edges];
                elements.sort(({ z: z1 }, { z: z2 }) => z1 - z2);

                // Save elements into state, and no more layout out until explicitly triggered.
                this.setState((state) => ({
                    nodes: arr2obj(nodes, (node) => [node.id, node]),
                    edges: arr2obj(edges, (edge) => [edge.id, edge]),
                    ordering: elements.map((elem) => ({
                        type: 'points' in elem ? 'edge' : 'node',
                        id: elem.id,
                    })),
                    size: { width, height },
                    shouldLayout: false,
                }));
            },
            { alignments, flowDirection, alignChildren },
        );
    }

    /**
     * Renders a DAG with nodes and edges. Nodes can contain `Viewer` objects or other nodes,
     * depending on expansion mode. Edges can have string labels.
     */
    render() {
        const { classes, passdown, interactions, light } = this.props;
        const { mouseHandlers, viewerId, emit } = interactions;
        const { ordering, size } = this.state;

        console.log('DagLayout -- render(): ordering =', ordering, 'state =', this.state);

        function buildArrowMarker(id: string, className: string) {
            return (
                <marker
                    key={id}
                    id={id}
                    viewBox='0 0 10 10'
                    refX='6'
                    refY='5'
                    markerUnits='strokeWidth'
                    markerWidth='4'
                    markerHeight='4'
                    orient='auto'
                >
                    <path d='M 0 0 L 10 5 L 0 10 L 4 5 z' className={className} />
                </marker>
            );
        }

        function buildNodeMouseHandlers(nodeId: DagNodeId) {
            const message = {
                viewerId,
                nodeId,
                nodeExpanded: true, // TODO
                nodeViewerId: 'herro', // TODO
            };
            return {
                onClick: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagNodeDidMouseEvent>('Dag.NodeDidClick', message);
                },
                onDoubleClick: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagNodeDidMouseEvent>('Dag.NodeDidDoubleClick', message);
                },
                onMouseOver: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagNodeDidMouseEvent>('Dag.NodeDidMouseOver', message);
                },
                onMouseOut: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagNodeDidMouseEvent>('Dag.NodeDidMouseOut', message);
                },
            };
        }

        function buildEdgeMouseHandlers(edgeId: DagEdgeId) {
            const message = {
                viewerId,
                edgeId,
            };
            return {
                onClick: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagEdgeDidMouseEvent>('Dag.EdgeDidClick', message);
                },
                onDoubleClick: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagEdgeDidMouseEvent>('Dag.EdgeDidDoubleClick', message);
                },
                onMouseOver: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagEdgeDidMouseEvent>('Dag.EdgeDidMouseOver', message);
                },
                onMouseOut: (e: React.SyntheticEvent) => {
                    e.stopPropagation();
                    emit<DagEdgeDidMouseEvent>('Dag.EdgeDidMouseOut', message);
                },
            };
        }

        return (
            <div className={classes.frame} {...mouseHandlers}>
                <div className={classes.graph}>
                    <svg width={size.width} height={size.height}>
                        <defs>
                            {[
                                buildArrowMarker('arrow-normal', classes.arrowNormal),
                                buildArrowMarker('arrow-highlight', classes.arrowHighlight),
                                buildArrowMarker('arrow-lowlight', classes.arrowLowlight),
                                buildArrowMarker('arrow-selected', classes.arrowSelected),
                            ]}
                        </defs>
                        <rect
                            x={0}
                            y={0}
                            width={size.width}
                            height={size.height}
                            fill='transparent'
                            onClick={undefined}
                        />
                        {ordering.map((elem) => {
                            switch (elem.type) {
                                case 'node': {
                                    const { id } = elem;
                                    const {
                                        fragmentId,
                                        isInteractive,
                                        isVisible,
                                    } = this.props.nodes[id];
                                    const { children, x, y, width, height } = this.state.nodes[id];
                                    return (
                                        <DagNodeComponent
                                            key={`n-${id}`}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            isExpanded={children.length !== 0}
                                            isInteractive={
                                                isInteractive !== false &&
                                                this.props.nodes[id].children.length !== 0
                                            }
                                            isVisible={isVisible}
                                            isHighlighted={this.state.highlightedNodes.includes(id)}
                                            onResize={(width: number, height: number) =>
                                                this._onNodeResize(id, width, height)
                                            }
                                            mouseHandlers={buildNodeMouseHandlers(id)}
                                        >
                                            <Viewer
                                                ref={this._getChildViewerCallback(id)}
                                                {...passdown}
                                                fragmentId={fragmentId}
                                            />
                                        </DagNodeComponent>
                                    );
                                }
                                case 'edge': {
                                    const { id } = elem;
                                    const { points } = this.state.edges[id];
                                    return (
                                        <DagEdgeComponent
                                            key={`e-${id}`}
                                            points={points}
                                            color={
                                                this.state.highlightedEdges.includes(id)
                                                    ? 'highlight'
                                                    : 'normal'
                                            }
                                            mouseHandlers={buildEdgeMouseHandlers(id)}
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

const styles = (theme: Theme) =>
    createStyles({
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
        arrowNormal: {
            fill: theme.color.blue.base,
        },
        arrowHighlight: {
            fill: theme.color.blue.l1,
        },
        arrowLowlight: {
            fill: theme.color.gray.d1,
        },
        arrowSelected: {
            fill: theme.color.blue.d2,
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(DagLayout) as React.ComponentClass<
    DagLayoutProps
>;
