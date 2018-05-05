'use babel';

import PythonShell from 'python-shell';
import { spawn } from 'child_process';

const EXECUTE_PATH = './resources/execute.py';

export default class REPL {

    /**
     * Constructor.
     *
     * @param {string} scriptPath
     *     The path to the script that the engine should execute. The engine remains associated with this script,
     *     rerunning if needed after every file edit.
     * @param {Object} watchStatements
     *     A collection of statements which indicate which variables in the Python program should be evaluated and
     *     at which line evaluation should take place.
     * @param {Function} onUpdate
     *     A function of signature `(symbolData)` to be called whenever a variable is evaluated in the Python program.
     */
    constructor(scriptPath) {
        this.scriptPath = scriptPath;
        this.watchStatements = [];
        this.executionEngine = null;

        // TODO intialize store

        // just for testing purposes
        this.onFileChanged();

        /// TODO: attach subscriptler for on file changed when created --> pull up
    }

    /**
     * Called by the package whenever a file is updated.
     *
     * The engine should determine whether or not the change requires a re-run of the Python script, and which parts
     * of the script must be run.
     *
     * @param  {string} filePath
     *     Path to the file that was changed.
     * @param  {Object} diff
     *     Indicates what part of the file changed.
     */
    onFileChanged(filePath, diff) {
        // TODO check file to see if relevant, caching
        this.endExistingShell();
        this.run();
    }

    endExistingShell() {
        // TODO test this; could be that shell might have already ended? also, does this kill the shell immediately?
        //
        if (this.shell !== null) {
            this.shell.end();
            this.shell = null;
        }
    }

    /**
     * Runs the entirety of the associated Python script.
     *
     * TODO This function should be changed or removed as caching is added.
     */
    run() {
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
