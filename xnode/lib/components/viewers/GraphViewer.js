'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import DAGViz from '../viz/DAGViz';
import DAGBuilder from './dagbuilder';

import ColorPink from '@material-ui/core/colors/pink';
import ColorGrey from '@material-ui/core/colors/grey';
import ColorBlue from "@material-ui/core/colors/blue";
import ColorOrange from '@material-ui/core/colors/orange';

// Graph element size constants.
const kDataNodeHeight = 25;
const kDataNodeWidth = 25;
const kOpNodeHeight = 40;
const kOpNodeWidth = 80;
const kCollapsedAbstractiveHeight = 40;
const kCollapsedAbstractiveWidth = 80;

/**
 * This object uses the ops, data, and edges in a graph, as read from the symbol table, to create a `DAGBuilder`
 * instance ready to lay out that graph.
 */
class _ComputationGraph {
    /**
     * Constructor.
     *
     * @param {object} symbolTable
     *      A mapping of symbol IDs to symbol schemas.
     */
    constructor(symbolTable) {
        // Collection of edges of the form `[dataSymbolId, startSymbolId, fromPortNum, endSymbolId, argumentName]`
        this._edges = [];
        // Mapping of op symbol IDs to sets of all their containers; used to check if a symbol in the graph is an op,
        // as well as determine the the graph's minimal encapsulating container
        this._opContainerSets = {};
        // A list of container symbol IDs, from lowest height to highest; used to identify graph's minimal encapsulating
        // container
        this._opContainerChain = null;
        // Set of all container symbol IDs in the ancestry of the graph's op nodes; some or all will be included in the
        // graph
        this._containerSymbolIds = new Set();
        // Mapping of data symbol IDs to sets of all ops that use that data as input; used to determine where data
        // nodes should be created
        this._dataConnections = {};
        // All ops and containers without any parent container; these will not be in the graph if the minimal
        // encapsulating container is not `null`
        this._containerlessNodes = new Set();
        // A DAGBuilder instance which this graph will use to translate itself into a generic DAG
        this._builder = null;
        // The symbol ID of the minimal encapsulating container of the graph
        this._encapsulatingContainer = null;
        // Mapping of op symbol IDs to DAGNode objects
        this._opNodes = {};
        // Mapping of container symbol IDs to DAGNode objects
        this._containerNodes = {};
        // Mapping of data symbol IDs to {op symbol ID: DAGNode} objects; there might be multiple data nodes of the same
        // symbol in a graph (as many as one per connected op)
        this._dataNodes = {};

        // Helper functions for extracting information about symbols in the graph. A reference to `symbolTable` should
        // not be directly stored, so we have a better idea of why `_ComputationGraph` needs it at all.
        this._getContainerSymbolId = (symbolId) => symbolTable[symbolId].data.container;
        this._getTemporalStep = (symbolId) => symbolTable[symbolId].data.temporalstep;
        this._getFunctionName = (symbolId) => symbolTable[symbolId].data.functionname;
    }

    /**
     * Indicate that a particular `graphdata` instance should appear at least once in the computation graph.
     *
     * When a `graphdata` instance is used as input to a `graphop`, but the `graphdata` was not created by any recorded
     * op, it exists as a data node somewhere in the graph. When multiple ops use the same `graphdata`, they sometimes
     * share the same data node, and other times have separate data nodes. We decide this in `createDagBuilder()`; for
     * now, just register that the data node will exist somewhere.
     *
     * @param symbolId
     */
    addData(symbolId) {
        if(!symbolId in this._dataConnections) {
            this._dataConnections[symbolId] = [];
        }
    }

