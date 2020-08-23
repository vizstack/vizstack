import * as React from 'react';
import ReactDOM from "react-dom";
import clsx from 'clsx';
import { withStyles, createStyles, Theme, WithStyles } from '@material-ui/core/styles';

import defaultTheme from '../../theme';

const kRadius = 2;
const kLabelShift = 3;

type DagPortProps = {
    x: number;
    y: number;
    light: 'lowlight' | 'normal' | 'highlight' | 'selected';
    label?: string;
}

class DagPort extends React.PureComponent<DagPortProps & InternalProps> {
    render() {
        const { x, y, light, label, classes } = this.props;
        return (
            <g>
                <circle cx={x} cy={y} r={kRadius}/>
                {label !== undefined && (light === "highlight" || light === "selected") ? <text transform={`translate(${x+kLabelShift},${y-kLabelShift})rotate(315)`} className={classes.label}>{label}</text> : null}
            </g>
        )
    }
}

const styles = (theme: Theme) =>
    createStyles({
        label: {
            fontSize: theme.typography.caption.fontSize,
            fontFamily: theme.typography.caption.fontFamily,
            fontWeight: theme.typography.caption.fontWeight,
            fill: theme.typography.caption.color,
        }
    });

type InternalProps = WithStyles<typeof styles>;

export default withStyles(styles, { defaultTheme })(DagPort) as React.ComponentClass<DagPortProps>;