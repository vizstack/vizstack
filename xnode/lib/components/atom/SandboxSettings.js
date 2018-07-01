'use babel';

import React, { Component } from 'react';
import PropTypes from "prop-types";
import classNames from 'classnames';
import { withStyles } from 'material-ui/styles';

import Typography from 'material-ui/Typography';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';


class SandboxSettingsComponent extends Component {

    /** Prop expected types object. */
    static propTypes = {
        children: PropTypes.object,
        classes:  PropTypes.object.isRequired,

        /* The default content of the `scriptPath` parameter. */
        defaultScriptPath: PropTypes.string.isRequired,
    };

    /**
     * Constructor.
     */
    constructor(props) {
        super(props);
        console.debug(props.defaultScriptPath);
        this.state = {
            pythonPath: 'python',
            scriptPath: props.defaultScriptPath,
        }
    }

    /**
     * Asks `main` to open a new sandbox with the component's current parameters
     */
    openSandbox() {
        const { pythonPath, scriptPath } = this.state;
        console.debug(`submit() -- requesting sandbox for ${scriptPath} using ${pythonPath}`);
        atom.workspace.open(`atom://xnode-sandbox/${encodeURIComponent(pythonPath)}/${encodeURIComponent(scriptPath)}`);
    }

    /**
     * Renders a <div> with text fields for the Python executable path and the REPL target script path, as well as a
     * button to close the modal and open the sandbox.
     */
    render() {
        const { classes } = this.props;
        const { pythonPath, scriptPath } = this.state;
        return (
            <div className={classes.root}>
                <Typography className={classes.title} variant={"headline"}>
                    Sandbox Settings
                </Typography>
                <div>
                    <TextField
                        className={classNames('native-key-bindings')
                            /* use native-key-bindings to fix an issue with backspacing in Atom */}
                        label="Python Path"
                        value={pythonPath}
                        InputProps={{className: classes.fieldInput}}
                        InputLabelProps={{className: classes.fieldLabel, disableAnimation: true}}
                        onChange={(e) => this.setState({pythonPath: e.target.value})}
                    />
                </div>
                <div>
                    <TextField
                        className={classNames('native-key-bindings')
                            /* use native-key-bindings to fix an issue with backspacing in Atom */}
                        label="Script Path"
                        value={scriptPath}
                        InputProps={{className: classes.fieldInput}}
                        InputLabelProps={{className: classes.fieldLabel, disableAnimation: true}}
                        onChange={(e) => this.setState({scriptPath: e.target.value})}
                    />
                </div>
                <div>
                    <Button className={classes.button} onClick={() => this.openSandbox()}>
                        Open
                    </Button>
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = theme => ({
    root: {
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'center',
    },

    title: {
        padding: theme.spacing.unit,
    },

    fieldInput: {
        color: '#aaa',
    },

    fieldLabel: {
        color: '#555',
    },

    button: {
        color: '#aaa',
        padding: theme.spacing.unit,
        margin: theme.spacing.unit,
    },
});

export default withStyles(styles)(SandboxSettingsComponent);