'use babel';

// Python services
import PythonShell from 'python-shell';
import path from 'path';

// React + Redux services
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';

// Top-level React + Redux files
import mainReducer from './reducers';
import Canvas from './components/Canvas';

/** Path to main Python module for `ExecutionEngine`. */
const EXECUTE_PATH = path.join(__dirname, 'engine.py');

/**
 * This class manages the read-eval-print-loop (REPL) for interactive coding. A `REPL` is tied to a single main script,
 * which is re-run when appropriate (e.g. when a piece of code it depends on is edited). An spawned Python process
 * runs an `ExecutionEngine` which runs the script and generates the needed visualization schemas. (the "eval"
 * function). Watch statements are set by the user to determine what variables/data need visualization schemas to be
 * generated, so that they can be visualized in the `Canvas` (the "print" function).
 */
export default class REPL {

    /**
     * Constructor.
     *
     * @param {string} scriptPath
     *     The path to the script that the engine should execute. The engine remains associated with this script,
     *     rerunning if needed after every file edit.
     */
    constructor(scriptPath) {
        // Initialize REPL state
        this.scriptPath = scriptPath;  // Main script this REPL is tied to
        this.watchStatements = [];     // List of watch objects to determine vars/data to display
        this.executionEngine = this.startEngine(scriptPath);   // Communication channel with Python process

        // Initialize Redux store & connect to main reducer
        let store = createStore(mainReducer, composeWithDevTools(
            applyMiddleware(thunk),
        ));

        // // Initialize React root component
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={store}>
                <Canvas />
            </ReduxProvider>,
            this.element
        );

        console.log("REPL constructed!");

        /// TODO: attach subscriptler for on file changed when created --> pull up
    }

    /** Returns an object that can be retrieved when package is activated. */
    serialize() {}

    /**
     * Tear down state and detach.
     */
    destroy() {
        this.element.remove();
    }


    // =================================================================================================================
    // Atom display methods
    // =================================================================================================================

    /** Used by Atom to show title in a tab. */
    getTitle() {
        return 'Xnode Sandbox';
    }

    /** Used by Atom to identify the view when opening. */
    getURI() {
        return 'atom://xnode-sandbox';
    }

    /** Used by Atom to place the pane in the window. */
    getDefaultLocation() {
        return 'right';
    }

    /** Used by Atom to place the pane in the window. */
    getAllowedLocations() {
        return ['left', 'right', 'bottom'];
    }

    /** Used by Atom to get the DOM element to be rendered. */
    getElement() {
        return this.element;
    }

    // =================================================================================================================
    // Interacting with REPL
    // ================================================================================================================

    /**
     * Creates a new execution engine.
     *
     * The engine is a Python process, which persists for the lifespan of the sandbox. Changes to files and watch
     * statements are relayed to the engine, which potentially runs some or all of `scriptPath` and relays any watched
     * data to REPL, which stores that data.
     *
     * @param  {string} scriptPath
     *      The path to the Python script whose data should be visualized in the canvas.
     * @returns {PythonShell}
     *      A Python subprocess with which REPL can communicate to acquire evaluated watch statements.
     */
    startEngine(scriptPath) {
        let options = {
            args: [scriptPath],
        }
        let executionEngine = new PythonShell(EXECUTE_PATH, options);
        executionEngine.on('message', (message) => {
            console.log(message);
            let { data, shells } = JSON.parse(message);
            // TODO store data and shells locally
        });
        return executionEngine;
    }

    /**
     * Toggles the existence of a watch statement at a given line.
     *
     * @param  {string} filePath
     *      Path to the file whose line should be watched.
     * @param  {number} lineNum
     *      The line number in `filePath` to be watched.
     * @param  {?string} action
     *      Currently unused; TODO: the expression to be performed on the watched variable.
     */
    toggleWatchStatement(filePath, lineNum, action = null) {
        this.executionEngine.send(`watch:${filePath}?${lineNum}?${action}`)
    }

    /**
     * Fetches the data object for a given symbol from the execution engine.
     *
     * The data object is not directly returned, but will eventually be sent by the execution engine to REPL as a
     * message, at which point it is added to the symbol table.
     *
     * @param  {string} symbolId
     *      The identifier of the symbol, as acquired from a reference in the symbol table.
     */
    fetchSymbolData(symbolId) {
        this.executionEngine.send(`fetch:${symbolId}`);
    }

    /**
     * Determines whether the given `changes` to `file` warrant a re-run of this REPL's main script (or certain parts
     * of it).
     *
     * @param  {string} file
     *     Path of file that was changed.
     * @param  {object} changes
     *     Indicates what parts of the file changed.
     */
    onFileChanged(file, changes) {
        // TODO: convert changes to string that is understood by engine
        changes = '';
        this.executionEngine.send(`change:${file}?${changes}`)
    }
}
