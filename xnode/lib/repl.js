'use babel';

import PythonShell from 'python-shell';
import { spawn } from 'child_process';

const EXECUTE_PATH = './engine.py';

export default class REPL {

    /**
     * Constructor.
     *
     * @param {string} scriptPath
     *     The path to the script that the engine should execute. The engine remains associated with this script,
     *     rerunning if needed after every file edit.
     */
    constructor(scriptPath) {
        this.watchStatements = [];
        this.executionEngine = startEngine(scriptPath);

        // TODO intialize store

        // just for testing purposes
        this.onFileChanged();

        /// TODO: attach subscriptler for on file changed when created --> pull up
    }

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
     * Called by the package whenever a file is updated.
     *
     * Sends the diff to the engine, which decides what parts, if any, of the script need to be rerun.
     *
     * @param  {string} filePath
     *     Path to the file that was changed.
     * @param  {object} diff
     *     Indicates what part of the file changed.
     */
    onFileChanged(filePath, diff) {
        // TODO: convert diff to string that is understood by engine
        diff = '';
        this.executionEngine.send(`change:${filePath}?${diff}`)
    }
}
