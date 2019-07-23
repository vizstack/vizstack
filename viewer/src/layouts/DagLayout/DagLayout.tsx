import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import { DagLayoutFragment, DagNodeId, DagNode, DagEdgeId, DagEdge } from '@vizstack/schema';
import { Viewer,FragmentProps } from '../../Viewer';

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
    /** Whether the graph needs to be re-layout. */
    shouldLayout: boolean,

    /** Graph element specifications, but now with size and position information. */
    // Making these objects exact (using | operator) raises an error when initialized empty.
    nodes: {
        [nodeId: string]: NodeOut,  // DagNodeId
    },
    edges: {
        [edgeId: string]: EdgeOut,  // DagEdgeId
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

    /** Whether each node is expanded. */
    expandedNodes: {
        [nodeId: string]: boolean,  // DagNodeId
    },
    
    /** Which edges and nodes should be highlighted. */
    // TODO: Make into object, with more than highlight state.
    highlightedEdges: Array<DagEdgeId>,
    highlightedNodes: Array<DagNodeId>,
};

export type DagLayoutHandle = {
    nodes: Record<string, ViewerId>,  // DagNodeId
    selectedNodeId: DagNodeId,
    doSelectNode: (nodeId: DagNodeId) => void,
    doSelectNeighborNode: (direction: 'north' | 'south' | 'east' | 'west') => void,
};

export type DagNodeMouseEvent = {
    topic:
        | 'Dag.NodeMouseOver'
        | 'Dag.NodeMouseOut'
        | 'Dag.NodeClick'
        | 'Dag.NodeDoubleClick',
    message: {
        viewerId: ViewerId,
        nodeId: DagNodeId,
        nodeExpanded: boolean,
        nodeViewerId: ViewerId,
    },
};

export type DagEdgeMouseEvent = {
    topic:
        | 'Dag.EdgeMouseOver'
        | 'Dag.EdgeMouseOut'
        | 'Dag.EdgeClick'
        | 'Dag.EdgeDoubleClick',
    message: {
        viewerId: ViewerId,
        edgeId: DagEdgeId,
    },
};


export type DagNodeDidHighlightToggleEvent = {
    topic: 'Dag.NodeDidHighlight' | 'Dag.NodeDidUnhighlight',
    message: {
        viewerId: ViewerId,
        nodeId: DagNodeId,
    },
};

export type DagEdgeDidHighlightToggleEvent = {
    topic: 'Dag.EdgeDidHighlight' | 'Dag.EdgeDidUnhighlight',
    message: {
        viewerId: ViewerId,
        edgeId: DagEdgeId,
    },
};

export type DagNodeDidExpansionEvent = {
    topic: 'Dag.NodeDidExpand' | 'Dag.NodeDidCollapse',
    message: {
        viewerId: ViewerId,
        nodeId: DagNodeId,
    },
};

type DagLayoutEvent =
    | DagNodeMouseEvent
    | DagEdgeMouseEvent
    | DagNodeDidHighlightToggleEvent
    | DagEdgeDidHighlightToggleEvent
    | DagNodeDidExpansionEvent;

class DagLayout extends React.Component<DagLayoutProps & InternalProps, DagLayoutState> {
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

    constructor(props: DagLayoutProps & InternalProps) {
        super(props);
        this.state = {
            shouldLayout: false,
            nodes: {},
            edges: {},
            ordering: [],
            size: {
                width: 0,
                height: 0,
            },
            expandedNodes: {},
            highlightedEdges: [],
            highlightedNodes: [],
        };
    }

    private _childViewers: Record<string, Viewer> = {};

    private _registerViewer(viewer: Viewer, nodeId: DagNodeId) {
        this._childViewers[nodeId] = viewer;
    }

    public getHandle(): DagLayoutHandle {
        return {
            nodes: {},  // this._childViewers.mapValue((viewer) => viewer.viewerId)
            selectedNodeId: "herro",            
            doSelectNode: (nodeId) => {
                
            },
            doSelectNeighborNode: (direction) => {

            },
        };
    }

