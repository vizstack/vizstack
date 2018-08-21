'use babel';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';
import { line, curveBasis, curveLinear } from 'd3';

import ColorGrey from '@material-ui/core/colors/grey';
import ColorBlue from '@material-ui/core/colors/blue';
import classNames from "classnames";
import ColorLightBlue from "@material-ui/core/colors/lightBlue";


const kArrowStroke = 600;
const kNodeFill = 200;

/**
 * This pure dumb component renders a graph node as an SVG component that responds to mouse events based on prop values.
 */
class DagNode extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        color: PropTypes.object.isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        label: PropTypes.string,
        isHovered: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        isExpanded: PropTypes.bool.isRequired,
        onClick: PropTypes.func,
        onDoubleClick: PropTypes.func,
        onMouseEnter: PropTypes.func,
        onMouseLeave: PropTypes.func,
    };

    render() {
        const { classes, color, width, height, x, y, label, isHovered, isSelected, isExpanded,
            onClick, onDoubleClick, onMouseEnter, onMouseLeave } = this.props;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} style={{fill: color[kNodeFill]}}
                      className={classNames({
                          [classes.node]:           true,
                          [classes.nodeSmooth]:     isExpanded,
                          [classes.nodeCollapsed]:  !isExpanded,
                          [classes.nodeHovered]:    isHovered,
                          [classes.nodeSelected]:   isSelected,
                      })}
                      onClick={onClick}
                      onDoubleClick={onDoubleClick}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave} />

                <foreignObject x={x} y={y} width={width} height={height} pointerEvents="none">
                    <div className={classes.nodeLabel}>
                        {isExpanded ? null : label}
                    </div>
                </foreignObject>
            </g>
        );
    }
}

/**
 * This pure dumb component renders a graph edge as an SVG component that responds to mouse events based on prop values.
 */