    /**
     * Add a new op node to the computation graph.
     *
     * `graphop` instances have a well-defined container, and appear as exactly one node in the graph. This function
     * also stores internally all information about the op's container ancestry, which will be used in
     * `createDAGBuilder()` to identify what the minimal encapsulating container of the graph is.
     *
     * @param symbolId
     */
    addOp(symbolId) {
        const opSymbolId = symbolId;
        const containerChain = [];
        this._opContainerSets[opSymbolId] = new Set();
        while (symbolId !== null) {
            if (this._getContainerSymbolId(symbolId) === null) {
                this._containerlessNodes.add(symbolId);
            }
            symbolId = this._getContainerSymbolId(symbolId);
            if (symbolId !== null) {
                this._containerSymbolIds.add(symbolId);
            }
            containerChain.push(symbolId);
        }
        this._opContainerSets[opSymbolId] = new Set(containerChain);

        // If we don't have one saved already, save the `containerChain` so that we can iterate through it to identify
        // the graph's minimal encapsulating container.
        if (this._opContainerChain === null) {
            this._opContainerChain = containerChain;
        }
    }

    /**
     * Add a new edge to the computation graph.
     *
     * By the construction of a computation graph, the edge can connect either two op nodes, connect a data node to an
     * op node, or connect an op node to a data node. Here, we record the properties of the edge (which symbols it
     * connects, its label, etc). In addition, if the edge involves a data node, we save internally that the associated
     * data node connects to the associated op. This will be used in `createDAGBuilder()` to determine position and
     * presence of data nodes.
     *
     * @param {string} symbolId
     *      The symbol ID of the `graphdata` being passed into or out of an op node in this edge.
     * @param {string} startSymbolId
     *      The symbol ID of the op or data node from which the edge originates.
     * @param {number} fromPortNum
     *      The index of the port on the starting node from which the edge originates; higher index places the edge's
     *      origin further to the right.
     * @param {string} endSymbolId
     *      The symbol ID of the op or data node at which the edge ends.
     * @param {string} argName
     *      The string name of the argument on the terminal op node to which the edge is input
     */
    addEdge(symbolId, startSymbolId, fromPortNum, endSymbolId, argName) {
        // If the edge starts at a data node, then register that that `graphdata` connects to the terminal `graphop`
        if (startSymbolId === symbolId) {
            if (!(symbolId in this._dataConnections)) {
                this._dataConnections[symbolId] = [];
            }
            this._dataConnections[symbolId].push(endSymbolId);
        }
        // If the edge ends at a data node, then register that that `graphdata` connects to the starting `graphop`
        if (endSymbolId === symbolId) {
            if (!(symbolId in this._dataConnections)) {
                this._dataConnections[symbolId] = [];
            }
            this._dataConnections[symbolId].push(startSymbolId);
        }
        this._edges.push([symbolId, startSymbolId, fromPortNum, endSymbolId, argName]);
    }

    /**
     * Gets the smallest container that encloses every op added to the computation graph.
     *
     * When building and rendering the graph, we only render the portion that exists within the minimal encapsulating
     * container; otherwise, if we were to view a small subgraph in a large and complex structure, we would have to
     * dive through many layers of containers just to find the content of interest.
     *
     * @returns {?string}
     *      The symbol ID of the minimal encapsulating container, or `null` if there is no single container that holds
     *      every op.
     * @private
     */
    _getEncapsulatingContainer() {
        const commonContainers = new Set(
            Object.values(this._opContainerSets).reduce((a, b) => [...a].filter(x => b.has(x)))
        );

        const sharedHierarchy = this._opContainerChain.filter(symbolId => commonContainers.has(symbolId));
        return sharedHierarchy.length > 0 ? sharedHierarchy[0] : null;
    }

    /**
     * Gets the object on which `addNode()` should be called to create the `DAGNode` object for a given container or op
     * symbol.
     *
     * The parent node may or may not exist; if it doesn't, `_getNode()` will be called, potentially calling
     * `_getParentNode()` again, until an already-existing node is found or the outermost container is reached. If the
     * latter occurs, then the returned parent node is a `DAGBuilder`.
     *
     * @param {string} symbolId
     *      The symbol ID of a `graphcontainer` or a `graphop`.
     * @returns {DAGNode|DAGBuilder}
     *      The object on which `addNode()` should be called to create a `DAGNode` for the symbol with ID `symbolId`.
     * @private
     */
    _getParentNode(symbolId) {
        let parentNode = this._builder;
        if (this._getContainerSymbolId(symbolId) !== this._encapsulatingContainer) {
            parentNode = this._getNode(this._getContainerSymbolId(symbolId));
        }
        return parentNode;
    }

