import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
import _ from 'lodash';
import { Map as ImmutableMap, List as ImmutableList, Set as ImmutableSet } from 'immutable';

import defaultTheme from '../../theme';

import { DagLayoutFragment, DagNodeId, DagNode, DagEdgeId, DagEdge } from '@vizstack/schema';
import { NodeId, NodeSchema, EdgeSchema, Node, StructuredStorage, fromSchema } from 'nodal';

import { Viewer, FragmentProps } from '../../Viewer';
import DagNodeComponent from './DagNode';
import DagEdgeComponent from './DagEdge';
import { arr2obj, obj2arr, obj2obj, map2obj } from '../../utils/data-utils';
import { ViewerId } from '../../interaction';
import Frame from '../../Frame';

import workerFn from './worker';

// TODO: uncomment this when running storybook
// import MyWorker from 'worker-loader!./worker'
// TODO: uncomment this when running a build
// import MyWorker from 'web-worker:./worker';



/**
 * This pure dumb component renders a directed acyclic graph.
 */
const kNodeGroupDefaultSize = 10;
const kNodeLeafDefaultSize = 10000;
const kNodeResizeTolerance = 5;
const kGraphPadding = 10;
const kFlowSpacing = 30;

type CardinalDirection = 'north' | 'south' | 'east' | 'west';

type DagLayoutProps = FragmentProps<DagLayoutFragment>;

type NodeSchemaAugmented = NodeSchema & {
    shape: Required<NodeSchema>['shape'],
    meta: {
        flowDirection?: CardinalDirection,
        alignChildren?: boolean,
    }
};

type EdgeSchemaAugmented = EdgeSchema & {
    meta: {
        flowDirection?: CardinalDirection,
    }
};

type OrderingElement = { type: 'node'; id: DagNodeId } | { type: 'edge'; id: DagEdgeId };

