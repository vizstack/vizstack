/**
 * This file defines classes which are used to build a generic representation of a directed acyclic graph.
 *
 * The `DagBuilder` class can be instantiated by clients, who can then add nodes in a hierarchical structure and control
 * the layout orientation of nodes individually. The graph also stores a state, such as whether each node is expanded,
 * showing its children, or contracted, hiding them. Whenever the state is updated, the `DagBuilder` uses the layout
 * engine exported by `./layout` to position nodes and edges in the graph, afterwards sending this new layout to the
 * client via a callback. The client can then render the graph as they see fit.
 *
 * During graph creation, clients can attach metadata to nodes and edges, which the `DagBuilder` cannot use but can be
 * read during rendering, allowing for visualization behavior (such as conditional coloring) using properties beyond
 * those needed for the layout process.
 */

import { getElkGraph, layoutElkGraph } from './layout';

/**
 * Represents a node in a directed acyclic graph.
 */
class DagNode {
    /**
     * Constructor. Should only be called by `DagBuilder`.
     *
     * @param {number} id
     *      An ID unique among all nodes in the Dag.
     * @param {number} lateralStep
     *      The index of this node in a sequence of horizontally-aligned nodes, or -1 if it is not a member of such a
     *      sequence.
     * @param {?DagNode} parentNode
     *      The node in the Dag inside of which this node should be placed, or `null` if the node has no parent.
     */
    constructor(id, lateralStep, parentNode) {
        this._id = id;
        this._lateralStep = lateralStep;
        this._containsLateral = false;
        this._expanded = false;
        this._hierarchyHeight = 0;
        this._parentNode = parentNode;
        this._metadata = {};
        this._collapsedWidth = 0;
        this._collapsedHeight = 0;
        this._transform = {
            x: null,
            y: null,
            z: null,
            width: null,
            height: null,
        };
    }

    // Fully public methods
    // --------------------
    // These functions are available to all users, including `DagBuilder`, the layout engine, and clients.

    /** Returns the ID number of this node, unique among all nodes in the graph. */
    getId = () => this._id;
    /** Returns the `DagNode` inside of which this node should be positioned. */
    getParent = () => this._parentNode;
    /** Returns whether this node is part of a series of horizontally-aligned nodes. */
    getIsLateral = () => this._lateralStep >= 0;
    /** Returns the index of this node among a series of horizontally-aligned nodes, or -1 if it is not part of one. */
    getLateralStep = () => this._lateralStep;

    // Client-only methods
    // -------------------
    // These functions should only be used by clients, as they modify the graph contents or use node metadata.

    /** Sets how wide the node should be if it is not expanded. */
    setCollapsedWidth = (width) => (this._collapsedWidth = width);
    /** Sets how tall the node should be if it is not expanded. */
    setCollapsedHeight = (height) => (this._collapsedHeight = height);

    /** Returns an object of key-value pairs set by the client in `addMetadata()`. */
    getMetadata = () => this._metadata;

    /**
     * Adds an arbitrary key-value pair to this object's metadata, to be set and used only by clients.
     *
     * Clients often will need to attach information to a node so that they can properly render and interact with it;
     * the metadata objects allows for this in a way that keeps that information tied to the object but prevents
     * information leakage to the `DagBuilder` or the layout engine.
     *
     * @param {string} key
     *      Any key value.
     * @param {any} value
     *      Any value to associate with `key`.
     */
    addMetadata(key, value) {
        this._metadata[key] = value;
    }

    /**
     * Toggles whether the node is expanded, showing its children, or collapsed, appearing as a fixed-size childless
     * node.
     */
    toggleExpanded() {
        this._expanded = !this._expanded;
        this._onStateChanged();
    }

    /**
     * Adds a new child to this node, positioning the new node within this one.
     *
     * @param {number} lateralStep
     *      The index of the new node in a series of horizontally-aligned nodes, or -1 if it is not part of such a
     *      series. If this node contains any horizontally-aligned nodes, it must contain only horizontally-aligned
     *      nodes.
     * @returns {DagNode}
     *      A new node.
     */
    addNode(lateralStep) {
        if (lateralStep >= 0) {
            this._containsLateral = true;
        }
        this.updateHierarchyHeight(1);
        return this._createNode(lateralStep);
    }

    /**
     * Adds a new edge connecting this node to another one.
     *
     * This node will be treated as the starting node.
     *
     * @param {number} startPortNum
     *      The index of the port from which the node should originate; edges with the same port number start from the
     *      same position, and edges with higher port numbers start further to the right.
     * @param {DagNode} endNode
     *      The terminal node of the new edge.
     * @returns {DagEdge}
     *      The new edge.
     */
    addEdge(startPortNum, endNode) {
        return this._createEdge(startPortNum, endNode);
    }

