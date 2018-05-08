'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withStyles } from 'material-ui/styles';
import { createSelector } from "reselect";
import ELK from 'elkjs';

import { ensureGraphLoadedActionThunk } from "../../../actions/program";
import { setInViewerPayloadAction, addViewerActionThunk } from '../../../actions/canvas';
import { makeGetElkGraphFromHead, layoutGraph } from "./layout";

import GraphOpNode from './GraphOpNode';
import GraphDataEdge from './GraphDataEdge';
import GraphDataNode from './GraphDataNode';
import GraphContainerNode from './GraphContainerNode';

import Typography from 'material-ui/Typography';
import { CircularProgress } from 'material-ui/Progress';
import List, { ListItem, ListItemIcon } from 'material-ui/List';
import DropDownIcon from 'material-ui-icons/ArrowDropDown';
import NotInterestedIcon from 'material-ui-icons/NotInterested';
import Collapse from 'material-ui/transitions/Collapse';
import ColorGrey from 'material-ui/colors/grey';
import ColorBlue from "material-ui/colors/blue";
import ColorBlueGrey from "material-ui/colors/blueGrey";


/**
 * This smart component builds and contains all the components of a computation graph.
 * The `payload` prop:
 * {
 *      graphState: {
 *          symbolId: {
 *              expanded: false,
 *          },
 *          ...
 *      },
 *      graph: {
 *          id: 'root',
 *          children: [{...}, {...}],
 *          edges: [{...}, {...}],
 *      },
 *      stateChanged: false,
 *      graphLoaded: false,
 * }
 */
class GraphViewer extends Component {

