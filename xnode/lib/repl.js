'use babel';

// React + Redux services
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider as ReduxProvider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';

// Material UI services
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import createMuiTheme from 'material-ui/styles/createMuiTheme';

// Python services
import PythonShell from 'python-shell';
import path from 'path';

// Custom top-level React/Redux components
import Canvas from './components/Canvas';
import mainReducer from './reducers';
import { addSymbolsAction, clearSymbolTableAction } from './actions/program';
import { addViewerAction, clearCanvasAction } from './actions/canvas';

/** Path to main Python module for `ExecutionEngine`. */
const EXECUTION_ENGINE_PATH = 'engine.py'; // path.join(__dirname, 'engine.py');

// TODO: change this to accommodate graphs
const DEFAULT_ACTION = {
    recurse: 'creatorop+args+kwargs+container'
};

/** CSS-in-JS custom theme object to set visual properties (fonts, colors, spacing, etc.) of Material UI components.
 *  For in depth description and list of overridable keys: <material-ui-next.com/customization/themes/> */
const theme = createMuiTheme({
    spacing: {
        unit: 5,
    },
    typography: {
        htmlFontSize: 10,
        monospace: {
            fontFamily: '"Roboto Mono", "Courier", monospace',
        }
    },
});

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
        this.watchMarkers = [];
        // this.watchStatements = {};     // Mapping of file->lineno->{actions:[], decorations: []} for each watched line
        this.executionEngine = this.startEngine(scriptPath);   // Communication channel with Python process

        // Initialize Redux store & connect to main reducer
        this.store = createStore(mainReducer, composeWithDevTools(
            applyMiddleware(thunk),
        ));

        // Initialize React root component for Canvas
        this.element = document.createElement('div');
        ReactDOM.render(
            <ReduxProvider store={this.store}>
                <MuiThemeProvider theme={theme}>
                    <Canvas fetchSymbolData={(symbolId) => this.fetchSymbolData(symbolId)} />
                </MuiThemeProvider>
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
     */
    shiftWatchStatements() {
        this.watchMarkers.forEach(marker => {
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
     * Returns the index of a `Marker` watching a particular line in a particular path.
     *
     * @param {string} filePath
     *      The file which to which the marker is assigned.
     * @param {number} lineNum
     *      The line number to which the marker is assigned.
     * @returns {number}
     *      The index of the marker in `this.watchMarkers`, or -1 if not found.
     */
    indexOfMarker(filePath, lineNum) {
        for(let i = 0; i < this.watchMarkers.length; i++) {
            const marker = this.watchMarkers[i];
            if(marker.getProperties().filePath === filePath && marker.getHeadBufferPosition().row === lineNum - 1) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Deletes a watch statement.
     *
     * @param {number} markerPos
     *      The index of the watch statement's line marker in `this.watchMarkers`.
     */
    removeWatchMarker(markerPos) {
        this.watchMarkers.splice(markerPos, 1);
    }

    /**
     * Creates a new Atom marker to track the line of a watch expression.
     *
     * Atom's `Marker` objects can track position shifts from line insertion or deletions automatically, as well as
     * recognize when the line to which they've been assigned has been destroyed. We use these markers to track our
     * watch statements.
     *
     * @param {string} filePath
     *      The path of the watched line.
     * @param {number} lineNum
     *      The number of the watched line at the time of marker creation.
     */
    addWatchMarker(filePath, lineNum) {
    	// TODO: this assumes that the active editor contains the changed file
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

    // TODO: use smarter encoding here
    stringifyWatchAction(action) {
        let str = '';
        Object.entries(action).forEach(([key, value]) => {
            str+=`${key}:${value};`;
        });
        return str;
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
    startEngine(scriptPath, pythonPath='python') {
        // TODO: remove these hard codes:
        pythonPath = 'C:\\Anaconda2\\envs\\pytorch\\python.exe';
        let options = {
            args: [scriptPath],
            pythonPath,
            scriptPath: __dirname,
        };
        let executionEngine = new PythonShell(EXECUTION_ENGINE_PATH, options);
        executionEngine.on('message', (message) => {
            console.debug('executionEngine -- received message: ', message);
            let { viewSymbol, symbols, refresh, watchCount } = JSON.parse(message);
            if (refresh) {
                this.store.dispatch(clearCanvasAction());  // TODO: don't wipe the canvas completely
                this.store.dispatch(clearSymbolTableAction());
            }
            if (symbols) {
                this.store.dispatch(addSymbolsAction(symbols, watchCount));
            }
            if (viewSymbol !== null) {
                this.store.dispatch(addViewerAction(viewSymbol, watchCount));
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
        const markerPos = this.indexOfMarker(filePath, lineNum);
        if (markerPos >= 0) {
            this.removeWatchMarker(markerPos);
            this.executionEngine.send(`unwatch:${filePath}?${lineNum}`);
        }
        else {
            // TODO: use passed-in action
            this.addWatchMarker(filePath, lineNum);
            this.executionEngine.send(`watch:${filePath}?${lineNum}?${this.stringifyWatchAction(DEFAULT_ACTION)}`);
        }
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
        console.debug(`repl -- fetching symbol (${symbolId})`);
        // TODO: switch from recurse as an option to the watch action format?
        this.executionEngine.send(`fetch:${symbolId}?${DEFAULT_ACTION['recurse']}`);
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
        this.shiftWatchStatements();
        this.executionEngine.send(`change:${file}?${changes}`);
    }
}