class DagEdge extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        id: PropTypes.number.isRequired,
        baseColor: PropTypes.object.isRequired,
        selectedColor: PropTypes.object.isRequired,
        points: PropTypes.array.isRequired,
        isCurved: PropTypes.bool.isRequired,
        isBackground: PropTypes.bool.isRequired,
        isHovered: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        isOtherActive: PropTypes.bool.isRequired,
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func,
        onDoubleClick: PropTypes.func,
        onMouseEnter: PropTypes.func,
        onMouseLeave: PropTypes.func,
    };

    render() {
        const { classes, id, baseColor, selectedColor, points, isCurved, isBackground, isHovered, isSelected, isOtherActive,
            label, onClick, onDoubleClick, onMouseEnter, onMouseLeave } = this.props;
        let pathString = null;
        if (isCurved) {
            let curveGenerator = line().curve(curveBasis);
            pathString = curveGenerator(points.map(({x, y}) => [x, y]));  // [{x:3, y:4},...] => [[3, 4],...]
        }
        else {
            let linearGenerator = line().curve(curveLinear);
            pathString = linearGenerator(points.map(({x, y}) => [x, y]));  // [{x:3, y:4},...] => [[3, 4],...]
        }

        // Edge id needs to be globally unique, not just within this svg component
        return (
            <g>
                <path d={pathString}
                      className={classNames({
                          [classes.edgeHotspot]: true,
                      })}
                      onClick={onClick}
                      onDoubleClick={onDoubleClick}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave} />
                <path id={id}
                      d={pathString}
                      pointerEvents="none"
                      style={{
                          stroke: isSelected ? selectedColor[kArrowStroke] : baseColor[kArrowStroke],
                          markerEnd: isSelected? `url(#arrowheadSelected${id})` : `url(#arrowheadBase${id})`,
                      }}
                      className={classNames({
                          [classes.edge]:               true,
                          [classes.edgeBackground]:     isBackground,
                          [classes.edgeIsOtherActive]:  isOtherActive,
                          [classes.edgeHovered]:        isHovered,
                          [classes.edgeSelected]:       isSelected,
                      })} />
                <text dy="-1.5"
                      textAnchor="end"
                      pointerEvents="none"
                      className={classNames({
                          [classes.edgeLabel]:          true,
                          [classes.edgeIsOtherActive]:  isOtherActive,
                          [classes.edgeLabelHovered]:   isHovered,
                          [classes.edgeLabelSelected]:  isSelected,
                      })} >
                    <textPath xlinkHref={`#${id}`} startOffset="95%">
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
class DagViz extends Component {

    /** Prop expected types object. */
    static propTypes = {
        /** CSS-in-JS styling object. */
        classes: PropTypes.object.isRequired,

        /** Data model rendered by this viewer. */
        model: PropTypes.object.isRequired,

        /** Optional interaction props for this viz. */
        onClick: PropTypes.func,
    };

    /**
     * Creates an array of `DagEdge` components and their respective z-orders to be rendered in the graph.
     *
     * @param {array} edges
     *      Sequence of objects whose keys and values should be passed directly to new `DagEdge` components as props.
     * @returns {array}
     *      Sequence of objects of form `{component: <DagEdge .../>, z: number}`.
     */
    buildEdgeComponents(edges) {
        const { classes } = this.props;
        return edges.map(edge => {
            return ({
                component: <DagEdge classes={classes} {...edge}  />,
                z: edge.z,
            });
        });
    }

    /**
     * Creates an array of `DagNode` components and their respective z-orders to be rendered in the graph.
     *
     * @param {array} nodes
     *      Sequence of objects whose keys and values should be passed directly to new `DagNode` components as props.
     * @returns {array}
     *      Sequence of objects of form `{component: <DagNode .../>, z: number}`.
     */
    buildNodeComponents(nodes) {
        const { classes } = this.props;
        return nodes.map(node => {
            return ({
                component: <DagNode classes={classes} {...node} />,
                z: node.z,
            });
        });
    }

    /**
     * Renders all of a Dag's edges and nodes.
     */
    render() {
        const { classes, model, graphHeight, graphWidth, onClick } = this.props;
        const { nodes, edges } = model;
        let graphComponents = this.buildNodeComponents(nodes).concat(this.buildEdgeComponents(edges));
        graphComponents = graphComponents.sort(({z: z1}, {z: z2}) => z1 - z2).map(({component}) => component);

        const buildArrowheadMarker = (id, color) => (
            <marker key={id} id={id} viewBox="-5 -3 5 6" refX="0" refY="0"
                    markerUnits="strokeWidth" markerWidth="4" markerHeight="3" orient="auto">
                <path d="M 0 0 l 0 1 a 32 32 0 0 0 -5 2 l 1.5 -3 l -1.5 -3 a 32 32 0 0 0 5 2 l 0 1 z" fill={color} />
            </marker>
        );

        const arrowheads = [];
        edges.forEach(edge => {
            arrowheads.push(buildArrowheadMarker(`arrowheadBase${edge.id}`, edge.baseColor[kArrowStroke]));
            arrowheads.push(buildArrowheadMarker(`arrowheadSelected${edge.id}`, edge.selectedColor[kArrowStroke]));
        });

        return (
            <div className={classes.container}>
                <div className={classes.graph}>
                    <svg width={graphWidth} height={graphHeight}>
                        <defs>
                            {arrowheads}
                        </defs>
                        <rect x={0} y={0} width={graphWidth} height={graphHeight} fill="transparent" onClick={onClick}/>
                        {graphComponents}
                    </svg>
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = theme => ({
    container: {
        flex: 1,  // expand to fill frame vertical

        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',  // along main axis (horizontal)
        alignItems: 'stretch',  // along cross axis (vertical)
        overflow: 'hidden',
    },
    graph: {
        flex: 'auto',  // makes graph fill remaining space so sidebar is on side
        overflow: 'auto',
        textAlign: 'left', // so SVG doesn't move
    },

    /*Edge*/
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

    /*Node*/
    node: {
        fillOpacity: 0.2,
        stroke: 'transparent',
        strokeWidth: 4,
        rx: 4,
        ry: 4,
    },
    nodeSmooth: {
        transition: [
            theme.transitions.create(['width', 'height', 'x', 'y'], { duration: theme.transitions.duration.short }),
            theme.transitions.create(['fill-opacity'], { duration: theme.transitions.duration.shortest, delay: theme.transitions.duration.short })
        ].join(", "),
    },
    nodeCollapsed: {
        fillOpacity: 1.0,
    },
    nodeHovered: {
        stroke: ColorLightBlue[400],
    },
    nodeSelected: {
        stroke: ColorBlue[600],
    },
    nodeLabel: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: 'white',
        userSelect: 'none',
    },
});

export default withStyles(styles)(DagViz)