    /**
     * Gets the `DAGNode` for a given symbol, creating it if it does not already exist.
     *
     * This function may operate recursively if the node for that symbol has not yet been created. For `graphop` and
     * `graphcontainer` symbols, `connectedSymbolId` is not used. For `graphdata`, `connectedSymbolId` is the symbol ID
     * of a `graphop` to which this particular `graphdata` instance is connected, which will be used to determine the
     * placement of the symbol's `DAGNode` and whether it should be the same as that used as input to other `graphop`s.
     *
     * @param {string} symbolId
     *      The symbol ID of the object whose associated `DAGNode` should be returned.
     * @param {?string} connectedSymbolId
     *      The symbol ID fo a `graphop` to which the symbol with ID `symbolId` is connected; for `graphdata` instances,
     *      this is required and will affect which `DAGNode` is returned.
     * @returns {DAGNode}
     *      The `DAGNode` that represents the symbol with ID `symbolId`, as connected to the symbol with ID
     *      `connectedSymbolId`.
     * @private
     */
    _getNode(symbolId, connectedSymbolId) {
        // If it's an op we've seen before, return the node
        if (symbolId in this._opNodes) {
            return this._opNodes[symbolId];
        }
        // If it's a container we've seen before, return the node
        if (symbolId in this._containerNodes) {
            return this._containerNodes[symbolId];
        }
        // If it's an op we haven't seen before, create a node
        if (symbolId in this._opContainerSets) {
            const node = this._getParentNode(symbolId).addNode(-1);
            node.setCollapsedWidth(kOpNodeWidth);
            node.setCollapsedHeight(kOpNodeHeight);
            node.addMetadata('symbolId', symbolId);
            node.addMetadata('type', 'graphop');
            node.addMetadata('label', this._getFunctionName(symbolId));
            this._opNodes[symbolId] = node;
            return node;
        }
        // If it's a container we haven't seen before, create a node
        if (this._containerSymbolIds.has(symbolId)) {
            const node = this._getParentNode(symbolId).addNode(this._getTemporalStep(symbolId));
            node.setCollapsedWidth(kCollapsedAbstractiveWidth);
            node.setCollapsedHeight(kCollapsedAbstractiveHeight);
            node.addMetadata('symbolId', symbolId);
            node.addMetadata('type', 'graphcontainer');
            node.addMetadata('label', this._getFunctionName(symbolId));
            if (this._getTemporalStep(symbolId) >= 0) {
                // Temporal nodes should start open
                node.toggleExpanded();
                node.addMetadata('temporal', true);
            }
            this._containerNodes[symbolId] = node;
            return node;
        }
        // If it's a data leaf, we create a new node if one has not yet been created in the connected op's container
        if (symbolId in this._dataConnections) {
            if (!(symbolId in this._dataNodes)) {
                this._dataNodes[symbolId] = {};
            }

            if (this._getContainerSymbolId(connectedSymbolId) in this._dataNodes[symbolId]) {
                return this._dataNodes[symbolId][this._getContainerSymbolId(connectedSymbolId)];
            }

            const node = this._getParentNode(connectedSymbolId).addNode(-1);
            node.setCollapsedWidth(kDataNodeWidth);
            node.setCollapsedHeight(kDataNodeHeight);
            node.addMetadata('symbolId', symbolId);
            node.addMetadata('type', 'graphdata');
            this._dataNodes[symbolId][this._getContainerSymbolId(connectedSymbolId)] = node;
            return node;
        }
    }

    /**
     * Creates a new `DAGBuilder` and adds all nodes and edges in the computation graph.
     *
     * @param {function} onLayout
     *      A function accepting arguments `(graphWidth, graphHeight, nodes, edges)` that should be called whenever
     *      the `DAGBuilder` has laid out the graph.
     * @returns {DAGBuilder}
     *      A `DAGBuilder` containing all nodes and edges in the computation graph and ready to be built.
     */
    createDAGBuilder(onLayout) {
        this._builder = new DAGBuilder(onLayout);
        this._encapsulatingContainer = this._getEncapsulatingContainer();
        this._edges.forEach(([symbolId, startSymbolId, startPos, endSymbolId, argName]) => {
            const startNode = this._getNode(startSymbolId, endSymbolId);
            const endNode = this._getNode(endSymbolId, startSymbolId);
            const edge = startNode.addEdge(startPos, endNode);
            edge.unifyWith(symbolId);
            edge.addMetadata('symbolId', symbolId);
            edge.addMetadata('label', argName);
        });
        return this._builder;
    }
}