    // Engine-only methods
    // -------------------
    // These functions should only be used by the layout engine, as they modify or determine graph transform.

    /** Returns how wide the node should be if it is not expanded. */
    getCollapsedWidth = () => this._collapsedWidth;
    /** Returns how tall the node should be if it is not expanded. */
    getCollapsedHeight = () => this._collapsedHeight;
    /** Returns whether the node is visible in the graph given its current state. */
    getIsVisible = () =>
        this.getParent() === null ||
        (this.getParent().getIsExpanded() && this.getParent().getIsVisible());
    /** Returns whether this node's children are horizontally-aligned. */
    getContainsLateral = () => this._containsLateral;
    /** Sets the position and size of the node, for use in rendering. */
    setTransform(x, y, z, width, height) {
        this._transform = {
            x,
            y,
            z,
            width,
            height,
        };
    }

    // Dag construction methods
    // ------------------------
    // These functions should only be used by `DagBuilder`, `DagNode`, and `DagEdge` objects, as they are used in new
    // node and edge instantiation.

    /**
     * Initializes a newly created node; should be called immediately after the node is created.
     *
     * Functions of `DagBuilder` are saved to this instance so that this instance can create new `DagNode`s and
     * `DagEdges`, as well as trigger new graph layouts whenever this instance's state changes.
     *
     * @param {function} createNode
     *      Accepts arguments `(lateralStep)` and returns a new `DagNode` which is a child of this one.
     * @param {function} createEdge
     *      Accepts arguments `(startPortNum, endNode)` and returns a new `DagEdge` connecting this node to `endNode`.
     * @param onStateChanged
     *      Accepts no arguments; called whenever this node's state (such as whether it is expanded or contracted)
     *      changes and should at least trigger a re-layout of the graph.
     */
    init(createNode, createEdge, onStateChanged) {
        this._createNode = createNode;
        this._createEdge = createEdge;
        this._onStateChanged = onStateChanged;
    }

    /**
     * Returns the `DagNode` which is a common ancestor of this node and `node`, or `null` if no such ancestor exists.
     *
     * @param {DagNode} node
     *      The node whose common ancestor with this one should be found.
     * @returns {?DagNode}
     *      The common ancestor, of `null` if none exists.
     */
    getCommonAncestor(node) {
        let n1 = this;
        let n2 = node;
        while (n1 !== n2) {
            if (n1 === null || n2 === null) {
                return null;
            }
            if (n1.getHierarchyHeight() > n2.getHierarchyHeight()) {
                n2 = n2.getParent();
            } else if (n1.getHierarchyHeight() < n2.getHierarchyHeight()) {
                n1 = n1.getParent();
            } else {
                n1 = n1.getParent();
                n2 = n2.getParent();
            }
        }
        return n1;
    }

    /**
     * Sets the hierarchical height of this node to the greater of `newHeight` and its current height.
     *
     * The hierarchical height of a node is the number of generations of descendants it has. It is used in the layout
     * process. Whenever a new node is added, `updateHierarchyHeight()` is called on each of its ancestors, increasing
     * their heights if the new node is the first child of its parent.
     *
     * @param {number} newHeight
     *      A proposed height for the node; the node's hierarchical height is the greater of its current height and
     *      `newHeight`.
     */
    updateHierarchyHeight(newHeight) {
        this._hierarchyHeight = Math.max(newHeight, this._hierarchyHeight);
        if (this._parentNode !== null) {
            this._parentNode.updateHierarchyHeight(this._hierarchyHeight + 1);
        }
    }

    // Client-forbidden methods
    // ------------------------
    // These functions should be used only by `DagNode`, `DagEdge`, `DagBuilder`, and the layout engine, as they present
    // information about the ground-truth graph, not the graph in its current state.

    /** Returns the hierarchical height of this node (see `updateHierarchyHeight()` for more). */
    getHierarchyHeight = () => this._hierarchyHeight;

    // Client- and engine-only methods
    // -------------------------------
    // These functions should be used only by clients and the layout engine, as they return information about the
    // graph's current state rather than its ground-truth representation.

    /** Returns whether the node is expanded, showing its children, or contracted, appearing as a fixed-size childless
     * node. */
    getIsExpanded = () => this._expanded;
    /** Returns an object with the position and size of the node, as currently laid out. */
    getTransform = () => this._transform;
}

/**
 * Represents an edge between nodes of a directed acyclic graph.
 */