    componentDidMount() {
        // At this point, a render() has been called but nothing was rendered since state is
        // initialized to be empty.
        console.debug('DagLayout -- componentDidMount(): mounted');

        const initialState: DagLayoutState = {
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
            size: {
                width: 0,
                height: 0,
            },
            ordering: [],
            expandedNodes: obj2obj(this.props.nodes, (k, model) => [
                k,
                model.isExpanded !== false,
            ]),
            highlightedNodes: [],
            highlightedEdges: [],
        };

        ((Object.entries(this.props.nodes) as any): Array<[DagNodeId, DagNode]>)
            .filter(([, model]) => model.isExpanded === false)
            .forEach(([nodeId]) => {
                const { nodes, edges } = this._collapseNode(
                    initialState.nodes,
                    initialState.edges,
                    nodeId,
                );
                initialState.nodes = nodes;
                initialState.edges = edges;
            });

        initialState.ordering = [
            ...obj2arr(initialState.nodes, (k) => ({ type: 'node', id: k })),
            ...obj2arr(initialState.edges, (k) => ({ type: 'edge', id: k })),
        ];
        this.setState(initialState);

        // Force render and mount of the not layouted components so they get their sizes.
        this.forceUpdate();
    }

    shouldComponentUpdate(nextProps: any, nextState: DagLayoutState) {
        // Prevent component from re-rendering each time a dimension is populated/updated unless all
        // dimensions are populated.
        const shouldUpdate = Object.values(nextState.nodes)
            .filter((node: NodeOut) => node.children.length === 0) // Only keep leaves.
            .every((node) => node.height);
        console.log('DagLayout -- shouldComponentUpdate(): ', shouldUpdate);
        return shouldUpdate;
    }

    componentDidUpdate(prevProps: DagLayoutProps) {
        // Performing the layout will change the state, so we wrap it in a condition to prevent
        // infinite looping.
        console.log('DagLayout -- componentDidUpdate()');
        const { lastEvents } = this.props;
        lastEvents.forEach((event: DagLayoutSub, i: number) => {
            if (event === prevProps.lastEvents[i]) return;
            if (event.eventName === 'dagEdgeHighlight') {
                const e = (event: DagEdgeHighlightEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => ({
                    ...state,
                    highlightedEdges: state.highlightedEdges.concat([e.message.edgeId]),
                }));
            }
            if (event.eventName === 'dagEdgeUnhighlight') {
                const e = (event: DagEdgeHighlightEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => ({
                    ...state,
                    highlightedEdges: state.highlightedEdges.filter(
                        (edgeId) => edgeId !== e.message.edgeId,
                    ),
                }));
            }
            if (event.eventName === 'dagNodeHighlight') {
                const e = (event: DagNodeHighlightEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => ({
                    ...state,
                    highlightedNodes: state.highlightedNodes.concat([e.message.nodeId]),
                }));
            }
            if (event.eventName === 'dagNodeUnhighlight') {
                const e = (event: DagNodeHighlightEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => ({
                    ...state,
                    highlightedNodes: state.highlightedNodes.filter(
                        (edgeId) => edgeId !== e.message.nodeId,
                    ),
                }));
            }
            if (event.eventName === 'dagNodeExpand') {
                const e = (event: DagNodeExpansionEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => {
                    const { nodes, edges } = this._expandNode(
                        state.nodes,
                        state.edges,
                        e.message.nodeId,
                        state.expandedNodes,
                    );
                    const ordering = [
                        ...obj2arr(nodes, (k) => ({ type: 'node', id: k })),
                        ...obj2arr(edges, (k) => ({ type: 'edge', id: k })),
                    ];
                    return Immutable(state).merge({
                        nodes,
                        edges,
                        ordering,
                        shouldLayout: false,
                        nodeExpansionStates: {
                            ...state.expandedNodes,
                            [e.message.nodeId]: true,
                        },
                    });
                });
                this.forceUpdate();
            }
            if (event.eventName === 'dagNodeCollapse') {
                const e = (event: DagNodeExpansionEvent); // Flow won't dispatch on the correct type otherwise
                this.setState((state) => {
                    const { nodes, edges } = this._collapseNode(
                        state.nodes,
                        state.edges,
                        e.message.nodeId,
                    );
                    const ordering = [
                        ...obj2arr(nodes, (k) => ({ type: 'node', id: k })),
                        ...obj2arr(edges, (k) => ({ type: 'edge', id: k })),
                    ];
                    return Immutable(state).merge({
                        nodes,
                        edges,
                        ordering,
                        shouldLayout: false,
                        nodeExpansionStates: {
                            ...state.expandedNodes,
                            [e.message.nodeId]: false,
                        },
                    });
                });
                this.forceUpdate();
            }
        });
        if (this.state.shouldLayout) {
            console.debug('DagLayout -- componentDidUpdate(): shouldLayout = true so will layout');
            this._layoutGraph();
        }
    }

