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

    onSelect: (sandboxName: string) => void,
}, {
    currentSandboxName: string,

    sandboxes: {
        [string]: {
            pythonPath: string,
            scriptPath: string,
        }
    },
}> {
    /**
     * Constructor.
     */
    constructor(props) {
        super(props);
        this.state = {
            sandboxes: [],
            currentSandboxName: null,
        }
    }

    updateSandboxes(sandboxes: {}) {
        this.setState({sandboxes});
    }

    onSandboxSelected(sandboxName) {
        this.props.onSelect(sandboxName);
        this.setState({
            currentSandboxName: sandboxName,
        })
    }

    /**
     * Renders a <div> with text fields for the Python executable path and the REPL target script path, as well as a
     * button to close the modal and open the sandbox.
     */
    render() {
        const { classes } = this.props;
        const { currentSandboxName, sandboxes } = this.state;
        const { pythonPath, scriptPath } = currentSandboxName in sandboxes ? sandboxes[currentSandboxName] : {
            pythonPath: undefined,
            scriptPath: undefined,
        };

        // The react-select component uses its own obnoxious styles API, so we're unable to access our themes.
        const selectStyles = {
            control: (base) => ({
                ...base,
                height: '20px',
                minHeight: '20px',
            }),
        };

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
                    styles={selectStyles}
                    className={classes.select}
                    onChange={(selected) => this.onSandboxSelected(selected.value)}
                />
                {pythonPath !== undefined && scriptPath !== undefined ? <div className={classes.details}>
                    {`${pythonPath} | ${scriptPath}`}
                </div> : undefined}
            </div>
        );
    }
}

// To inject styles into component
// -------------------------------

/** CSS-in-JS styling object. */
const styles = (theme) => ({
    root: {
        display: 'flex',
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'center',
        alignItems: 'center',
    },
    select: {
        flexGrow: 1,
        fontSize: theme.typography.fontSize.primary,
        padding: theme.spacing.unit,
    },
    details: {
        flexGrow: 1,
        color: theme.palette.text.secondary,
        fontSize: theme.typography.fontSize.primary,
    }
});

export default withStyles(styles)(SandboxSettingsModal);