/**
 * This dumb component renders a viewer for a Python sequence variable (list, tuple, set). It converts between the
 * Canvas data structures to the explicit data model expected by `SequenceViz`.
 */
class GraphViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** The `data` sub-object as defined in `SYMBOL-TABLE-SCHEMA.md` for "graphdata". */
        data: PropTypes.object,

        /** Reference to the application symbol table. */
        symbolTable: PropTypes.object.isRequired,

        /** The symbol ID of the graph's head `graphdata` instance. */
        symbolId: PropTypes.string,

        /**
         * Generates a sub-viewer for a particular element of the list.
         *
         * @param symbolId
         *     Symbol ID of the element for which to create a new viewer.
         */
        expandSubviewer: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            // The symbol ID of the currently selected graph component, or `null` if none is selected
            selectedId: null,
            // The symbol ID of the currently hovered graph component, or `null` if none is selected
            hoverId: null,
            // An array of `dagbuilder.DAGNode` objects, or `null` if the graph has yet to be laid out
            nodes: null,
            // An array of `dagbuilder.DAGEdge` objects, or `null` if the graph has yet to be laid out
            edges: null,
            // The height of the graph being rendered in the viewer
            graphHeight: null,
            // The width of the graph being rendered in the viewer
            graphWidth: null,
            // Whether the DAG has been built (but possibly not yet laid out)
            built: false,
        };
    }

    /**
     * When the component updates, we check if it still needs to build the graph for the first time; if it does, and has
     * the information to do so, build the DAG.
     */
    componentDidUpdate() {
        const { symbolId, symbolTable, data } = this.props;
        const { built } = this.state;
        if (!built && symbolId in symbolTable && data !== null) {
            this.buildDAG(symbolId);
            this.setState({built: true});
        }
    }

    /**
     * Read the graph from a head symbol via backlinks, adding all encountered op and data nodes to a `_ComputationGraph`
     * object.
     *
     * @param {string} headSymbolId
     *      The symbol ID of the head data node of the graph.
     * @returns {_ComputationGraph}
     *      A `_ComputationGraph` object to which all encountered nodes and edges have been added.
     */
    loadGraphBackwards(headSymbolId) {
        const { symbolTable } = this.props;
        const getCreatorOp = (symbolId) => symbolTable[symbolId].data.creatorop;
        const getCreatorPos = (symbolId) => symbolTable[symbolId].data.creatorpos;
        const getArgs = (symbolId) => symbolTable[symbolId].data.args;
        const getKwargs = (symbolId) => symbolTable[symbolId].data.kwargs;

        const computationGraph = new _ComputationGraph(symbolTable);

        const opsToCheck = [];
        const checkedOps = new Set();

        const headCreatorOpId = getCreatorOp(headSymbolId);
        if (headCreatorOpId !== null) {
            opsToCheck.push(headCreatorOpId);
            computationGraph.addData(headSymbolId);
            computationGraph.addEdge(headSymbolId, headCreatorOpId, getCreatorPos(headSymbolId), headSymbolId, '');
        }
        // Loop until every op in the history of the head symbol has been added
        while (opsToCheck.length > 0) {
            let opSymbolId = opsToCheck.pop();
            if (checkedOps.has(opSymbolId) || opSymbolId === null) {
                continue;
            }
            checkedOps.add(opSymbolId);
            computationGraph.addOp(opSymbolId);
            getArgs(opSymbolId).concat(getKwargs(opSymbolId)).forEach(([argName, arg]) => {
                // Arguments can be either values or lists of values; we convert the former to the latter for
                // convenience, since behavior doesn't change either way
                if (!Array.isArray(arg)) {
                    arg = [arg];
                }
                arg.filter(dataSymbolId => dataSymbolId !== null).forEach(dataSymbolId => {
                    const creatorOpSymbolId = getCreatorOp(dataSymbolId);
                    if (creatorOpSymbolId === null) {
                        computationGraph.addData(dataSymbolId);
                        // A data node always has exactly one output port, so we provide "0" as the port number
                        computationGraph.addEdge(dataSymbolId, dataSymbolId, 0, opSymbolId, argName);
                    }
                    else {
                        opsToCheck.push(creatorOpSymbolId);
                        computationGraph.addEdge(dataSymbolId, creatorOpSymbolId, getCreatorPos(dataSymbolId),
                            opSymbolId, argName);
                    }
                });
            });
        }
        return computationGraph;
    }

    /**
     * Reads the computation graph from the symbol table and then creates a `DAGBuilder` that lays out the graph and
     * will trigger a re-render whenever the graph state changes.
     *
     * The `DAGBuilder` will hold every node and edge in the graph, as well as the state of the graph. Whenever the
     * graph state changes, the `DAGBuilder` lays out the graph again, then triggers a re-render of the `GraphViewer`.
     *
     * @param {string} headSymbolId
     *      The symbol ID of the head data node of the computation graph.
     */
    buildDAG(headSymbolId) {
        console.debug('GraphViewer -- building DAG');
        const computationGraph = this.loadGraphBackwards(headSymbolId);
        const builder = computationGraph.createDAGBuilder(
            (graphWidth, graphHeight, nodes, edges) =>
                this.setState({graphWidth, graphHeight, nodes, edges})
        );
        builder.build();
    }

    // TODO: inspector pane
    /**
     * Renders a computation graph, including op nodes, data nodes, abstractive containers, temporal containers, and
     * edges representing data transfer between them.
     */
    render() {
        const { nodes, edges, graphHeight, graphWidth, hoverId, selectedId } = this.state;
        if (nodes !== null) {  // if nodes is non-null, then so is edges
            const model = {
                nodes: nodes.map(node => {
                    const { x, y, z, width, height } = node.getTransform();
                    const { symbolId, label, type, temporal } = node.getMetadata();
                    let color = null;
                    switch(type) {
                        case 'graphcontainer':
                            color = ColorBlue;
                            break;
                        case 'graphop':
                            color = ColorPink;
                            break;
                        case 'graphdata':
                            color = ColorOrange;
                            break;
                    }
                    return {
                        key: 'node' + node.getId(),
                        x, y, z, width, height, label, color,
                        isExpanded: node.getIsExpanded(),
                        isHovered: !temporal ? hoverId === symbolId : false,
                        isSelected: !temporal ? selectedId === symbolId : false,
                        onClick: () => this.setState({selectedId: !temporal ? symbolId : null}),
                        onDoubleClick: () => type === 'graphcontainer' && !temporal ? node.toggleExpanded() : null,
                        onMouseEnter: () => !temporal ? this.setState({hoverId: symbolId}) : null,
                        onMouseLeave: () => !temporal ? this.setState({hoverId: null}) : null,
                    }
                }),
                edges: edges.map(edge => {
                    const { z, points } = edge.getTransform();
                    const { symbolId, label } = edge.getMetadata();
                    const isHovered = hoverId === symbolId;
                    const isSelected = selectedId === symbolId;
                    return {
                        key: 'edge' + edge.getId(),
                        id: edge.getId(),
                        z, points, label,
                        baseColor: ColorGrey,
                        selectedColor: ColorBlue,
                        isCurved: edge.getIsLateral(),
                        isBackground: edge.getIsLateral(),
                        isHovered,
                        isSelected,
                        isOtherActive: (hoverId !== null || selectedId !== null) && !isHovered && !isSelected,
                        onClick: () => this.setState({selectedId: symbolId}),
                        onMouseEnter: () => this.setState({hoverId: symbolId}),
                        onMouseLeave: () => this.setState({hoverId: null}),
                    }
                }),
            };
            return (
                <DAGViz model={model} graphHeight={graphHeight} graphWidth={graphWidth}
                        onClick={() => this.setState({selectedId: null})}/>
            );
        }
        return null;
    }
}

export default GraphViewer;
