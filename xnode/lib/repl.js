'use babel';

// Python services
import PythonShell from 'python-shell';
import { spawn } from 'child_process';

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
const EXECUTE_PATH = './execute.py';

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
        this.executionEngine = null;   // Communication channel with Python process

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
    // =================================================================================================================

    /**
     * Determines whether the given `changes` to `file` warrant a re-run of this REPL's main script (or certain parts
     * of it).
     *
     * @param  {string} file
     *     Path of file that was changed.
     * @param  {object} changes
     *     Indicates what part of the file changed.
     */
    onFileChanged(file, changes) {
        // TODO: Smarter file checking, re-run caching. Right now, assumes all changes are relevant and re-runs the
        // script.
        this.endShell();
        this.startShell();
    }

    /** Ends the shell execution, if it has not already ended. */
    endShell() {
        // TODO: Test this -- could be that shell might have already ended? also, does this kill the shell immediately?
        if (this.shell !== null) {
            this.shell.end();
            this.shell = null;
        }
    }

    /**
     * Starts the shell execution of the associated Python script.
     * TODO: Right now, a new process is started each time the shell is started. But should presumably keep old process.
     */
    startShell() {
        let options = {
            args: ['c:\\users\\ryan holmdahl\\documents\\github\\xnode\\xnode\\xnode\\lib\\dummy.py:10', '--script', './lib/dummy.py'],
        }
        this.shell = new PythonShell(EXECUTE_PATH, options);
        let onUpdate = this.onUpdate;
        this.shell.on('message', (message) => {
            console.log(message);
            let { data, shells } = JSON.parse(message);
            // TODO store data and shells locally
            onUpdate(data);
        });
    }
}
