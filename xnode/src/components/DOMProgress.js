import * as React from 'react';
import LinearProgress from "@material-ui/core/LinearProgress";
import {withStyles} from "@material-ui/core/styles/index";

/**
 * This dumb component exposes the `LinearProgress` Material UI component in a manner that can be interacted with via
 * React ref. This allows `repl.js` to show, hide, and modify a progress meter using values from outside of the
 * ReactDOM.
 */
class DOMProgress extends React.Component<{
}, {
    visible: boolean,
    determinate: boolean,
    value: number,
}> {
    /**
     * Constructor.
     */
    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            determinate: true,
            value: 0,
        }
    }

    showIndeterminate() {
        this.setState({
            visible: true,
            determinate: false,
        });
    }

    showDeterminate() {
        this.setState({
            visible: true,
            determinate: true,
        });
    }

    setProgress(value) {
        this.setState({
           value: value,
        });
    }

    hide() {
        this.setState({
            visible: false,
            // if determinate stays false after hiding, on next showDeterminate(), the meter will start at 100
            determinate: true,
            value: 0,
        })
    }

    render() {
        const { visible, determinate, value } = this.state;
        const style = {
            opacity: visible ? 1 : 0,
        };
        return (
            <LinearProgress style={style}
                            variant={determinate ? 'determinate' : 'indeterminate'}
                            value={determinate ? value : 0}/>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = (theme) => ({
});

export default withStyles(styles)(DOMProgress);