class DagEdge {
    /**
     * Constructor. Should only be called by `DagBuilder`.
     *
     * @param {number} id
     *      A unique identifier for this edge among all edges in the graph.
     * @param {DagNode} startNode
     *      The `DagNode` at which this edge begins.
     * @param {number} startPortNum
     *      The index of the port on `startNode` from which this edge originates; higher means further right.
     * @param {DagNode} endNode
     *      The `DagNode` at which the edge ends.
     */
    constructor(id, startNode, startPortNum, endNode) {
        this._id = id;
        this._groupId = null;
        this._startNode = startNode;
        this._startPort = startPortNum;
        this._endNode = endNode;
        this._transform = {
            points: null,
            z: null,
        };
        this._metadata = {};

        this._isLateral = this._checkIsLateral();
    }

    // Fully public methods
    // --------------------
    // These functions can be called by clients, the `DagBuilder`, and the layout engine.
    /** Returns the edge's unique ID among all edges in the graph. */
    getId = () => this._id;
    /** Returns the `DagNode` at which the edge starts. */
    getStartNode = () => this._startNode;
    /** Returns the index of the port on the starting node at which this edge begins. */
    getStartPort = () => this._startPort;
    /** Returns the `DagNode` at which the edge ends. */
    getEndNode = () => this._endNode;
    /** Returns whether the edge crosses the boundary between two lateral nodes. */
    getIsLateral = () => this._isLateral;

    // Client-only methods
    // -------------------
    // These functions should only be called by clients, not `DagBuilder` instances or the layout engine, since they
    // relate to client-specific metadata.
    /** Returns a mapping of keys to values, as set by `addMetadata()`, for clients to use. */
    getMetadata = () => this._metadata;

    /**
     * Adds an arbitrary key-value pair to this object's metadata, to be set and used only by clients.
     *
     * Clients often will need to attach information to an edge so that they can properly render and interact with it;
     * the metadata objects allows for this in a way that keeps that information tied to the object but prevents
     * information leakage to the `DagBuilder` or the layout engine.
     *
     * @param {string} key
     *      Any key value.
     * @param {any} value
     *      Any value to associate with `key`.
     */
    addMetadata(key, value) {
        this._metadata[key] = value;
    }

    /**
     * Assigns the edge to a group of edges with shared `groupId`, where all edges in a group should overlap where
     * possible.
     *
     * In some graphs (such as computation graphs), edges represent some object being passed from one node to another.
     * When multiple edges represent the same object, it is often desirable to "unify" these edges, making multiple
     * edges appear as one. It is ultimately up to the layout engine to use the edge's `groupId` to change layout
     * decisions, and there is no guarantee of consistent overlap.
     *
     * @param {string} groupId
     *      An ID, where all edges with the same `groupId` should be unified where possible.
     */
    unifyWith(groupId) {
        this._groupId = groupId;
    }

    // Engine-only methods
    // -------------------
    // These functions should only be called by the layout engine, not clients or the `DagBuilder`, since they modify
    // position of the edge.
    /** Returns a string group ID, where edges with the same group ID should overlap where possible. */
    getGroupId = () => this._groupId;

    /**
     * Set the path and z-order of the edge for rendering.
     *
     * @param {number} z
     *      The z-order of the edge; nodes and edges with higher z-order are shown above those with lower.
     * @param {array} points
     *      A sequence of {x: number, y: number} objects indicating the pixel coordinates through which the edge should
     *      travel.
     */
    setTransform(z, points) {
        this._transform = {
            z,
            points,
        };
    }

    // Engine- and client-only methods
    // -------------------------------
    // These functions should not be called by the `DagBuilder`, as they convey position information that the
    // `DagBuilder` should not be aware of.
    /** Returns the edge's path and its z-order, in the form {points: array, z: number}. */
    getTransform = () => this._transform;

    // Internal methods
    // ----------------
    /**
     * Returns whether the edge crosses the boundary between two laterally-aligned nodes.
     *
     * If the nodes themselves are lateral, or their first lateral ancestors are not the same, then this function
     * returns `true`. If the nodes have no lateral ancestors at all, it returns `false`.
     *
     * @returns {boolean}
     *      Whether the edge crosses the boundary between lateral nodes.
     * @private
     */
    _checkIsLateral() {
        let n1 = this._startNode;
        let n2 = this._endNode;
        const commonAncestor = n1.getCommonAncestor(n2);
        // Iterate until the common ancestor or a lateral node is reached
        while (n1 !== null && n1 !== commonAncestor && !n1.getIsLateral()) {
            n1 = n1.getParent();
        }
        // Iterate until the common ancestor or a lateral node is reached
        while (n2 !== null && n2 !== commonAncestor && !n2.getIsLateral()) {
            n2 = n2.getParent();
        }
        return n1 !== n2;
    }
}

/**
 * This JS object stores a hierarchical directed acyclic graph and lays it out whenever its state changes.
 */
class DagBuilder {
    // An array of `DagNode` objects
    nodes = [];
    // An array of `DagEdge` objects
    edges = [];

