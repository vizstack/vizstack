import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import cuid from 'cuid';
import { line, curveBasis, curveLinear } from 'd3';

/**
 * This pure dumb component renders a graph edge as an SVG component that responds to mouse events
 * based on prop values.
 */
type DagEdgeProps = {
    /** Edge point coordinates. */
    points: { x: number, y: number }[],

    /** Line style. */
    shape?: 'curve' | 'line',

    /** Line color palette. */
    color?: 'normal' | 'highlight' | 'lowlight' | 'selected',

    /** Text string to display on edge. */
    label?: string,

    /** Mouse event handlers which should be spread on the node. */
    mouseHandlers: {
        onClick?: (e: React.SyntheticEvent) => void,
        onDoubleClick?: (e: React.SyntheticEvent) => void,
        onMouseOver?: (e: React.SyntheticEvent) => void,
        onMouseOut?: (e: React.SyntheticEvent) => void,
    },
};

class DagEdge extends React.PureComponent<DagEdgeProps & InternalProps> {
    static defaultProps: Partial<DagEdgeProps> = {
        points: [],
        shape: 'line',
        color: 'normal',
    };

    private _xlinkId = cuid();

    render() {
        const { classes, points, shape, color, label, mouseHandlers } = this.props;

        if (!points) return null;

        // Create d3 path string
        let path = undefined;
        switch (shape) {
            case 'curve':
                path = line().curve(curveBasis)(points.map((p) => [p.x, p.y]));
                break;
            case 'line':
            default:
                path = line().curve(curveLinear)(points.map((p) => [p.x, p.y]));
                break;
        }

        return (
            <g>
                {/** Transparent hotspot captures mouse events in vicinity of the edge. */}
                <path
                    d={path || undefined}
                    className={clsx({
                        [classes.hotspot]: true,
                    })}
                    {...mouseHandlers}
                />
                <path
                    id={this._xlinkId}
                    d={path || undefined}
                    pointerEvents='none'
                    className={clsx({
                        [classes.edge]: true,
                        [classes.edgeHighlight]: color === 'highlight',
                        [classes.edgeLowlight]: color === 'lowlight',
                        [classes.edgeSelected]: color === 'selected',
                    })}
                />
                <text
                    dy='-1.5'
                    textAnchor='end'
                    pointerEvents='none'
                    className={clsx({
                        [classes.edgeLabel]: true,
                        [classes.edgeLabelHighlight]: color === 'highlight',
                        [classes.edgeLabelLowlight]: color === 'lowlight',
                        [classes.edgeLabelSelected]: color === 'selected',
                    })}
                >
                    <textPath xlinkHref={`#${this._xlinkId}`} startOffset='95%'>
                        {label}
                    </textPath>
                </text>
            </g>
        );
    }
}

const styles = (theme: Theme) => createStyles({
    edge: {
        fill: 'none',
        // stroke: theme.vars.selectable.normal,
        strokeWidth: 2.5,
        opacity: 1,
        markerEnd: 'url(#arrow-normal)',
    },
    hotspot: {
        fill: 'none',
        stroke: 'transparent',
        strokeWidth: 12,
    },
    edgeHighlight: {
        // stroke: theme.vars.selectable.highlight,
        strokeWidth: 3.5,
        markerEnd: 'url(#arrow-highlight)',
        opacity: 1,
    },
    edgeLowlight: {
        // stroke: theme.vars.selectable.lowlight,
        markerEnd: 'url(#arrow-lowlight)',
        opacity: 0.5,
    },
    edgeSelected: {
        // stroke: theme.vars.selectable.selected,
        strokeWidth: 3.5,
        markerEnd: 'url(#arrow-selected)',
    },
    edgeLabel: {
        opacity: 1,
        textAlign: 'right',
        // fontFamily: theme.fonts.monospace,
        // fontWeight: theme.typography.fontWeightMedium,
        fontSize: '7pt',
        userSelect: 'none',
    },
    edgeLabelHighlight: {
        opacity: 1,
    },
    edgeLabelLowlight: {
        opacity: 0.5,
    },
    edgeLabelSelected: {
        opacity: 1,
    },
});

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles)(DagEdge) as React.ComponentClass<DagEdgeProps>;