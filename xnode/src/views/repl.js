// React + Redux services
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';
import { composeWithDevTools } from 'remote-redux-devtools';

// Material UI services
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import XnodeMuiTheme from '../theme';

// Python services
import PythonShell from 'python-shell';
import path from 'path';

// Custom top-level React/Redux components
import Canvas from '../components/Canvas';
import mainReducer from '../state';
import { addSymbolsAction, clearSymbolTableAction } from '../state/program/actions';
import { addSnapshotViewerAction, addPrintViewerAction, clearCanvasAction } from '../state/canvas/actions';

/** Path to main Python module for `ExecutionEngine`. */
const EXECUTION_ENGINE_PATH = path.join(__dirname, '/../engine.py');


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
     * @param pythonPath
     *      The path to the Python executable that should be used to execute the requested script.
     * @param scriptPath
     *     The absolute path of the main script tied to this `REPL`, which will be executed and visualized.
     */
    constructor(name: string, pythonPath: string, scriptPath: string) {
        this.name = name;
        // Initialize REPL state
        this.executionEngine = this._createEngine(pythonPath, scriptPath);   // Communication channel with Python process

        // Initialize Redux store & connect to main reducer
        // TODO: re-add devtools
        this.store = createStore(mainReducer, applyMiddleware(thunk));

        // Initialize React root component for Canvas
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={this.store}>
                <MuiThemeProvider theme={XnodeMuiTheme}>
                    <Canvas fetchSymbolData={(symbolId) => this.fetchSymbolData(symbolId)} />
                </MuiThemeProvider>
            </ReduxProvider>,
            this.element,
        );

        console.debug('constructor() -- REPL instance created');
    }

    /** Returns an object that can be retrieved when package is activated. */
    serialize() {}

    /**
     * Tear down state and detach.
     */
    destroy() {
        // TODO: do we need to destroy the execution engine as well?
        this.element.remove();
        console.debug(`repl ${this.name} -- destroy()`);
    }


    // =================================================================================================================
    // Atom display methods
    // =================================================================================================================

    /** Used by Atom to show title in a tab. */
    getTitle() {
        return 'Xnode Sandbox';
    }

    /** Used by Atom to show icon next to title in a tab. */
    getIconName () {
        return 'beaker';
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
     *
     * @param {string} pythonPath
     *      The path to the Python executable that should be used to run the script.
     * @param {string} scriptPath
     *      The path to the Python script whose data should be visualized in the canvas.
     * @returns {PythonShell}
     *      A Python subprocess with which `REPL` can communicate to acquire evaluated watch statements.
     */
    _createEngine(pythonPath, scriptPath) {
        let options = {
            args: [scriptPath],
            pythonPath,
        };
        let executionEngine = new PythonShell(EXECUTION_ENGINE_PATH, options);
        executionEngine.on('message', (message) => {
            console.debug(`repl ${this.name} -- received message`, JSON.parse(message));
            let { viewSymbol, symbols, refresh, text, error } = JSON.parse(message);
            if (refresh) {
                this.store.dispatch(clearCanvasAction());
                this.store.dispatch(clearSymbolTableAction());
            }
            if(symbols) {
                this.store.dispatch(addSymbolsAction(symbols));
            }
            if(viewSymbol !== null) {
                this.store.dispatch(addSnapshotViewerAction(viewSymbol));
            }
            if (text !== null) {
                this.store.dispatch(addPrintViewerAction(text));
            }
            if (error !== null) {
                this.store.dispatch(addPrintViewerAction(error));
            }
            // When the Canvas gets updated, the active text editor will lose focus. This line is required to restore
            // focus so the user can keep typing.
            atom.views.getView(atom.workspace.getActiveTextEditor()).focus();
        });
        return executionEngine;
    }

    /**
     * Fetches the data object for a given symbol from the execution engine.
     *
     * The data object is not directly returned, but will eventually be sent by the execution engine to REPL as a
     * message, at which point it is added to the symbol table.
     *
     * @param {string} symbolId
     *      The identifier of the symbol, as acquired from a reference in the symbol table.
     * @param {?object} action
     *      Actions that the execution engine should perform on the generated symbol table slice before sending it to
     *      `REPL`, in the format described in `ACTION-SCHEMA.md`.
     */
    fetchSymbolData(symbolId, action = null) {
        // TODO: check to make sure the data isn't already there
        console.debug(`repl ${this.name} -- fetching symbol (${symbolId})`);
        this.executionEngine.send(`fetch:${symbolId}?${JSON.stringify(this._mergeActions(action, DEFAULT_ACTION))}`);
    }

    /**
     * Determines whether the given `changes` to `file` warrant a re-run of this REPL's main script (or certain parts
     * of it).
     *
     * @param  {string} file
     *     Path of file that was changed.
     * @param  {object} changes
     *     Indicates what parts of the file changed. TODO: define this format and use it
     */
    onFileChanged(file, changes) {
        changes = '';
        console.debug(`repl ${this.name} -- change to ${file}`);
        this.executionEngine.send(`change:${file}?${changes}`);
    }
}