    /**
     * Constructor.
     *
     * @param {function} onLayout
     *      A function with signature `(graphWidth, graphHeight, nodes, edges)`, where `nodes` is an array of `DagNode`
     *      objects with assigned transforms and `edges` is an array of `DagEdge` objects with assigned transforms.
     *      Executed whenever the graph is laid out, such as after a change of graph state.
     */
    constructor(onLayout) {
        // Whether the graph has been built by the client for the first time; only lays out the graph when the state
        // changes after the first build
        this._built = false;
        // A function accepting `(graphWidth, graphHeight, nodes, edges)` to be called with the laid-out graph whenever
        // layout completes
        this._onLayout = onLayout;
    }

    // =================================================================================================================
    // `DagNode` inherited functions
    // -----------------------------
    // `DagNode` objects which are part of this graph receive these functions as parameters, calling them to create new
    // nodes and edges.
    // =================================================================================================================

    /**
     * Creates a new node as the child of `parentNode`.
     *
     * This function is passed to all created `DagNode` objects; when `DagNode.addChild()` is called, it calls this
     * function to actually create the new node.
     *
     * @param {DagNode} parentNode
     *      The parent node of the newly created node.
     * @param {number} lateralStep
     *      The position of the new node in a series of lateral nodes, or -1 if the node is not part of a lateral node
     *      series.
     * @returns {DagNode}
     *      A newly created `DagNode` which is the child of `parentNode`.
     * @private
     */
    _addChildNode(parentNode, lateralStep) {
        const node = new DagNode(this.nodes.length, lateralStep, parentNode);
        node.init(
            (lateralStep) => this._addChildNode(node, lateralStep),
            (startPortNum, endNode) => this._addEdge(node, startPortNum, endNode),
            () => (this._built ? this.build() : null),
        );
        this.nodes.push(node);
        return node;
    }

    /**
     * Creates a new edge between two nodes.
     *
     * Edges should be created by calling `addEdge()` on a `DagNode`. When that occurs, this function is called, which
     * actually creates the new `DagEdge` object.
     *
     * @param {DagNode} startNode
     *      The node from which the edge begins.
     * @param {number} startPortNum
     *      The index of the port on `startNode` from which the edge begins; higher index indicates further to the
     *      right.
     * @param {DagNode} endNode
     *      The node at which the edge ends.
     * @returns {DagEdge}
     *      A `DagEdge` representing the connection between the nodes.
     * @private
     */
    _addEdge(startNode, startPortNum, endNode) {
        const edge = new DagEdge(this.edges.length, startNode, startPortNum, endNode);
        this.edges.push(edge);
        return edge;
    }

    // =================================================================================================================
    // Public API
    // ----------
    // Any nodes without parent nodes should be added with `addNode()`; their descendants should be added to their
    // respective parents with `DagNode.addNode()`, and any edges added with `DagNode.addEdge()`. Once all nodes and
    // edges have been added, `build()` should be called once by the client, laying out the graph and executing a
    // callback function whenever the graph state is subsequently changed.
    // =================================================================================================================

    /**
     * Creates a node that is a child of no other node.
     *
     * Any node that is nested in another node should be created by calling `DagNode.addNode()` on the parent; if the
     * node should have no parent, then this function should be called.
     *
     * @param {number} lateralStep
     *      The index of the new node in a series of lateral nodes, or -1 if the node is not part of a lateral series.
     * @returns {DagNode}
     *      A `DagNode` which is a child of no other nodes.
     */
    addNode(lateralStep) {
        return this._addChildNode(null, lateralStep);
    }

    /**
     * Lays out the graph. If called for the first time, any subsequent changes to graph state will also call `build()`.
     *
     * After the graph is laid out, the callback function supplied in the constructor is called with the new graph's
     * properties as arguments.
     */
    build() {
        console.debug('DagBuilder -- laying out graph');
        this._built = true;
        layoutElkGraph(
            getElkGraph(this.nodes, this.edges),
            (graphWidth, graphHeight, nodeTransforms, edgeTransforms) => {
                this.nodes.forEach((node) => {
                    if (node.getId() in nodeTransforms) {
                        const { x, y, z, width, height } = nodeTransforms[node.getId()];
                        node.setTransform(x, y, z, width, height);
                    }
                });
                this.edges.forEach((edge) => {
                    if (edge.getId() in edgeTransforms) {
                        const { z, points } = edgeTransforms[edge.getId()];
                        edge.setTransform(z, points);
                    }
                });
                this._onLayout(
                    graphWidth,
                    graphHeight,
                    this.nodes.filter((node) => node.getId() in nodeTransforms),
                    this.edges.filter((edge) => edge.getId() in edgeTransforms),
                );
            },
        );
    }
}

export default DagBuilder;