type DagLayoutState = {
    /** Nodes and Edges after populated with size and position information. */
    nodes: ImmutableMap<DagNodeId, NodeSchemaAugmented>;
    edges: ImmutableMap<DagEdgeId, EdgeSchemaAugmented>;

    /** Z-axis arrangement of graph elements after layout, sorted by ascending z-order. */
    ordering: ImmutableList<OrderingElement>;

    /** Size of the graph determined by the layout engine. */
    bounds: {
        width: number;
        height: number;
        x: number;
        X: number;
        y: number;
        Y: number;
    };

    /** Interaction states of Nodes and Edges. */
    nodeExpansions: ImmutableMap<DagNodeId, boolean>;

    nodeStates: ImmutableMap<DagNodeId, {
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    }>;
    edgeStates: ImmutableMap<DagEdgeId, {
        light: 'normal' | 'highlight' | 'lowlight' | 'selected';
    }>;

    /** ID of the currently selected Node. */
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
    topic: 'Dag.NodeDidResize';
    message: {
        viewerId: ViewerId;
        nodeId: DagNodeId;
        expanded: boolean,
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

    // 
    static defaultProps: Partial<DagLayoutProps> = {
        flowDirection: 'south',
        alignChildren: false,
    };

    // Count how many resize state updates have not been committed yet.
    resizes: number = 0;

    calculateGraphElements(
        allNodes: DagLayoutProps['nodes'],
        allEdges: DagLayoutProps['edges'],
        allAlignments: DagLayoutProps['alignments'],
        nodeExpansions: DagLayoutState['nodeExpansions'],
        prevNodes: DagLayoutState['nodes'],
        prevEdges: DagLayoutState['edges'],
    ): { nodes: DagLayoutState['nodes'], edges: DagLayoutState['edges'], ordering: DagLayoutState['ordering'] } {
        // TODO: Selectorize.
        const allParents: Map<DagNodeId, DagNodeId> = new Map();
        Object.entries(allNodes).forEach(([nodeId, node]) => node.children.forEach((childId) => allParents.set(childId, nodeId)));
        const allRoots: DagNodeId[] = Object.keys(allNodes).filter((nodeId) => allParents.get(nodeId) === undefined);

        const visibleOrdering: OrderingElement[] = [];

        // Compute visible nodes.
        const visibleNodes: Map<DagNodeId, NodeSchemaAugmented> = new Map(); 
        const traverse = (nodeId: DagNodeId) => {
            visibleOrdering.push({type: 'node', id: nodeId});

            const prevNode = prevNodes.get(nodeId);
            const nodeExpanded = nodeExpansions.get(nodeId);  // Only true if has children.
            const nodeDefaultSize = nodeExpanded ? kNodeGroupDefaultSize : kNodeLeafDefaultSize;
            visibleNodes.set(nodeId, {
                id: nodeId,
                shape: {
                    type: 'rectangle',
                    width: prevNode ? prevNode.shape.width : nodeDefaultSize,
                    height: prevNode ? prevNode.shape.height : nodeDefaultSize,
                },
                // TODO: Change port schema to use location, as in nodal.
                ports: prevNode ? prevNode.ports : obj2obj(allNodes[nodeId]!.ports || {}, (name, port) => [
                    name,
                    {
                        location: port.side,
                        order: port.order,
                    }
                ]),
                meta: {
                    alignChildren: allNodes[nodeId]!.alignChildren || this.props.alignChildren!,
                },
                children: nodeExpanded ? allNodes[nodeId]!.children : [],
            });
            if(nodeExpansions.get(nodeId)) {
                // Show children of expanded node.
                allNodes[nodeId]!.children.forEach((childId) => traverse(childId));
            }
        }
        allRoots.forEach((root) => traverse(root));

        // Compute visible edges.
        const visibleEdges: Map<DagNodeId, EdgeSchemaAugmented>  = new Map();
        Object.entries(allEdges).forEach(([edgeId, edge]) => {
            if (visibleNodes.has(edge.source.id) && visibleNodes.has(edge.target.id)) {
                visibleOrdering.push({type: 'edge', id: edgeId});
                visibleEdges.set(edgeId, {
                    id: edgeId,
                    source: {
                        id: edge.source.id,
                        port: edge.source.port,
                    },
                    target: {
                        id: edge.target.id,
                        port: edge.target.port,
                    },
                    meta: {
                        // TODO: use isPersistent flags to create new edges
                        isSourcePersistent: edge.source.isPersistent,
                        isTargetPersistent: edge.target.isPersistent,
                    }
                });
            }
        });

        // Set `flowDirection` on each node based on ancestors by traversing containment hierarchy.
        const {nodes, edges} = fromSchema(
            Array.from(visibleNodes.values()),  Array.from(visibleEdges.values())
        );
        const storage = new StructuredStorage(nodes, edges);
        const flowTraverse = (u: Node, ancestorDirection: CardinalDirection) => {
            const flowDirection = u.meta!.flowDirection || ancestorDirection;
            u.meta!.flowDirection = flowDirection;
            u.children.forEach((child) => flowTraverse(child, flowDirection));
        }
        storage.roots().forEach((node) => flowTraverse(node, this.props.flowDirection!));

        // Set `flowDirection` on each edge based on least common ancestor of their source
        // and target nodes.
        storage.edges().forEach((edge) => {
            const lca = storage.leastCommonAncestor(edge.source.node, edge.target.node);
            if (lca !== undefined) {
                edge.meta!.flowDirection = lca.meta!.flowDirection;
            } else {
                edge.meta!.flowDirection = this.props.flowDirection!;
            }
        });

        return {
            nodes: ImmutableMap(visibleNodes),
            edges: ImmutableMap(visibleEdges),
            ordering: ImmutableList(visibleOrdering),
        }
    }

    constructor(props: DagLayoutProps & InternalProps) {
        super(props);
        // TODO: Set expansion to true iff has children (also take into account isExpanded).
        const nodeExpansions = ImmutableMap(obj2arr(this.props.nodes, (nodeId, node) => [nodeId, node.isExpanded !== false && node.children.length > 0]))
        this.state = {
            ...this.calculateGraphElements(this.props.nodes, this.props.edges, this.props.alignments, nodeExpansions, ImmutableMap(), ImmutableMap()),
            bounds: { width: 0, height: 0, x: 0, X: 0, y: 0, Y: 0 },
            nodeExpansions,
            nodeStates: ImmutableMap(obj2arr(this.props.nodes, (nodeId) => [nodeId, {
                light: 'normal',
            }])),
            edgeStates: ImmutableMap(obj2arr(this.props.edges, (edgeId) => [edgeId, {
                light: 'normal',
            }])),
            selectedNodeId: `${Object.keys(this.props.nodes)[0]}`,
        };

        // Bind methods for ref callbacks.
        this._getChildViewerCallback.bind(this);

        console.log('constructor', this.state.nodes);
    }

    private _childViewers: Map<DagNodeId, Viewer> = new Map();
    private _childViewerCallbacks: Map<DagNodeId, (viewer: Viewer) => void> = new Map();

    private _getChildViewerCallback(nodeId: DagNodeId) {
        // TODO: What happens when I delete a Viewer (e.g. through hiding)?
        if (!this._childViewerCallbacks.get(nodeId)) {
            this._childViewerCallbacks.set(
                nodeId,
                (viewer) => this._childViewers.set(nodeId, viewer),
            );
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
                nodeStates: state.nodeStates.setIn([nodeId, 'light'], light)
            })),
            doSetLightEdge: (edgeId, light) => this.setState((state) => ({
                edgeStates: state.edgeStates.setIn([edgeId, 'light'], light)
            })),
            doToggleNodeExpanded: (nodeId) => this.setState((state) => {
                const nodeExpansions = state.nodeExpansions.set(nodeId, this.props.nodes[nodeId].children.length > 0 ? !state.nodeExpansions.get(nodeId) : false);
                return {
                    ...this.calculateGraphElements(this.props.nodes, this.props.edges, this.props.alignments, nodeExpansions, state.nodes, state.edges),
                    nodeExpansions,
                 };
            }),
            doSetNodeExpanded: (nodeId, expanded) => this.setState((state) => {
                const nodeExpansions = state.nodeExpansions.set(nodeId, this.props.nodes[nodeId].children.length > 0 ? expanded : false);
                return {
                    ...this.calculateGraphElements(this.props.nodes, this.props.edges, this.props.alignments, nodeExpansions, state.nodes, state.edges),
                    nodeExpansions,
                 };
            }),
        };
    }

    componentDidMount() {
        // At this point, we have the sizes of the unlayouted nodes.
        console.debug('DagLayout -- componentDidMount(): mounted');
    }


    componentDidUpdate(prevProps: any, prevState: DagLayoutState) {
        // Performing the layout will change the state, so we wrap it in a condition to prevent
        // infinite looping.
        console.log('DagLayout -- componentDidUpdate()');
        const { viewerId, emit } = this.props.interactions;
        const { selectedNodeId, nodeStates, nodeExpansions, edgeStates } = this.state;
        if (selectedNodeId !== prevState.selectedNodeId) {
            emit<DagLayoutEvent>('Dag.DidSelectNode', { viewerId, selectedNodeId, prevSelectedNodeId: prevState.selectedNodeId });
        }
        if (nodeStates !== prevState.nodeStates) {
            Array.from(nodeStates.entries()).forEach(([nodeId, {light}]) => {
                const prevNodeState = prevState.nodeStates.get(nodeId);
                if(prevNodeState === undefined) return;
                const { light: prevLight } = prevNodeState;
                if (prevLight !== light) {
                    emit<DagLayoutEvent>('Dag.NodeDidChangeLight', {
                        viewerId, nodeId, light,
                    });
                }
            });
        }
        if (nodeExpansions !== prevState.nodeExpansions) {
            Array.from(nodeExpansions.entries()).forEach(([nodeId, expanded]) => {
                const prevExpanded = prevState.nodeExpansions.get(nodeId);
                if(prevExpanded === undefined) return;
                if (prevExpanded !== expanded) {
                    emit<DagLayoutEvent>('Dag.NodeDidResize', {
                        viewerId, nodeId, expanded,
                    });
                }
            });
        }
        if (edgeStates !== prevState.edgeStates) {
            Array.from(edgeStates.entries()).forEach(([edgeId, {light}]) => {
                const prevEdgeState = prevState.edgeStates.get(edgeId);
                if(prevEdgeState === undefined) return;
                const { light: prevLight } = prevEdgeState;
                if (prevLight !== light) {
                    emit<DagLayoutEvent>('Dag.EdgeDidChangeLight', {
                        viewerId, edgeId, light,
                    });
                }
            });
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

        console.log(`DagLayout -- _onNodeResize(${nodeId}, ${width}, ${height}, ${prevWidth}, ${prevHeight})`);

        this.resizes += 1;

        this.setState((state) => {
            console.log(`resize queued from ${nodeId}`);
            return {
                nodes: state.nodes.mergeIn([nodeId], {
                    shape: { type: 'rectangle', width, height },
                })
            };
        }, () => {
            this.resizes -= 1;
            console.log(`resize saved from ${nodeId}`);
            if (this.resizes === 0) {
                console.log(`resize counter reached 0`);
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

        // const worker = new MyWorker();

        const layoutCallback = (e: any) => {
            const { nodeSchemas, edgeSchemas, bounds}: {
                nodeSchemas: NodeSchemaAugmented[], 
                edgeSchemas: EdgeSchemaAugmented[], 
                bounds: DagLayoutState['bounds'],
            } = e.data;
            this.setState((state) => {
                return {
                    nodes: ImmutableMap(nodeSchemas.map((ns) => [ns.id, ns])),
                    edges: ImmutableMap(edgeSchemas.map((es) => [es.id, es])),
                    bounds: {
                        x: bounds.x - kGraphPadding,
                        y: bounds.y - kGraphPadding,
                        X: bounds.X + kGraphPadding,
                        Y: bounds.Y + kGraphPadding,
                        width: bounds.width + kGraphPadding * 2,
                        height: bounds.height + kGraphPadding * 2,
                    },
                }
            });
        }

        // worker.onmessage = laid
        // worker.postMessage({
        const results = workerFn({ data: {
            nodeSchemas: Array.from(this.state.nodes.values()),
            edgeSchemas: Array.from(this.state.edges.values()),
            alignments: this.props.alignments || [],  // TOOD: From this.state.alignment
        }});
        layoutCallback(results);
    }

    /**
     * Renders a DAG with nodes and edges. Nodes can contain `Viewer` objects or other nodes,
     * depending on expansion mode. Edges can have string labels.
     */
    render() {
        const { classes, passdown, interactions, light } = this.props;
        const { mouseHandlers, viewerId, emit } = interactions;
        const { ordering, bounds, nodeStates, nodeExpansions, edgeStates } = this.state;

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
                {bounds.width === 0 ? <CircularProgress /> : null}
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
                                            isExpanded={nodeExpansions.get(id) === true}
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
