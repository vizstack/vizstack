import * as React from 'react';
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';
import cuid from 'cuid';
import { line, curveBasis, curveLinear } from 'd3';

import defaultTheme from '../../theme';

const kEdgeGap = 6;

/**
 * This pure dumb component renders a graph edge as an SVG component that responds to mouse events
 * based on prop values.
 */
type DagEdgeProps = {
    /** Edge point coordinates. */
    points: { x: number; y: number }[];

    /** Line style. */
    shape?: 'curve' | 'line';

    /** Line color palette. */
    light?: 'normal' | 'highlight' | 'lowlight' | 'selected';

    /** Text string to display on edge. */
    label?: string;

    /** Mouse event handlers which should be spread on the node. */
    mouseHandlers: {
        onClick?: (e: React.SyntheticEvent) => void;
        onDoubleClick?: (e: React.SyntheticEvent) => void;
        onMouseOver?: (e: React.SyntheticEvent) => void;
        onMouseOut?: (e: React.SyntheticEvent) => void;
    };
};

class DagEdge extends React.PureComponent<DagEdgeProps & InternalProps> {
    static defaultProps: Partial<DagEdgeProps> = {
        points: [],
        shape: 'line',
        light: 'normal',
    };

    private _xlinkId = cuid();

    render() {
        const { classes, shape, light, label, mouseHandlers } = this.props;
        let { points } = this.props;

        if (!points) return null;

        // Bump end of line to make room for sharp arrowhead
        if (points.length >= 2) {
            points = points.map(({ x, y }) => ({ x , y }));
            const [p, q] = points.slice(points.length - 2);
            const pq = { x : q.x - p.x, y: q.y - p.y };
            const dist = Math.pow(pq.x * pq.x + pq.y * pq.y, 0.5);
            if(dist > kEdgeGap) {
                q.x -= pq.x / dist * kEdgeGap;
                q.y -= pq.y / dist * kEdgeGap;
            }
        }

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
                {/* <path
                    d={path || undefined}
                    className={clsx({
                        [classes.hotspot]: true,
                    })}
                    {...mouseHandlers}
                /> */}
                <path
                    id={this._xlinkId}
                    d={path || undefined}
                    pointerEvents='none'
                    className={clsx({
                        [classes.edge]: true,
                        [classes.edgeHighlight]: light === 'highlight',
                        [classes.edgeLowlight]: light === 'lowlight',
                        [classes.edgeSelected]: light === 'selected',
                    })}
                />
                <text
                    dy='-1.5'
                    textAnchor='end'
                    pointerEvents='none'
                    className={clsx({
                        [classes.edgeLabel]: true,
                        [classes.edgeLabelHighlight]: light === 'highlight',
                        [classes.edgeLabelLowlight]: light === 'lowlight',
                        [classes.edgeLabelSelected]: light === 'selected',
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

const styles = (theme: Theme) =>
    createStyles({
        edge: {
            fill: 'none',
            stroke: theme.color.blue.base,
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

export default withStyles(styles, { defaultTheme })(DagEdge) as React.ComponentClass<DagEdgeProps>;
