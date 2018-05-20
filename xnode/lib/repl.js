'use babel';

// React + Redux services
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';

// Python services
import PythonShell from 'python-shell';
import path from 'path';

// Custom top-level React/Redux components
import Canvas from './components/Canvas';
import mainReducer from './reducers';
import { addSymbolActionThunk, clearSymbolTableAction } from './actions/program';
import { addViewerAction, clearCanvasAction } from './actions/canvas';

/** Path to main Python module for `ExecutionEngine`. */
const EXECUTION_ENGINE_PATH = path.join(__dirname, 'engine.py');

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
     * @param {string} scriptPath
     *     The absolute path of the main script tied to this `REPL`. The `ExecutionEngine` remains associated with this
     *     script, rerunning if needed after every file edit.
     */
    constructor(scriptPath) {
        // Initialize REPL state
        this.scriptPath = scriptPath;  // Main script this REPL is tied to
        this.watchStatements = {};     // mapping of file->lineno->{actions:[], decorations: []} for each watched line
        this.executionEngine = this.startEngine(scriptPath);   // Communication channel with Python process

        // TODO: uncomment this to test REPL
        // this.toggleWatchStatement(path.join(__dirname, '../dummy.py'), 9);

        // Initialize Redux store & connect to main reducer
        this.store = createStore(mainReducer, composeWithDevTools(
            applyMiddleware(thunk),
        ));

        // Initialize React root component for Canvas
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={this.store}>
                <Canvas />
            </ReduxProvider>,
            this.element
        );

        console.debug('constructor() -- REPL instance created');
    }

    /** Returns an object that can be retrieved when package is activated. */
    serialize() {}

    /**
     * Tear down state and detach.
     */
    destroy() {
        this.element.remove();
        console.debug('destroy() -- REPL instance destroyed');
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
    // Atom-specific behaviors
    // ================================================================================================================
    /**
     * Adds Atom workspace decorations associated with a to-be-added watch expression.
     * @param {string} filePath
     *      The absolute path to the watched file.
     * @param {number} lineNum
     *      The line number to be watched in `filePath`.
     * @param {object?} action
     *      Not currently used.
     */
    addWatchDecorations(filePath, lineNum, action) {
        // TODO: this assumes that the active editor contains the changed file
        let editor = atom.workspace.getActiveTextEditor();
        let gutter = editor.gutterWithName('xnode-watch-gutter');
        let cursorPosition = editor.getCursorBufferPosition();
        let marker = editor.markBufferPosition(cursorPosition);
        let decoration = gutter.decorateMarker(marker, {
            'type': 'gutter',
            'class': 'watched-line',
        });
        this.watchStatements[filePath][lineNum].decorations.push(decoration)
    }

    /**
     * Removes Atom workspace decorations associated with a to-be-removed watch expression.
     *
     * Note that this must be called before the watch statement is removed from `this.watchStatements.`
     * @param {string} filePath
     *      The absolute path to the watched file.
     * @param {number} lineNum
     *      The line number to be unwatched in `filePath`.
     * @param {object?} action
     *      Not currently used.
     */
    removeWatchDecorations(filePath, lineNum, action) {
        this.watchStatements[filePath][lineNum].decorations.forEach(decoration => decoration.destroy());
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
     * @param  {string} scriptPath
     *      The path to the Python script whose data should be visualized in the canvas.
     * @returns {PythonShell}
     *      A Python subprocess with which REPL can communicate to acquire evaluated watch statements.
     */
    startEngine(scriptPath) {
        let options = {
            args: [scriptPath],
        };
        let executionEngine = new PythonShell(EXECUTION_ENGINE_PATH, options);
        executionEngine.on('message', (message) => {
            console.debug('executionEngine -- received message: ', message);
            let { symbolShells, symbolData, symbolId, watchCount, refresh} = JSON.parse(message);
            if (refresh) {
                this.store.dispatch(clearCanvasAction());  // TODO: don't wipe the canvas completely
                this.store.dispatch(clearSymbolTableAction());
            }
            if (symbolId !== null) {
                this.store.dispatch(addSymbolActionThunk(symbolId, symbolShells, symbolData, watchCount));
                this.store.dispatch(addViewerAction(symbolId, watchCount));
            }
        });
        return executionEngine;
    }

    /**
     * Toggles the existence of a watch statement at a given line.
     *
     * @param  {string} filePath
     *      Absolute path to the file with a line to watch/unwatch.
     * @param  {number} lineNum
     *      The line number in `filePath` to watch/unwatch.
     * @param  {?string} action
     *      Currently unused; TODO: the expression to perform on the watched variable.
     */
    toggleWatchStatement(filePath, lineNum, action = null) {
        console.debug(`repl -- toggling watch statement (${filePath}, ${lineNum})`);
        if (filePath in this.watchStatements && lineNum in this.watchStatements[filePath]) {
            this.removeWatchDecorations(filePath, lineNum, action);
            delete this.watchStatements[filePath][lineNum];
        }
        else {
            if(!(filePath in this.watchStatements)) {
                this.watchStatements[filePath] = {};
            }
            if(!(lineNum in this.watchStatements[filePath])) {
                this.watchStatements[filePath][lineNum] = {
                    actions: [],
                    decorations: [],
                };
            }
            this.addWatchDecorations(filePath, lineNum, action);
        }
        this.executionEngine.send(`watch:${filePath}?${lineNum}?${action}`);
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
        this.executionEngine.send(`change:${file}?${changes}`);
    }
}
