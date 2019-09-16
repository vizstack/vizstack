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
import { arr2obj, obj2arr, obj2obj, map2obj } from '../../utils/data-utils';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

import { NodeId, EdgeId, NodeSchema, EdgeSchema, Node, Edge, StructuredStorage, ForceConstraintLayout, fromSchema, toSchema, TrustRegionOptimizer,
    forcePairwiseNodes,
    positionNoOverlap,
    positionChildren,
    positionPorts,
    constrainOffset,
} from 'nodal';

// TODO: Replace with Immmutable.js.

/**
 * This pure dumb component renders a directed acyclic graph.
 */
const kNodeInitialWidth = 100000;
const kNodeResizeTolerance = 5;
const kFlowSpacing = 75;

type CardinalDirection = 'north' | 'south' | 'east' | 'west';

type DagLayoutProps = FragmentProps<DagLayoutFragment>;

type DagLayoutState = {
    /** Nodes and Edges after populated with size and position information. */
    nodes: Map<DagNodeId,
        NodeSchema & {
            shape: Required<NodeSchema>['shape'],
            meta: {
                flowDirection?: CardinalDirection,
                alignChildren?: boolean,
            }
        }>;
    edges: Map<DagEdgeId, EdgeSchema>;

    /** Z-axis arrangement of graph elements after layout, sorted by ascending z-order. */
    ordering: Array<{ type: 'node'; id: DagNodeId } | { type: 'edge'; id: DagEdgeId }>;

    /** Size of the graph determined by the layout engine. */
    bounds: {
        width: number;
        height: number;
        x: number;
        X: number;
        y: number;
        Y: number;
    };

    nodeStates: Map<DagNodeId, {
        expanded: boolean;
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    }>;

    edgeStates: Map<DagEdgeId, {
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    }>;

    /** Which node or edge is selected */
    selectedNodeId: DagNodeId;
};

export type DagLayoutHandle = {
    nodes: Record<string, ViewerId>; // DagNodeId -> ...
    selectedNodeId: DagNodeId;
    doSelectNode: (nodeId: DagNodeId) => void;
    doSelectNeighborNode: (direction: 'north' | 'south' | 'east' | 'west') => void;
    doSetLightNode: (nodeId: DagNodeId, light: 'normal' | 'highlight' | 'lowlight' | 'selected') => void;
    doSetLightEdge: (edgeId: DagEdgeId, light: 'normal' | 'highlight' | 'lowlight' | 'selected') => void;
    doToggleNodeExpanded: (nodeId: DagNodeId) => void;
    doSetNodeExpanded: (nodeId: DagNodeId, expanded: boolean) => void;
};

