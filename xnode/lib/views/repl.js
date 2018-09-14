'use babel';

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

const DEFAULT_ACTION = {
    recurse: [['creatorop'], ['args'], ['kwargs'], ['container']]
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
     * @param {string} pythonPath
     *      The path to the Python executable that should be used to execute the requeested script.
     * @param {string} scriptPath
     *     The absolute path of the main script tied to this `REPL`, which will be executed and visualized.
     */
    constructor(pythonPath, scriptPath) {
        // Initialize REPL state
        this.watchMarkers = [];  // List of `atom.Marker`, one for each watch statement
        this.executionEngine = this._createEngine(pythonPath, scriptPath);   // Communication channel with Python process

        // Initialize Redux store & connect to main reducer
        const composeEnhancers = composeWithDevTools({ realtime: true, });
        this.store = createStore(mainReducer, composeEnhancers(
            applyMiddleware(thunk),
        ));

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
        console.debug('destroy() -- REPL instance destroyed');
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

    /** Used by Atom to place the pane in the window. */
    getAllowedLocations() {
        return ['left', 'right', 'bottom'];
    }

    /** Used by Atom to get the DOM element to be rendered. */
    getElement() {
        return this.element;
    }

    // =================================================================================================================
    // Watch statements
    // =================================================================================================================

    /**
     * Shifts the line numbers of any watch statements in the Python script that were moved by an edit.
     *
     * If lines are inserted or removed in the Atom buffer, then the watch statements saved by `this.executionEngine`
     * must be updated to reflect the shift in position. This function, called whenever a file changes, accomplishes
     * this.
     */
    _shiftWatchStatements() {
        this.watchMarkers.forEach(marker => {
            // Lines in atom are 0-indexed, whereas in Python they are 1-indexed
            const currentPosition = marker.getHeadBufferPosition().row + 1;
            const { filePath, lineNum } = marker.getProperties();
            if (currentPosition !== lineNum) {
                marker.setProperties({
                    lineNum: currentPosition,
                });
                this.executionEngine.send(`shift:${filePath}?${lineNum}?${currentPosition}`);
            }
        });
    }

    /**
     * Returns the index of an `atom.Marker` watching a particular line in a particular path.
     *
     * @param {string} filePath
     *      The file which to which the marker is assigned.
     * @param {number} lineNum
     *      The line number to which the marker is assigned.
     * @returns {number}
     *      The index of the marker in `this.watchMarkers`, or -1 if not found.
     */
    _indexOfMarker(filePath, lineNum) {
        for(let i = 0; i < this.watchMarkers.length; i++) {
            const marker = this.watchMarkers[i];
            if(marker.getProperties().filePath === filePath && marker.getHeadBufferPosition().row === lineNum - 1) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Creates a new Atom marker to track the line of a watch expression.
     *
     * Atom's `Marker` objects can track position shifts from line insertion or deletions automatically, as well as
     * recognize when the line to which they've been assigned has been destroyed. We use these markers to track our
     * watch statements.
     *
     * We also decorate the `Marker` to provide a visual indicator of the watch statement.
     *
     * @param {string} filePath
     *      The path of the watched line.
     * @param {number} lineNum
     *      The number of the watched line at the time of marker creation.
     */
    _addWatchMarker(filePath, lineNum) {
        // see https://github.com/willyelm/xatom-debug/blob/master/lib/breakpoint/BreakpointManager.js
        let editor = atom.workspace.getActiveTextEditor();
        let cursorPosition = editor.getCursorBufferPosition();
        let marker = editor.markBufferPosition(cursorPosition);
        marker.setProperties({
            filePath,
            lineNum,
        });
        marker.onDidChange(e => {
            if (!(e.isValid)) {
                marker.destroy();
            }
        });
        this.watchMarkers.push(marker);

        let gutter = editor.gutterWithName('xnode-watch-gutter');
        gutter.decorateMarker(marker, {
            'type': 'gutter',
            'class': 'xn-watched-line',
        });
    }

    /**
     * Combine two action objects into one.
     *
     * Each watch statement and fetch request message sent to the execution engine contains a description of additional
     * actions that should be performed before a symbol table slice is sent back to `REPL`. Certain actions might be
     * requested by default by `REPL`, and so additional actions requested by a user need to be merged with those
     * default actions.
     *
     * @param {?object} a1:
     *      Mapping of action categories to string values, or `null` to return `a2` verbatim.
     * @param {?object} a2:
     *      Mapping of action categories to string values, or `null` to return `a1` verbatim.
     * @returns {object}
     *      A combined version of the two actions, ready to be converted to sent to the execution engine.
     */
     _mergeActions(a1, a2) {
        // TODO: as more actions are added, revisit this method
        if (a1 === null) return a2;
        if (a2 === null) return a1;
        let action = {};
        Object.entries(a1).forEach(([key, value]) => {
            if (key in a2) {
                action[key] = `${a2[key]}+${value}`
            } else {
                action[key] = value;
            }
        });
        Object.entries(a2).filter(([key]) => !(key in action)).forEach(([key, value]) => action[key] = value);
        return action;
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
            console.debug('repl -- received message', JSON.parse(message));
            let { viewSymbol, symbols, refresh, watchId, text, error } = JSON.parse(message);
            if (refresh) {
                this.store.dispatch(clearCanvasAction());
                this.store.dispatch(clearSymbolTableAction());
            }
            // TODO: should repl even know about freezing? or should the Python side instead?
            // Handle freezing of symbol slices and symbol IDs here, so the Redux store doesn't need to know about it
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
     * Toggles the existence of a watch statement at a given line.
     *
     * @param  {string} filePath
     *      Absolute path to the file with a line to watch/unwatch.
     * @param  {number} lineNum
     *      The line number in `filePath` to watch/unwatch.
     * @param  {?object} action
     *      Actions that the execution engine should perform on the generated symbol table slice before sending it to
     *      `REPL`, in the format described in `ACTION-SYMBOL-TABLE-SCHEMA.md`.
     */
    toggleWatchStatement(filePath, lineNum, action = null) {
        console.debug(`repl -- toggling watch statement (${filePath}, ${lineNum})`);
        const markerPos = this._indexOfMarker(filePath, lineNum);
        if (markerPos >= 0) {
            this.watchMarkers[markerPos].destroy();
            this.watchMarkers.splice(markerPos, 1);
            this.executionEngine.send(`unwatch:${filePath}?${lineNum}`);
        }
        else {
            this._addWatchMarker(filePath, lineNum);
            this.executionEngine.send(
                `watch:${filePath}?${lineNum}?${JSON.stringify(this._mergeActions(action, DEFAULT_ACTION))}`);
        }
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
        console.debug(`repl -- fetching symbol (${symbolId})`);
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
        this._shiftWatchStatements();
        this.executionEngine.send(`change:${file}?${changes}`);
    }
}
