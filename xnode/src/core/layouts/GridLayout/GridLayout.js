// @flow
import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { createSelector } from 'reselect';

import Viewer from '../../Viewer/Viewer';
import type { ViewerToViewerProps } from '../../Viewer/Viewer';
import ColorLightBlue from '@material-ui/core/colors/lightBlue';

import type { ViewId } from '../../schema';
import type {Event, InteractionMessage} from "../../interaction";

type GridLayoutProps = {
    /** CSS-in-JS styling object. */
    classes: any,

    lastEvent?: Event,
    publishEvent: (eventName: string, message: InteractionMessage) => void,

    viewerToViewerProps: ViewerToViewerProps,

    /** Elements of the sequence that serve as props to `Viewer` sub-components. */
    elements: {
       viewId: ViewId,
       col: number,
       row: number,
       width: number,
       height: number,
    }[],
}

type GridLayoutState = {
    isHovered: boolean,
}

/**
 * This pure dumb component renders visualization for a 1D sequence of elements.
 * TODO: Allow multi-line wrapping elements.
 * TODO: Allow element-type-specific background coloring.
 * TODO: Merge with MatrixLayout to form generic RowColLayout
 */
class GridLayout extends React.PureComponent<GridLayoutProps, GridLayoutState> {
    /** Prop default values. */
    static defaultProps = {};

    constructor(props: GridLayoutProps) {
        super(props);
        this.state = {
            isHovered: false,
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const { lastEvent } = this.props;
        if (prevProps.lastEvent !== lastEvent && lastEvent !== undefined && lastEvent !== null) {
            const { eventName } = lastEvent;
            if (eventName === 'hover') {
                this.setState({
                    isHovered: true,
                })
            }
            if (eventName === 'unhover') {
                this.setState({
                    isHovered: false,
                })
            }
        }
    }
    /**
     * Renders a sequence of `Viewer` elements, optionally numbered with indices. The sequence can
     * have start/end motifs, which are large characters that can be used to indicate a type of
     * sequence (e.g. "{" for sets).
     */
    render() {
        const { classes, elements, publishEvent, viewerToViewerProps } = this.props;
        const { isHovered } = this.state;

        // TODO: don't repeat this in every view
        const mouseProps = {
            onClick: (e) => {
                e.stopPropagation();
                publishEvent('click', {});
            },
            onMouseOver: (e) => {
                e.stopPropagation();
                publishEvent('mouseOver', {});
            },
            onMouseOut: (e) => {
                e.stopPropagation();
                publishEvent('mouseOut', {});
            },
        };

        return (
            <div
                className={classNames({
                    [classes.grid]: true,
                    [classes.hoveredGrid]: isHovered,
                })}
                {...mouseProps}
            >
                {elements.map(({viewId, col, row, width, height}) => {
                    return (
                        <div
                            key={viewId}
                            className={classNames({
                                [classes.cell]: true,
                                [classes.hoveredCell]: isHovered,
                            })}
                            style={{
                                gridColumn: `${col + 1} / ${col + 1 + width}`,
                                gridRow: `${row + 1} / ${row + 1 + height}`,
                            }}
                        >
                            <Viewer {...viewerToViewerProps} viewId={viewId} />
                        </div>
                    );
                })}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling function. */
const styles = (theme) => ({
    grid: {
        display: 'inline-grid',
        verticalAlign: 'middle',
        gridGap: `${theme.spacing.large}px`, // Need px.
        justifyContent: 'start',
        gridAutoColumns: 'max-content',
        gridAutoRows: 'max-content',
        borderStyle: theme.shape.border.style,
        borderWidth: theme.shape.border.width,
        borderRadius: theme.shape.border.radius,
        borderColor: theme.palette.atom.border,
        padding: theme.spacing.unit,
    },
    compactGrid: {
        gridGap: `${theme.spacing.large}px`, // Need px.
    },
    hoveredGrid: {
        borderColor: theme.palette.primary.light,
    },
    cell: {
        textAlign: 'left',
    },
    hoveredCell: {},
});

export default withStyles(styles)(GridLayout);