type DagDidSelectElementEvent = {
    topic: 'Dag.DidSelectNode';
    message: {
        viewerId: ViewerId;
        selectedNodeId: DagNodeId;
        prevSelectedNodeId: DagNodeId;
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
    static defaultProps: Partial<DagLayoutProps> = {
        flowDirection: 'south',
        alignChildren: false,
    };

    resizes: number = 0;

    constructor(props: DagLayoutProps & InternalProps) {
        super(props);
        this.state = {
            nodes: new Map(Object.entries(this.props.nodes).map(([nodeId, node]) => [
                nodeId,
                {
                    id: nodeId,
                    shape: {
                        width: kNodeInitialWidth,
                        height: kNodeInitialWidth,
                    },
                    ports: obj2obj(node.ports || {}, (name, port) => [
                        name,
                        {
                            location: port.side,
                            order: port.order,
                        }
                    ]),
                    meta: {
                        alignChildren: node.alignChildren,
                        flowDirection: node.flowDirection,
                    }
                }
            ])),
            edges: new Map(Object.entries(this.props.edges).map(([edgeId, { source, target }]) => [
                edgeId,
                {
                    id: edgeId,
                    source: {
                        id: source.id as NodeId,
                        port: source.port,
                    },
                    target: {
                        id: target.id as NodeId,
                        port: target.port,
                    },
                    meta: {
                        isSourcePersistent: source.isPersistent,
                        isTargetPersistent: target.isPersistent,
                    }
                }
            ])),
            bounds: { width: 0, height: 0, x: 0, X: 0, y: 0, Y: 0 },
            ordering: Object.entries(this.props.nodes).map(([nodeId, node]) => ({ type: 'node', id: nodeId})),
            nodeStates: new Map(obj2arr(this.props.nodes, (nodeId, node) => [nodeId, {
                light: 'normal',
                expanded: node.isExpanded !== false,
            }])),
            edgeStates: new Map(obj2arr(this.props.edges, (edgeId, edge) => [edgeId, {
                light: 'normal',
            }])),
            selectedNodeId: `${Object.keys(this.props.nodes)[0]}`,
        };

        // Traverse hierarchy to set flowDirection on each node based on closest ancestors.
        const [nodes, edges] = fromSchema(
            Array.from(this.state.nodes.values()),  Array.from(this.state.edges.values())
        );
        const storage = new StructuredStorage(nodes, edges);
        const traverse = (u: Node, ancestorDirection: CardinalDirection) => {
            const flowDirection = u.meta!.flowDirection || ancestorDirection;
            u.meta!.flowDirection = flowDirection;
            u.children.forEach((child) => traverse(child, flowDirection));
        }
        storage.roots().forEach((node) => traverse(node, this.props.flowDirection!));

        console.log('constructor', this.state.nodes)
        this._getChildViewerCallback.bind(this);
    }

    private _childViewers: Map<DagNodeId, Viewer> = new Map();
    private _childViewerCallbacks: Map<DagNodeId, (viewer: Viewer) => void> = new Map();

    private _getChildViewerCallback(nodeId: DagNodeId) {
        if (!this._childViewerCallbacks.get(nodeId)) {
            this._childViewerCallbacks.set(nodeId, (viewer) => (this._childViewers.set(nodeId, viewer)));
        }
        return this._childViewerCallbacks.get(nodeId);
    }

    public getHandle(): DagLayoutHandle {
        const { selectedNodeId } = this.state;
        return {
            nodes: map2obj(this._childViewers, (k, v) => v ? [k, v.viewerId] : undefined),
            selectedNodeId,
            doSelectNode: (nodeId) => this.setState({selectedNodeId: nodeId}),
            doSelectNeighborNode: (direction) => {
                // TODO
            },
            doSetLightNode: (nodeId, light) => this.setState((state) => ({
                nodeStates: new Map(state.nodeStates).set(nodeId, {
                    ...state.nodeStates.get(nodeId)!,
                    light,
                })
            })),
            doSetLightEdge: (edgeId, light) => this.setState((state) => ({
                edgeStates: new Map(state.edgeStates).set(edgeId, {
                    ...state.edgeStates.get(edgeId)!,
                    light,
                })
            })),
            doToggleNodeExpanded: (nodeId) => this.setState((state) => ({
                nodeStates: new Map(state.nodeStates).set(nodeId, {
                    ...state.nodeStates.get(nodeId)!,
                    expanded: !state.nodeStates.get(nodeId)!.expanded,
                }),
            }), () => {
                // Only trigger a layout if the node is now expanded. When expanding,
                // none of the children change size, so their `_onNodeResize()` calls
                // do not change the state and trigger a layout. The expanded node shows
                // no viewer, so it never even calls `_onNodeResize()`;  we must instead
                // layout here. On collapse, the collapsed node will change size and call
                // `_onNodeResize()`, so we do not need to demand a layout here.
                if (this.state.nodeStates.get(nodeId)!.expanded) {
                    this._layoutGraph();
                }
            }),
            doSetNodeExpanded: (nodeId, expanded) => this.setState((state) => ({
                nodeStates: new Map(state.nodeStates).set(nodeId, {
                    ...state.nodeStates.get(nodeId)!,
                    expanded,
                }),
            }), () => {
                if (this.state.nodeStates.get(nodeId)!.expanded) {
                    this._layoutGraph();
                }
            }),
        };
    }

    componentDidMount() {
        // At this point, we have the sizes of the unlayouted nodes.
        console.debug('DagLayout -- componentDidMount(): mounted');
    }

    shouldComponentUpdate(nextProps: any, nextState: DagLayoutState) {
        // Prevent component from re-rendering each time a dimension is populated/updated unless all
        // dimensions are populated.
        return true;
    }

    componentDidUpdate(prevProps: any, prevState: DagLayoutState) {
        // Performing the layout will change the state, so we wrap it in a condition to prevent
        // infinite looping.
        console.log('DagLayout -- componentDidUpdate()');
        const { viewerId, emit } = this.props.interactions;
        const { selectedNodeId } = this.state;
        // if (this.hasMounted && didResize) {
        //     console.log('didResize', this.state.nodes.get('parent')!.shape.width);
        //     this._layoutGraph();
        // }
        // TODO: fire events
        // if (selectedNodeId !== prevState.selectedNodeId) {
        //     emit<DagLayoutEvent>('Dag.DidSelectNode', { viewerId, selectedNodeId });
        // }
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

        const prevWidth = this.state.nodes.get(nodeId)!.shape.width;
        const prevHeight = this.state.nodes.get(nodeId)!.shape.height;
        if (
            prevWidth !== undefined &&
            prevHeight !== undefined &&
            Math.abs(prevWidth - width) < kNodeResizeTolerance &&
            Math.abs(prevHeight - height) < kNodeResizeTolerance
        ) {
            return;
        }

        this.resizes += 1;

        this.setState((state) => {
            console.log(`resize added from ${nodeId}`)
            return {
                nodes: new Map(state.nodes).set(nodeId, {
                    ...state.nodes.get(nodeId)!,
                    shape: { width, height },
                })
            }
        }, () => {
            this.resizes -= 1;
            if (this.resizes === 0) {
                this._layoutGraph();
            }
        });
    }

    /**
     * Layout the graph using the current size dimensions.
     * @private
     */
    _layoutGraph() {
        console.log("_layoutGraph", this.state.nodes, this.state.nodeStates);
        const [nodes, edges] = fromSchema(Array.from(this.state.nodes.values()).map((node) => ({...node, children: this.props.nodes[node.id as DagNodeId].children as NodeId[]})), Array.from(this.state.edges.values()));
        const storage = new StructuredStorage(nodes, edges);
        const shownNodes: Node[] = [];
        const shownNodeIds: Set<NodeId> = new Set();
        const ordering: DagLayoutState['ordering'] = [];

        const traverse = (u: Node) => {
            shownNodes.push(u);
            shownNodeIds.add(u.id);
            ordering.push({ type: 'node', id: u.id as DagNodeId });
            if (this.state.nodeStates.get(u.id as DagNodeId)!.expanded) {
                u.children.forEach((v) => traverse(v));
            }
            else {
                u.children = [];  // Hide children if not expanded.
            }
        }
        storage.roots().forEach((node) => traverse(node));

        const shownEdges = storage.edges().filter(({ source, target}) => shownNodeIds.has(source.id) && shownNodeIds.has(target.id));  // TODO: use edge flags for when compound collapsed
        shownEdges.forEach((edge) => ordering.push({ type: 'edge', id: edge.id as DagEdgeId }));

        const shownStorage = new StructuredStorage(shownNodes, shownEdges);
        const shortestPath = shownStorage.shortestPaths();
        const graphFlowDirection = this.props.flowDirection!;
        const layout = new ForceConstraintLayout(
            shownStorage,
            function*(storage) {
                const elems = storage as StructuredStorage;
                yield* modelSpringElectrical(elems, shortestPath, 100, 0.1);
            },
            function*(storage, step) {
                const elems = storage as StructuredStorage;

                yield* constrainNodes(elems, step);

                // Edges use flow direction of least common ancestor.
                for(let { source, target } of elems.edges()) {
                    const lca = elems.leastCommonAncestor(source.node, target.node);
                    const flowDirection: CardinalDirection = lca ? lca.meta!.flowDirection : graphFlowDirection;
                    let flowAxis: [number, number];
                    let portLocations: [CardinalDirection, CardinalDirection];
                    let offset: number;
                    switch(flowDirection) {
                        case 'east':
                            flowAxis = [1, 0];
                            portLocations = ['east', 'west'];
                            offset = (source.node.shape.width + target.node.shape.width) / 2;
                            break;
                        case 'west':
                            flowAxis = [-1, 0];
                            portLocations = ['west', 'east'];
                            offset = (source.node.shape.width + target.node.shape.width) / 2;
                            break;
                        case 'north':
                            flowAxis = [0, -1];
                            portLocations = ['north', 'south'];
                            offset = (source.node.shape.height + target.node.shape.height) / 2;
                            break;
                        case 'south':
                        default:
                            flowAxis = [0, 1];
                            portLocations = ['south', 'north'];
                            offset = (source.node.shape.height + target.node.shape.height) / 2;
                            break;
                    }
                    yield constrainOffset(source.node.center, target.node.center, '>=', kFlowSpacing + offset, flowAxis);
                    source.node.ports[source.port].location = portLocations[0];  // TODO: Remove this lol!
                    target.node.ports[target.port].location = portLocations[1];
                };

            },
            configForceElectrical,
        );
        layout.onEnd((elems) => {
            const [nodeSchemas, edgeSchemas] = toSchema(Array.from(elems.nodes()), Array.from(elems.edges()));
            this.setState((state) => {
                // Merge layouted node/edge schema objects.
                const newNodes = new Map(state.nodes);
                nodeSchemas.forEach((nodeSchema) => newNodes.set(nodeSchema.id as DagNodeId, nodeSchema as any));
                const newEdges = new Map(state.edges);
                edgeSchemas.forEach((edgeSchema) => newEdges.set(edgeSchema.id as DagEdgeId, edgeSchema as any));

                console.log('done', newNodes, newEdges);

                return {
                    nodes: newNodes,
                    edges: newEdges,
                    bounds: elems.bounds(),
                    ordering,
                }
            });
        });
        layout.start();
    }

    /**
     * Renders a DAG with nodes and edges. Nodes can contain `Viewer` objects or other nodes,
     * depending on expansion mode. Edges can have string labels.
     */
    render() {
        const { classes, passdown, interactions, light } = this.props;
        const { mouseHandlers, viewerId, emit } = interactions;
        const { ordering, bounds, nodeStates, edgeStates } = this.state;

        console.log('DagLayout -- render(): ordering =', ordering, 'state =', this.state);

        function buildArrowMarker(id: string, className: string) {
            return (
                <marker
                    key={id}
                    id={id}
                    viewBox='0 0 10 10'
                    refX='4'
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
            <Frame component='div' style='framed' light={light} mouseHandlers={mouseHandlers}>
                <div className={classes.graph}>
                    <svg
                        viewBox={bounds ? `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` : undefined}
                        width={bounds ? `${bounds.width}` : '100%'}
                        height={bounds ? `${bounds.height}` : '100%'}>
                        <defs>
                            {[
                                buildArrowMarker('arrow-normal', classes.arrowNormal),
                                buildArrowMarker('arrow-highlight', classes.arrowHighlight),
                                buildArrowMarker('arrow-lowlight', classes.arrowLowlight),
                                buildArrowMarker('arrow-selected', classes.arrowSelected),
                            ]}
                        </defs>
                        <rect
                            x={bounds.x}
                            y={bounds.y}
                            width={bounds.width}
                            height={bounds.height}
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
                                    const { children, center, shape } = this.state.nodes.get(id)!;
                                    return (
                                        <DagNodeComponent
                                            key={`n-${id}`}
                                            x={center ? center.x : 0}
                                            y={center ? center.y : 0}
                                            width={shape.width}
                                            height={shape.height}
                                            isExpanded={nodeStates.get(id)!.expanded && this.props.nodes[id].children.length !== 0}
                                            isInteractive={
                                                isInteractive !== false &&
                                                this.props.nodes[id].children.length !== 0
                                            }
                                            isVisible={isVisible}
                                            light={nodeStates.get(id)!.light}
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
                                    const { path } = this.state.edges.get(id)!;
                                    return (
                                        <DagEdgeComponent
                                            key={`e-${id}`}
                                            points={path || []}
                                            light={edgeStates.get(id)!.light}
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
            </Frame>
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


function* modelSpringElectrical(
    elems: StructuredStorage,
    shortestPath: (u: Node, v: Node) => number | undefined,
    idealLength: number,
    compactness: number,
) {
    const visited: Set<Node> = new Set();
    for(let u of elems.nodes()) {
        visited.add(u);
        // Compound nodes should pull children closer.
        if(u.children.length > 0) {
            for(let child of u.children) {
                yield forcePairwiseNodes(u, child, -compactness*(u.center.distanceTo(child.center)));
            };
        }
        for(let v of elems.nodes()) {
            if(visited.has(v)) continue;
            if(u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Spring force. Attempt to reach ideal distance between all pairs,
            // except unconnected pairs that are farther away than ideal.
            const uvPath = shortestPath(u, v);
            if(uvPath === undefined) continue; // Ignore disconnected components.
            const idealDistance = idealLength * uvPath;
            const actualDistance = u.center.distanceTo(v.center);
            if(elems.existsEdge(u, v, true)) {
                // Attractive force between edges if too far.
                if(actualDistance > idealLength) {
                    const delta = actualDistance - idealLength;
                    yield forcePairwiseNodes(u, v, [-wu*delta, -wv*delta]);
                }
            } else {
                // Repulsive force between node pairs if too close.
                if(actualDistance < idealDistance) {
                    const delta = idealDistance - actualDistance;
                    yield forcePairwiseNodes(u, v, [wu*delta, wv*delta]);
                }
            }
        }
    }
}

function* constrainNodes(elems: StructuredStorage, step: number) {
    for (let u of elems.nodes()) {
        // Apply no-overlap to all siblings.
        if(step > 15) {
            for(let sibling of elems.siblings(u)) {
                yield positionNoOverlap(u, sibling);
            }
        }
        yield positionChildren(u);
        yield positionPorts(u);
    }
}

const configForceElectrical = {
    numSteps: 200, numConstraintIters: 5, numForceIters: 5,
    forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.001 })
};
