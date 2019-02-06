// React + Redux services
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';

// Material UI services
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import XnodeMuiTheme from '../theme';

// Python services
import PythonShell from 'python-shell';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

// UUID services
import cuid from 'cuid';

// Custom top-level React/Redux components
import SandboxSettings from '../components/SandboxSettings';
import Canvas from '../components/Canvas';
import mainReducer from '../state';
import { addVizTableSliceAction, clearVizTableAction } from '../state/viztable/actions';
import {
    createViewerAction,
    clearCanvasAction,
    showViewerInCanvasAction,
} from '../state/canvas/actions';
import type { VizId, VizSpec } from '../state/viztable/outputs';
import { getVizSpec } from '../state/viztable/outputs';

/** Path to main Python module for `ExecutionEngine`. */
const EXECUTION_ENGINE_PATH = path.join(__dirname, '/../engine.py');

type ExecutionEngineMessage = {
    // Top-level viz created directly from a `xn.view()` call. Is displayed in its own ViewerSpec in the Canvas.
    viewedVizId?: VizId,

    // VizTable slice to add into central VizTable.
    vizTableSlice?: { [VizId]: VizSpec },

    // Whether the VizTable should be cleared. The backend may determine that the changes to files are
    // irrelevant for visualization, and so the current VizTable can be maintained.
    shouldRefresh: boolean,
};

/**
 * This class manages the read-eval-print-loop (REPL) for interactive coding. A `REPL` is tied to a single main script,
 * which is re-run when appropriate, e.g. when a piece of code it depends on is edited (aka. "read"). An spawned Python
 * process runs an `ExecutionEngine` which runs the script and generates the needed visualization schemas (aka "eval").
 * Watch statements are set by the user to determine what variables/data need visualization schemas to be
 * generated, so that they can be visualized in the `Canvas` (aka "print").
 *
 * Together, the `REPL` + `Canvas` + `ExecutionEngine` is called a Sandbox (the term surfaced to a user). A Sandbox can
 * be thought of as an isolated environment for experimenting with a particular program script, along with any sandbox
 */
