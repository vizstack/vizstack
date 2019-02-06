import * as React from 'react';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';

import fs from 'fs';
import yaml from 'js-yaml';

import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import { getMinimalDisambiguatedPaths } from "../services/path-utils";
import Select from 'react-select'
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import RefreshIcon from '@material-ui/icons/Refresh';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import Tooltip from '@material-ui/core/Tooltip';
import InputLabel from '@material-ui/core/InputLabel';


class SandboxSettingsModal extends React.Component<{
    /** CSS-in-JS styling object. */
    classes: {},

    settingsFileExists: boolean,

    settingsPath: string,

    onSelect: (string, string, string) => void,
}, {
    currentSandboxName: string,

    sandboxes: {
        [string]: {
            pythonPath: string,
            scriptPath: string,
        }
    }
}> {
    /**
     * Constructor.
     */
    constructor(props) {
        super(props);
        let sandboxes = {};
        if (props.settingsFileExists) {
            sandboxes = this.getSandboxes();
        }
        this.state = {
            sandboxes,
            currentSandboxName: null,
        }
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.settingsFileExists && this.props.settingsFileExists) {
            this.setState({
                sandboxes: this.getSandboxes(),
            })
        }
    }

    getSandboxes() {
        const { settingsPath } = this.props;
        return yaml.safeLoad(fs.readFileSync(settingsPath)).sandboxes;
    }

    onSandboxSelected(sandboxName) {
        const { sandboxes } = this.state;
        const { pythonPath, scriptPath } = sandboxes[sandboxName];
        this.props.onSelect(sandboxName, pythonPath, scriptPath);
        this.setState({
            currentSandboxName: sandboxName,
        })
    }

    submitSelection() {
        const { sandboxes, currentSandboxName } = this.state;
        const { pythonPath, scriptPath } = sandboxes[currentSandboxName];
        this.props.onSelect(currentSandboxName, pythonPath, scriptPath);
    }

    /**
     * Renders a <div> with text fields for the Python executable path and the REPL target script path, as well as a
     * button to close the modal and open the sandbox.
     */
    render() {
        const { classes } = this.props;
        const { currentSandboxName, sandboxes } = this.state;

        let pythonPath, scriptPath;
        if (currentSandboxName) {
            pythonPath = sandboxes[currentSandboxName].pythonPath;
            pythonPath = getMinimalDisambiguatedPaths(
                Object.values(sandboxes).map((sandbox) => sandbox.pythonPath))[pythonPath];
            scriptPath = sandboxes[currentSandboxName].scriptPath;
            scriptPath = getMinimalDisambiguatedPaths(
                Object.values(sandboxes).map((sandbox) => sandbox.scriptPath))[scriptPath];
        }

        return (
            <div className={classes.root}>
                <Select
                    value={currentSandboxName !== null ? {
                        value: currentSandboxName, label: currentSandboxName,
                    } : undefined}
                    options=
                        {Object.keys(sandboxes).map((sandboxName) => ({
                            value: sandboxName, label: sandboxName,
                        }))}
                    placeholder={"Select a sandbox..."}
                    onMenuOpen={() => this.setState({sandboxes: this.getSandboxes()})}
                    onChange={(selected) => this.onSandboxSelected(selected.value)}
                />
                <div className={classes.details}>
                    {pythonPath && scriptPath ? `${pythonPath} | ${scriptPath}` : undefined}
                </div>
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = (theme) => ({
    root: {
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'center',
    },
    details: {
        color: theme.palette.text.secondary,
        fontSize: theme.typography.fontSize.secondary,
    }
});

export default withStyles(styles)(SandboxSettingsModal);
