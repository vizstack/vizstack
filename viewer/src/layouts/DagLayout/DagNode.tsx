import * as React from 'react';
import ReactDOM from "react-dom";
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

/** The pixel width of the interactive border surrounding expansible/collapsible nodes. */
const kBorderWidth = 8;
const kMargin = 10;
const kPadding = 5;

/**
 * This pure dumb component renders a graph node as an SVG component that contains a Viewer.
 */
type DagNodeProps = {
    /** React components within opening & closing tags. */
    children?: React.ReactNode;

    /** Position and size properties. */
    x: number;
    y: number;
    width: number;
    height: number;

    /** Expansion state. */
    isExpanded: boolean;
    isInteractive?: boolean;
    isVisible?: boolean;

    /** Mouse event handlers which should be spread on the interactive region of the node. */
    mouseHandlers: {
        onClick?: (e: React.SyntheticEvent) => void;
        onDoubleClick?: (e: React.SyntheticEvent) => void;
        onMouseOver?: (e: React.SyntheticEvent) => void;
        onMouseOut?: (e: React.SyntheticEvent) => void;
    };

    /** Whether the node should highlight if expanded and not invisible. */
    light: 'lowlight' | 'normal' | 'highlight' | 'selected';

    /** Callback on component resize. */
    onResize: (width: number, height: number) => void;
};

class DagNode extends React.PureComponent<DagNodeProps & InternalProps> {
    static defaultProps: Partial<DagNodeProps> = {
        isInteractive: true,
        isVisible: true,
    };

    content: HTMLDivElement | undefined = undefined;
    width: number = 0;
    height: number = 0;

    constructor(props: DagNodeProps & InternalProps) {
        super(props);
        this.setContentRef = this.setContentRef.bind(this);
    }

    updateSize() {
        const { isInteractive, onResize } = this.props;
        const DOMNode = ReactDOM.findDOMNode(this.content);
        if (DOMNode) {
            const width = (DOMNode as any).offsetWidth;
            const height = (DOMNode as any).offsetHeight;
            isInteractive
                ? onResize(
                        width + kBorderWidth * 2,
                        height + kBorderWidth * 2,
                    )
                : onResize(width, height);
            this.width = width;
            this.height = height;
        }
    }
    
    componentDidUpdate() {
        this.updateSize();
    }

    setContentRef(ref: HTMLDivElement) {
        this.content = ref;
        this.updateSize();
    }

    render() {
        const {
            classes,
            x,
            y,
            width,
            height,
            children,
            isVisible,
            isInteractive,
            light,
            isExpanded,
            mouseHandlers,
        } = this.props;

        // If the node is expanded, render an interactive rectangle
        if (isExpanded) {
            return (
                <rect
                    x={x - width / 2}
                    y={y - height / 2}
                    width={width}
                    height={height}
                    rx={8}
                    ry={8}
                    className={clsx({
                        [classes.expandedInvisible]: isVisible === false,
                        [classes.expandedVisible]: isVisible !== false,
                        [classes.expandedHighlighted]: isVisible !== false && light === 'highlight',
                    })}
                    {...mouseHandlers}
                />
            );
        }

        // If not expanded, render the node, surrounded by an interactive border if `isInteractive`
        const foreignObjectPos = isInteractive
            ? {
                  x: x - width / 2 + kBorderWidth,
                  y: y - height / 2 + kBorderWidth,
                  width: width - kBorderWidth * 2,
                  height: height - kBorderWidth * 2,
              }
            : {
                  x: x - width / 2,
                  y: y - height / 2,
                  width: width,
                  height: height,
              };

        return (
            <g>
                {isInteractive ? (
                    <rect
                        x={x - width / 2}
                        y={y - height / 2}
                        width={width}
                        height={height}
                        rx={8}
                        ry={8}
                        className={clsx({
                            [classes.expandedInvisible]: isVisible === false,
                            [classes.expandedVisible]: isVisible !== false,
                            [classes.expandedHighlighted]: isVisible !== false && light === 'highlight',
                        })}
                        {...mouseHandlers}
                    />
                ) : null}
                <foreignObject
                    {...foreignObjectPos}
                    className={clsx({
                    })}
                >
                    <div ref={this.setContentRef} style={{ display: 'inline-block' }}>
                        {children}
                    </div>
                </foreignObject>
            </g>
        );
    }
}

const styles = (theme: Theme) =>
    createStyles({
        expandedInvisible: {

        },

        expandedVisible: {
            stroke: theme.vars.slot.borderColor,
            strokeWidth: theme.vars.slot.borderWidth,
            fill: 'transparent',
        },

        expandedHighlighted: {
            stroke: theme.vars.framed.highlight.borderLeftColor,
        },
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(DagNode) as React.ComponentClass<DagNodeProps>;