    /** Prop expected types object. */
    static propTypes = {
        viewerId:           PropTypes.number.isRequired,
        symbolId:           PropTypes.string.isRequired,
        payload:            PropTypes.object.isRequired,

        classes:            PropTypes.object.isRequired,
        graphSkeleton:      PropTypes.object,
        ensureGraphLoaded:  PropTypes.func.isRequired,
        setInPayload:       PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            selectedIds: [],
            hoverIds: [],
            isInspectorExpanded: true,
            expandedArgListItems: new Set(),
        };
        this.setSelectedId = this.setSelectedId.bind(this);
        this.setHoverId = this.setHoverId.bind(this);
    }

    componentDidMount() {
        let { ensureGraphLoaded, symbolId, viewerId } = this.props;
        ensureGraphLoaded(symbolId, viewerId);
    }

    /**
     * If the viewer is receiving new nodes or edges (generated by `makeGetElkGraphFromHead()`), then it lays out the graph
     * in a promise and updates the Redux store when complete.
     *
     * @param nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { graphSkeleton, viewerId, setInPayload } = this.props;
        let { graphSkeleton: nextGraphSkeleton } = nextProps;
        let { stateChanged } = nextProps.payload;
        if (nextGraphSkeleton && (!graphSkeleton || stateChanged)) {
            setInPayload(viewerId, ['stateChanged'], false);
            let elk = new ELK();
            layoutGraph(elk, nextGraphSkeleton, viewerId, setInPayload);
            this.setState({
                selectedIds: [],
                hoverIds: [],
            });
        }
    }

    setSelectedId(id) {
        this.setState(prev => ({
            selectedIds: id ? [id] : [],
        }));
    }

    setHoverId(id) {
        this.setState(prev => ({
            hoverIds: id ? prev.hoverIds.concat([id]) : [],
        }));
    }

    toggleInspectorExpanded() {
        this.setState(prev => ({
            isInspectorExpanded: !prev.isInspectorExpanded,
        }));
    }

    /**
     * Recursively adds new `GraphDataEdge` components to the `components` array.
     *
     * @param elkNode
     *     An ELK node object which contains at least `x` and `y` fields, as well as an array of edge objects. Each
     *     edge has a list of source port ids (of length exactly one) and a list of target port ids (also of length
     *     exactly one). Note that node ids (different from port ids) are of the form
     *         [0-9]?{symbolId}
     *     where the leading digit is only added if the same symbol appears in multiple nodes (like if it is a leaf
     *     in multiple temporal containers). A port id is of the form
     *         {nodeId}_{portNumber}
     *     The edge also contains an array `sections`, also of length exactly one (ELK supports hyperedges, hence
     *     why everything is a list). This section object has a start point and an end point, as well as an array
     *     of bend points, indicating points the final edge should pass through.
     * @param components
     *     The list to which new edge components should be added.
     * @param offset
     *     The position offset at which new edges should be rendered. Edge positions are relative, so we must
     *     maintain an offset value to position them globally. Edges aren't just offset from their parent node,
     *     however. An edge is stored in the node which is the first common ancestor of the edge's source and its
     *     target. For edges that connect a container to one of its children, this means that only the container is
     *     in `elkNode`'s children, while the target is stored in the container's node  object. In this case, the
     *     edge is offset not by `elkNode`'s position, but by the position of the container node.
     */
    buildEdgeComponents(edges) {
        const { viewerId } = this.props;
        const { selectedIds } = this.state;
        return edges.map(edge => {
            const { key, points, zOrder, isTemporal, viewerObj, sourceSymbolId, targetSymbolId, argName } = edge;
            const edgeId = viewerId + key;
            const layoutObj = {
                points,
                zOrder,
                isTemporal,
                sourceSymbolId,
                targetSymbolId,
                argName,
                setSelected:    () => this.setSelectedId(selectedIds.includes(viewerObj.symbolId) ? null : viewerObj.symbolId),
                setHover:       (isHovered = true) => this.setHoverId(isHovered ? viewerObj.symbolId : null),
                selectedIds:    this.state.selectedIds,
                hoverIds:       this.state.hoverIds,
            };
            return ({
                component: <GraphDataEdge key={key} edgeId={edgeId} {...viewerObj} {...layoutObj} />,
                zOrder,
            });
        });
    }

    /**
     * Recursively builds node components and adds them to `components`.
     *
     * @param elkNode
     *     A node in the ELK graph, containing a (possibly empty) list of child nodes as well as `width`, `height`,
     *     `x`, `y`, and `viewerObj` fields. `viewerObj` contains the properties needed to render the node (type,
     *     name, str, symbolId, and data.viewer).
     * @param components
     *     The array to which node components should be added.
     * @param offset
     *     The pixel offset at which the component should be rendered. ELK uses relative positioning, meaning that a
     *     node's global position should be equal to its parent's global position, plus the node's `x` and `y` values.
     */
    buildNodeComponents(nodes) {
        const { selectedIds } = this.state;
        return nodes.map(node => {
            const { type, key, viewerObj, x, y, width, height, zOrder, isTemporal, isExpanded } = node;
            const layoutProps = {
                width,
                height,
                x,
                y,
                isTemporal,
                isExpanded,
            };
            const interactionProps = {
                setSelected:    () => this.setSelectedId(selectedIds.includes(viewerObj.symbolId) ? null : viewerObj.symbolId),
                setHover:       (isHovered = true) => this.setHoverId(isHovered ? viewerObj.symbolId : null),
                selectedIds:    this.state.selectedIds,
                hoverIds:       this.state.hoverIds,
            };

            switch(type) {
                case 'graphdata':
                    return ({
                        component: <GraphDataNode key={key} {...viewerObj} {...layoutProps} {...interactionProps} />,
                        zOrder,
                    });

                case 'graphop':
                    return ({
                        component: <GraphOpNode key={key} {...viewerObj} {...layoutProps} {...interactionProps}/>,
                        zOrder,
                    });

                case 'graphcontainer':
                    return ({
                        component: <GraphContainerNode key={key} {...viewerObj} {...layoutProps} {...interactionProps}
                                                       toggleExpanded={() => this.toggleExpanded(viewerObj.symbolId)} />,
                        zOrder,
                    });
            }
        });
    }

    toggleArgListItemSelected(itemKey) {
        const { expandedArgListItems } = this.state;
        if (expandedArgListItems.has(itemKey)) {
            expandedArgListItems.delete(itemKey);
        }
        else {
            expandedArgListItems.add(itemKey);
        }
        this.setState({
            expandedArgListItems,
        });
    }

    getKeyValueComponents(classes, symbolId) {
        const { symbolTable } = this.props;
        return symbolId ? Object.entries(symbolTable[symbolId].data.viewer.kvpairs).map(([key, value]) => {
            return this.symbolIdToListItem(classes, value, key, symbolId);
        }) : [];
    }


    // TODO make item naming unique, or refresh set each time
    getArgListItem(classes, argName, argSymbolId, opName, i=-1) {
        const { expandedArgListItems } = this.state;
        const keyValueComponents = this.getKeyValueComponents(classes, argSymbolId);
        const itemName = `${argName}${i >= 0 ? `[${i}]` : ''}`;
        const itemIsTracked = typeof argSymbolId !== 'undefined';
        const itemKey = `${argSymbolId}:${argName}:${i}:${opName ? opName : ''}`;
        const expanded = expandedArgListItems.has(itemKey);
        const onClick = (e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            if (itemIsTracked)
                this.toggleArgListItemSelected(itemKey);
        };
        return (
            <div key={itemKey}>
                <ListItem button
                          className={classes.argItem}
                          onClick={onClick}>
                    <ListItemIcon onClick={onClick} className={classes.arrows}>
                        {itemIsTracked ?
                            (expanded ? <DropDownIcon/> : <DropDownIcon className={classes.rotated}/>) : (<NotInterestedIcon/>)}
                    </ListItemIcon>
                    <span className={classes.argItemText}>
                        <span className={classes.argItemLabel}>{itemName}</span>
                        <span className={classes.argItemDetail}>{opName ? ` (${opName})` : ''}</span>
                    </span>
                </ListItem>
                <Collapse in={expanded} timeout={50}>
                    <List className={classes.inspectorList} dense>
                        {keyValueComponents}
                    </List>
                </Collapse>
            </div>
        );
    }

    argArrToListItems(classes, argArr, opName=null) {
        let arr = [];
        const [ argName, argVal ] = argArr;
        if (Array.isArray(argVal)) {
            argVal.forEach((arg, i) => {
                arr.push(this.getArgListItem(classes, argName, arg, opName, i))
            });
        }
        else {
            arr.push(this.getArgListItem(classes, argName, argVal, opName))
        }
        return arr;
    }

    symbolIdToListItem(classes, symbolId, itemLabel=null, keyPrefix='') {
        const { addViewerToCanvas, symbolTable } = this.props;
        let onClick = () => symbolId ? addViewerToCanvas(symbolId) : {};
        let str = symbolId ? symbolTable[symbolId].str : 'None';
        let key = `${keyPrefix}:${(itemLabel ? itemLabel : '')}:${symbolId}`;
        return (
            <ListItem button
                  className={classes.symbolItem}
                  onClick={onClick}
                  key={key}>
                    <span className={classes.symbolItemText} >
                        <span className={classes.symbolItemLabel}>{itemLabel}</span>
                        <span className={classes.symbolItemSeparator}>{itemLabel ? ': ' : null}</span>
                        <span className={classes.symbolItemString}>{str}</span>
                    </span>
            </ListItem>
        );
    }

    buildInspectorList(classes, listName, listItems) {
        return (
            <div>
                <Typography className={classes.inspectorLabel} variant="caption">{listName}</Typography>
                <List dense component={'nav'} className={classes.inspectorList}>
                    {listItems}
                </List>
            </div>
        );
    }

    // TODO is there abetter way to build this? e.g. factor out stuff?
    buildInspectorComponent(classes, symbolId) {
        const { symbolTable } = this.props;
        const symbolObj = symbolTable[symbolId];
        if (symbolObj) {
            const { name, type } = symbolObj;
            if (type === 'graphop') {
                const { args, kwargs, functionname, outputs } = symbolObj.data.viewer;

                let argComponent = null;
                if (args.length > 0) {
                    let argListItems = [];
                    args.forEach(argArr => argListItems = argListItems.concat(this.argArrToListItems(classes, argArr)));
                    argComponent = this.buildInspectorList(classes, 'Positional Args', argListItems);
                }

                let kwargComponent = null;
                if (kwargs.length > 0) {
                    let kwargListItems = [];
                    kwargs.forEach(argArr => kwargListItems = kwargListItems.concat(this.argArrToListItems(classes, argArr)));
                    kwargComponent = this.buildInspectorList(classes, 'Keyword Args', kwargListItems);
                }

                let outputComponent = null;
                if (outputs.length > 0) {
                    let outputListItems = outputs.map(symbolId => this.symbolIdToListItem(classes, symbolId));
                    outputComponent = this.buildInspectorList(classes, 'Outputs', outputListItems);
                }
                return (
                    <div className={classes.inspector}>
                        <Typography className={classes.inspectorLabel} variant="caption">Function Name</Typography>
                        <span className={classes.inspectorText}>{functionname}</span>
                        {argComponent}
                        {kwargComponent}
                        {outputComponent}
                    </div>
                );
            }
            if (type === 'graphdata') {
                let nameComponent = name ? (
                    <div>
                        <Typography className={classes.inspectorLabel} variant="caption">Object Name</Typography>
                        <span className={classes.inspectorText}>{name}</span>
                    </div>) : null;

                return (
                    <div className={classes.inspector}>
                        {nameComponent}
                        {this.buildInspectorList(classes, 'Data', this.getKeyValueComponents(classes, symbolId))}
                    </div>
                )
            }
            if (type === 'graphcontainer') {
                const { functionname, contents } = symbolObj.data.viewer;

                let argComponent = null;
                let argListItems = [];
                let opNameAppearances = {};
                for (let i=0; i < contents.length; i++) {
                    let contentSymbolId = contents[i];
                    const { functionname, args } = symbolTable[contentSymbolId].data.viewer;
                    if (!(functionname in opNameAppearances)) {
                        opNameAppearances[functionname] = 0;
                    }
                    if (args && args.length > 0) {  // could be container
                        args.forEach(argArr => argListItems = argListItems.concat(this.argArrToListItems(classes, argArr, `${functionname}[${opNameAppearances[functionname]}]`)));
                        opNameAppearances[functionname] += 1;
                    }
                }
                if (argListItems.length > 0) {
                    argComponent = this.buildInspectorList(classes, 'Positional Args', argListItems);
                }

                return (
                    <div className={classes.inspector}>
                        <Typography className={classes.inspectorLabel} variant="caption">Function Name</Typography>
                        <span className={classes.inspectorText}>{functionname}</span>
                        {argComponent}
                    </div>
                );
            }
        }
    };

    toggleExpanded(symbolId) {
        let { setInPayload, viewerId } = this.props;
        let { expanded } = this.props.payload.graphState[symbolId];
        setInPayload(viewerId, ['graphState', symbolId, 'expanded'], !expanded);
        setInPayload(viewerId, ['stateChanged'], true);
    }

    /**
     * Renders all of the graph's op and data components, laid out by ELK. Additionally, displays an inspector fixed to
     * the bottom of the frame that displays the hover/selected item's info.
     */
    render() {
        const { classes, payload } = this.props;
        const { graph } = payload;
        if (!graph) {
            return (
                <div className={classes.container}>
                    <div className={classes.progress}>
                        <CircularProgress />
                    </div>
                </div>
            );
        }

        let graphComponents = this.buildNodeComponents(graph.nodes).concat(this.buildEdgeComponents(graph.edges));
        graphComponents = graphComponents.asMutable().sort(({zOrder: z1}, {zOrder: z2}) => z1 - z2).map(({component}) => component);

        const inspectorId = this.state.selectedIds[0];
        let inspectorComponent = this.buildInspectorComponent(classes, inspectorId);

        let buildArrowheadMarker = (id, color) => (
            <marker id={id} viewBox="-5 -3 5 6" refX="0" refY="0"
                    markerUnits="strokeWidth" markerWidth="4" markerHeight="3" orient="auto">
                <path d="M 0 0 l 0 1 a 32 32 0 0 0 -5 2 l 1.5 -3 l -1.5 -3 a 32 32 0 0 0 5 2 l 0 1 z" fill={color} />
            </marker>
        );

        return (
            <div className={classes.container}>
                <div className={classes.graph}>
                    <svg width={graph.width} height={graph.height}>
                        <defs>
                            {buildArrowheadMarker("arrowheadGrey", ColorGrey[600])}
                            {buildArrowheadMarker("arrowheadBlue", ColorBlue[600])}
                        </defs>
                        <rect x={0} y={0} width={graph.width} height={graph.height} fill="transparent"
                              onClick={() => this.setSelectedId(null)}/>
                        {graphComponents}
                    </svg>
                </div>
                {inspectorComponent}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = theme => ({
    container: {
        flex: 1,  // expand to fill frame vertical

        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',  // along main axis (horizontal)
        alignItems: 'stretch',  // along cross axis (vertical)
        overflow: 'hidden',
    },
    progress: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    graph: {
        flex: 'auto',  // makes graph fill remaining space so sidebar is on side
        overflow: 'auto',
        textAlign: 'left', // so SVG doesn't move
    },
    inspector: {
        minWidth: 150,
        overflow: 'auto',

        boxSizing: 'border-box',
        backgroundColor: ColorGrey[50],
        borderLeftWidth: 1,
        borderLeftStyle: 'solid',
        borderLeftColor: ColorGrey[200],
        fontSize: '9pt',
        textAlign: 'left',
    },
    inspectorLabel: {
        paddingTop: 8,
        paddingLeft: 12,
    },
    inspectorText: {
        paddingLeft: 12,
        fontFamily: theme.typography.monospace.fontFamily,
    },
    inspectorList: {
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 0,
        paddingBottom: 0,
    },
    argItem: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    argItemText: {
        overflow:'hidden',
        textOverflow:'ellipsis',
        whiteSpace:'nowrap',
        width: '100%',
        fontFamily: theme.typography.monospace.fontFamily,
    },
    argItemLabel: {

    },
    argItemDetail: {
        fontStyle: 'italic',
        fontSize: '7pt',
        color: ColorBlueGrey[300],
    },
    symbolItem: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    symbolItemText: {
        overflow:'hidden',
        textOverflow:'ellipsis',
        whiteSpace:'nowrap',
        width: '100%',
        marginLeft: '8px',
        fontFamily: theme.typography.monospace.fontFamily,
    },
    symbolItemLabel: {
    },
    symbolItemSeparator: {
    },
    symbolItemString: {
        color: ColorBlueGrey[500],
    },
    icon: {
        visibility: 'hidden',
    },
    itemhover: {
        '&:hover $icon': {
            visibility: 'inherit',
        }
    },
    arrows: {
        height: 15,
        width: 15,
        marginLeft: '-10px',
        marginRight: 0,
    },
    rotated: {
        transform: 'rotate(-90deg)',
    },
});

// To inject application state into component
// ------------------------------------------

/** Connects application state objects to component props. */
function makeMapStateToProps() {
    const getGraphFromHead = makeGetElkGraphFromHead();
    return (state, props) => {
        return {
            graphSkeleton: getGraphFromHead(state, props),
            symbolTable: state.program.symbolTable,  // TODO be smarter about how much of the symbol table we need
        }
    }
}

/** Connects bound action creator functions to component props. */
function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        ensureGraphLoaded: ensureGraphLoadedActionThunk,
        setInPayload: setInViewerPayloadAction,
        addViewerToCanvas: addViewerActionThunk,
    }, dispatch);
}

export default connect(makeMapStateToProps, mapDispatchToProps)(withStyles(styles)(GraphViewer));