    /**
     * Returns node and edge objects which represent the graph after a given node has been expanded.
     *
     * Does not update the component's state.
     * @param prevNodes
     * @param prevEdges
     * @param nodeId
     * @param nodeExpansionStates
     * @private
     */
    _expandNode(
        prevNodes: Immutable<{ [DagNodeId]: NodeOut }>,
        prevEdges: ImmutableType<{ [DagEdgeId]: EdgeOut }>,
        nodeId: DagNodeId,
        nodeExpansionStates: { [DagNodeId]: boolean },
    ): {
        nodes: { [DagNodeId]: NodeOut },
        edges: { [DagEdgeId]: EdgeOut },
    } {
        // If node has no possible children
        if (this.props.nodes[nodeId].children.length === 0)
            return { nodes: prevNodes, edges: prevEdges };
        // If node is already expanded
        if (prevNodes[nodeId].children.length !== 0) return { nodes: prevNodes, edges: prevEdges };
        const nodes = Immutable.asMutable(prevNodes, { deep: true });
        let children = [nodeId];
        while (children.length > 0) {
            const childId = children.pop();
            const childModel = this.props.nodes[childId];
            nodes[childId] = {
                id: childId,
                children:
                    childId === nodeId || nodeExpansionStates[childId] ? childModel.children : [],
                flowDirection: childModel.flowDirection,
                alignChildren: childModel.alignChildren,
                ports: childModel.ports,
                width: kNodeInitialWidth, // Allow space for `Viewer` to be rendered.
                height: undefined, // Needs to be populated.
            };
            if (childId === nodeId || nodeExpansionStates[childId]) {
                children.push(...Immutable.asMutable(childModel.children));
            }
        }
        return { nodes, edges: this._rerouteEdges(nodes) };
    }

    /**
     * Returns node and edge objects which represent the graph after a given node has been collapsed.
     *
     * Does not update the component's state.
     * @param prevNodes
     * @param prevEdges
     * @param nodeId
     * @private
     */
    _collapseNode(
        prevNodes: ImmutableType<{ [DagNodeId]: NodeOut }>,
        prevEdges: ImmutableType<{ [DagEdgeId]: EdgeOut }>,
        nodeId: DagNodeId,
    ): {
        nodes: { [DagNodeId]: NodeOut },
        edges: { [DagEdgeId]: EdgeOut },
    } {
        let children: Array<DagNodeId> = [...prevNodes[nodeId].children];
        const nodes = Immutable.asMutable(prevNodes, { deep: true });
        nodes[nodeId].children = [];
        while (children.length > 0) {
            const childId = children.pop();
            delete nodes[childId];
            children.push(...prevNodes[childId].children);
        }
        nodes[nodeId].width = kNodeInitialWidth;
        nodes[nodeId].height = undefined;
        return { nodes, edges: this._rerouteEdges(nodes) };
    }