export default class REPL {
    /**
     * Constructor.
     * @param pythonPath
     *      The path to the Python executable that should be used to execute the requested script.
     * @param scriptPath
     *     The absolute path of the main script tied to this `REPL`, which will be executed and visualized.
     */
    constructor() {
        this.name = '';
        this.isDestroyed = false; // TODO: Why do we need this?

        // Initialize REPL state
        this.executionEngine = undefined;

        // Initialize Redux store & connect to main reducer
        // TODO: re-add devtools
        this.store = createStore(mainReducer, applyMiddleware(thunk));

        let settingsFileExists = false;

        const settingsPath = path.join(atom.project.getPaths()[0], 'xnode.yaml');
        if (!fs.existsSync(settingsPath)) {
            atom.workspace.open(settingsPath).then(editor => {
                settingsFileExists = true;
                editor.insertText('# Define your sandbox configurations here.\n');
                editor.insertText(yaml.safeDump({
                    'sandboxes': {
                        'MySandbox1': {
                            'pythonPath' : null,
                            'scriptPath' : null,
                        }
                    }
                }))
            });
        } else {
            settingsFileExists = true;
        }

        // Initialize React root component for Canvas
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={this.store}>
                <MuiThemeProvider theme={XnodeMuiTheme}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                    }}>
                        <div style={{
                            width: '100%',
                        }}>
                            <SandboxSettings
                                settingsFileExists={settingsFileExists}
                                settingsPath={settingsPath}
                                onSelect={(sandboxName, pythonPath, scriptPath) => {
                                    this.name = sandboxName;
                                    this.executionEngine = this._createEngine(pythonPath, scriptPath);
                                }} />
                        </div>
                        <Canvas
                            style={{
                                flexGrow: 1,
                            }}
                            fetchVizModel={(vizId, modelType) => this.fetchVizModel(vizId, modelType)}
                        />
                    </div>
                </MuiThemeProvider>
            </ReduxProvider>,
            this.element,
        );

        console.debug(`repl ${this.name} - constructed`);
    }

    /**
     * Returns an object that can be retrieved when package is activated.
     */
    serialize() {}

    /**
     * Tear down state and detach.
     */
    destroy() {
        this.isDestroyed = true;
        // TODO: do we need to destroy the execution engine as well?
        this.executionEngine.terminate();
        this.element.remove();
        console.debug(`repl ${this.name} -- destroy()`);
    }

    // =================================================================================================================
    // Atom display methods
    // =================================================================================================================

    /** Used by Atom to show title in a tab. */
    getTitle() {
        return `[canvas] ${this.name}`;
    }

    /** Used by Atom to show icon next to title in a tab. */
    getIconName() {
        return 'paintcan';
    }

    /** Used by Atom to identify the view when opening. */
    getURI() {
        return 'atom://xnode-sandbox';
    }

    /** Used by Atom to place the pane in the window. */
    getDefaultLocation() {
        return 'right';
    }

    /** Used by Atom to get the DOM element to be rendered. */
    getElement() {
        return this.element;
    }

    // =================================================================================================================
    // Interacting with ExecutionEngine
    // ================================================================================================================

    /**
     * Creates a new execution engine.
     *
     * The engine is a spawned Python process that persists for the lifespan of the Sandbox. Changes to files and
     * watch statements are relayed to the engine, which potentially runs some or all of `scriptPath` and relays any
     * watched data to REPL, which stores that data.
     * @param {string} pythonPath
     *      The path to the Python executable that should be used to run the script.
     * @param {string} scriptPath
     *      The path to the Python script whose data should be visualized in the canvas.
     * @returns {PythonShell}
     *      A Python subprocess with which `REPL` can communicate to acquire evaluated watch statements.
     */
    _createEngine(pythonPath: string, scriptPath: string) {
        if (this.executionEngine) {
            this.executionEngine.terminate();
            this.executionEngine = undefined;
        }
        let options = {
            args: [scriptPath],
            pythonPath,
        };
        let executionEngine = new PythonShell(EXECUTION_ENGINE_PATH, options);
        executionEngine.on('message', (message: ExecutionEngineMessage) => {
            console.debug(`repl ${this.name} -- received message: `, JSON.parse(message));
            const { viewedVizId, vizTableSlice, shouldRefresh } = JSON.parse(message);
            if (shouldRefresh) {
                this.store.dispatch(clearCanvasAction());
                this.store.dispatch(clearVizTableAction());
            }
            if (vizTableSlice) {
                this.store.dispatch(addVizTableSliceAction(vizTableSlice));
            }
            if (viewedVizId) {
                this.store.dispatch(showViewerInCanvasAction(viewedVizId));
            }
            // When the Canvas gets updated, the active text editor will lose focus. This line is required to restore
            // focus so the user can keep typing.
            atom.views.getView(atom.workspace.getActiveTextEditor()).focus();
        });
        return executionEngine;
    }

    /**
     * Fetches from the execution engine a model for a viz.
     *
     * The `vizTableSlice` fetched (asynchronously) can be merged into the `vizTable`. It will preserve the invariant
     * for `VizSpec` (e.g. if "full" is the model name, both `fullModel` and `compactModel` will be filled).
     * @param vizId
     * @param modelType
     *     String to specify which model(s) to retrieve: 'compact' (compact only) or 'both' (compact + full).
     */
    fetchVizModel(vizId: VizId, modelType: 'compact' | 'full') {
        const existingSpec = getVizSpec(this.store.getState().viztable, vizId);
        if (
            (existingSpec.compactModel === null && modelType === 'compact') ||
            (existingSpec.fullModel === null && modelType === 'full')
        ) {
            console.debug(`repl ${this.name} -- fetching viz (${vizId})`);
            this.executionEngine.send(`fetch:${vizId}?${modelType}`);
        }
    }

    /**
     * Determines whether the given `changes` to `file` warrant a re-run of this REPL's main script (or certain parts
     * of it).
     * @param  filePath
     *     Absolute path of file that was changed.
     * @param  changes
     *     Indicates what parts of the file changed. TODO: define this format and use it
     */
    onFileChanged(filePath: string, changes: {}) {
        changes = ''; // TOOD: Right now not sending specific changes.
        console.debug(`repl ${this.name} -- change to ${filePath}`);
        if (this.executionEngine) {
            this.executionEngine.send(`change:${filePath}?${changes}`);
        }
    }
}
