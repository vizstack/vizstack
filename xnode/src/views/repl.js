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
import Progress from '../components/DOMProgress';

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
     *
     * @param id
     *      A numerical identifier unique to this REPL among all active REPL instances.
     * @param onSandboxSelected
     *      A function which should be executed whenever a new sandbox configuration is selected for this REPL. The
     *      first argument is this REPL instance and the second is the name of the selected sandbox configuration. This
     *      function should trigger a call to `this.createEngine()`.
     */
    constructor(id: number, onSandboxSelected: (repl: REPL, sandboxName: string) => void): void {
        this.id = id;
        this.sandboxName = ''; // To be set once a sandbox has been selected
        this.isDestroyed = false; // TODO: Why do we need this?
        this.onSandboxSelected = onSandboxSelected;

        // Initialize REPL state
        this.executionEngine = undefined;
        this.marker = null;

        // Initialize Redux store & connect to main reducer
        // TODO: re-add devtools
        this.store = createStore(mainReducer, applyMiddleware(thunk));
        // Initialize React root component for Canvas
        this.progressComponent = undefined;
        this.sandboxSelectComponent = undefined;
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={this.store}>
                <MuiThemeProvider theme={XnodeMuiTheme}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                    >
                        <Progress
                            innerRef={(element) => {
                                this.progressComponent = element;
                            }}
                        />
                        <div
                            style={{
                                width: '100%',
                            }}
                        >
                            <SandboxSettings
                                innerRef={(element) => {
                                    this.sandboxSelectComponent = element;
                                }}
                                onSelect={(sandboxName) =>
                                    this.onSandboxSelected(this, sandboxName)
                                }
                            />
                        </div>
                        <Canvas
                            style={{
                                flexGrow: 1,
                            }}
                            fetchVizModel={(vizId, modelType) =>
                                this.fetchVizModel(vizId, modelType)
                            }
                            onViewerMouseOver={(vizId, filePath, lineNumber) => {
                                atom.workspace.getTextEditors().forEach((editor) => {
                                    if (editor.getPath().toLowerCase() === filePath.toLowerCase()) {
                                        if (this.marker !== null) {
                                            this.marker.destroy();
                                            this.marker = null;
                                        }
                                        this.marker = editor.markBufferPosition([
                                            lineNumber - 1,
                                            0,
                                        ]);
                                        editor.decorateMarker(this.marker, {
                                            type: 'line',
                                            class: 'xn-watched-line',
                                        });
                                    }
                                });
                            }}
                            onViewerMouseOut={(vizId, filePath, lineNumber) => {
                                if (this.marker !== null) {
                                    this.marker.destroy();
                                    this.marker = null;
                                }
                            }}
                        />
                    </div>
                </MuiThemeProvider>
            </ReduxProvider>,
            this.element,
        );

        console.debug(`repl ${this.id} - constructed`);
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
        if (this.executionEngine) {
            this.executionEngine.terminate();
        }
        if (this.marker !== null) {
            this.marker.destroy();
            this.marker = null;
        }
        this.element.remove();
        console.debug(`repl ${this.id} -- destroy()`);
    }

    // =================================================================================================================
    // Atom display methods
    // =================================================================================================================

    /** Used by Atom to show title in a tab. */
    getTitle() {
        return `[canvas] ${this.sandboxName}`;
    }

    /** Used by Atom to show icon next to title in a tab. */
    getIconName() {
        return 'paintcan';
    }

    /** Used by Atom to identify the view when opening. */
    getURI() {
        return `atom://xnode-sandbox/${this.id}`;
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
     * @param scriptArgs
     *      An array of arguments which should be passed to the executed script.
     */
    createEngine(pythonPath: string, scriptPath: string, scriptArgs: Array): void {
        if (this.executionEngine) {
            this.executionEngine.terminate();
            this.executionEngine = undefined;
        }
        let options = {
            args: [
                '--scriptPaths',
                path.join(atom.project.getPaths()[0], scriptPath),
                scriptPath,
                '--scriptArgs',
                ...scriptArgs,
            ],
            pythonPath,
        };
        let executionEngine = new PythonShell(EXECUTION_ENGINE_PATH, options);
        executionEngine.on('message', (message: ExecutionEngineMessage) => {
            console.debug(`repl ${this.id} -- received message: `, JSON.parse(message));
            const { viewedVizId, vizTableSlice, shouldRefresh, scriptFinished } = JSON.parse(
                message,
            );
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
            if (scriptFinished) {
                this.progressComponent.hide();
            }
            // When the Canvas gets updated, the active text editor will lose focus. This line is required to restore
            // focus so the user can keep typing.
            const activeEditor = atom.workspace.getActiveTextEditor();
            if (activeEditor) {
                atom.views.getView(activeEditor).focus();
            }
        });
        this.executionEngine = executionEngine;
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
            console.debug(`repl ${this.id} -- fetching viz (${vizId})`);
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
        changes = ''; // TODO: Right now not sending specific changes.
        console.debug(`repl ${this.id} -- change to ${filePath}`);
        if (this.executionEngine) {
            this.executionEngine.send(`change:${filePath}?${changes}`);
            this.progressComponent.showIndeterminate();
        } else {
            this.progressComponent.hide();
        }
    }

    /**
     * Triggered immediately after a file is edited. Should not trigger the execution engine, since the change may not
     * have finished; that behavior should be done in `onFileChanged()`.
     * @param  filePath
     *     Absolute path of file that was edited.
     * @param  changes
     *     Indicates what parts of the file edited. TODO: define this format and use it
     */
    onFileEdit(filePath: string, changes: {}) {
        if (this.executionEngine) {
            this.progressComponent.showDeterminate();
        }
    }

    /**
     * Triggered when there is a certain amount of time remaining before a change to a file will be submitted.
     * @param remainingTime
     * @param maxTime
     */
    setTimeToFileChange(remainingTime: number, maxTime: number) {
        this.progressComponent.setProgress(((maxTime - remainingTime) / maxTime) * 100);
    }
}