    /**
     * Returns the edges of the graph which exist when a given set of nodes is present.
     *
     * If an edge in `this.props.edges` would connect to a node which does not exist in `nodes`, it
     * will instead connect to that node's most recent present ancestor. Edges which would self-loop
     * after being rerouted are not returned.
     * @param nodes
     * @private
     */
    _rerouteEdges(nodes: ImmutableType<{ [DagNodeId]: NodeOut }>): { [DagEdgeId]: EdgeOut } {
        const edges = {};
        ((Object.entries(this.props.edges): any): Array<[DagEdgeId, DagEdge]>).forEach(
            ([edgeId, edge]) => {
                let { startId, endId, startPort, endPort } = edge;
                while (!(startId in nodes)) {
                    startId = Object.keys(this.props.nodes).find((nodeId) =>
                        this.props.nodes[nodeId].children.includes(startId),
                    );
                    startPort = undefined;
                }
                while (!(endId in nodes)) {
                    endId = Object.keys(this.props.nodes).find((nodeId) =>
                        this.props.nodes[nodeId].children.includes(endId),
                    );
                    endPort = undefined;
                }
                if (startId !== endId) {
                    edges[edgeId] = {
                        id: edgeId,
                        startId,
                        startPort,
                        endId,
                        endPort,
                    };
                }
            },
        );
        return edges;
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
                        type: elem.points ? 'edge' : 'node',
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
        const { mouseHandlers, emit } = interactions;
        const { ordering, size } = this.state;

        // const nodeMouseHandlers = (nodeId: DagNodeId) => {
        //     const nodeExpanded = this.state.nodes[nodeId].children.length !== 0;
        //     return {
        //         onClick: () =>
        //             emit({
        //                 topic: 'onDagNodeClick',
        //                 message: { nodeId, publisher: viewerHandle, nodeExpanded },
        //             }),
        //         onDoubleClick: () =>
        //             emit({
        //                 topic: 'onDagNodeDoubleClick',
        //                 message: { nodeId, publisher: viewerHandle, nodeExpanded },
        //             }),
        //         onMouseOver: () =>
        //             emit({
        //                 topic: 'onDagNodeMouseOver',
        //                 message: { nodeId, publisher: viewerHandle, nodeExpanded },
        //             }),
        //         onMouseOut: () =>
        //             emit({
        //                 topic: 'onDagNodeMouseOut',
        //                 message: { nodeId, publisher: viewerHandle, nodeExpanded },
        //             }),
        //     };
        // };

        // const edgeMouseHandlers = (edgeId: DagEdgeId) => ({
        //     onClick: () =>
        //         publishEvent({
        //             eventName: 'onDagEdgeClick',
        //             message: { edgeId, publisher: viewerHandle },
        //         }),
        //     onDoubleClick: () =>
        //         publishEvent({
        //             eventName: 'onDagEdgeDoubleClick',
        //             message: { edgeId, publisher: viewerHandle },
        //         }),
        //     onMouseOver: () =>
        //         publishEvent({
        //             eventName: 'onDagEdgeMouseOver',
        //             message: { edgeId, publisher: viewerHandle },
        //         }),
        //     onMouseOut: () =>
        //         publishEvent({
        //             eventName: 'onDagEdgeMouseOut',
        //             message: { edgeId, publisher: viewerHandle },
        //         }),
        // });

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
                        {ordering.map(({ type, id }) => {
                            switch (type) {
                                case 'node': {
                                    const {
                                        fragmentId,
                                        isInteractive,
                                        isVisible,
                                    } = this.props.nodes[id];
                                    const { children, x, y, width, height } = this.state.nodes[id];
                                    return (
                                        <DagNode
                                            key={`n${id}`}
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
                                            highlighted={this.state.highlightedNodes.includes(id)}
                                            mouseProps={nodeMouseHandlers(id)}
                                            onResize={(width: number, height: number) =>
                                                this._onNodeResize(id, width, height)
                                            }
                                        >
                                            <Viewer
                                                {...viewerToViewerProps}
                                                fragmentId={fragmentId}
                                            />
                                        </DagNode>
                                    );
                                }
                                case 'edge': {
                                    const { points } = this.state.edges[id];
                                    return (
                                        <DagEdge
                                            key={`e${id}`}
                                            points={points}
                                            color={
                                                this.state.highlightedEdges.includes(id)
                                                    ? 'highlight'
                                                    : 'normal'
                                            }
                                            mouseProps={edgeMouseHandlers(id)}
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

const styles = (theme: Theme) => createStyles({
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
        fill: theme.color.grey.d1,
    },
    arrowSelected: {
        fill: theme.color.blue.d2,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(DagLayout) as React.ComponentClass<DagLayoutProps>;

