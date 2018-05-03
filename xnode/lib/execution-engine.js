'use babel';

import PythonShell from 'python-shell';
import { spawn } from 'child_process';

const EXECUTE_PATH = './resources/execute.py';

export default class ExecutionEngine{

    /**
     * Constructor.
     * @param {string} scriptPath      the path to the script that the engine should execute. The engine remains
     *                                 associated with this script, rerunning if needed after every file edit.
     * @param {Object} watchStatements a collection of statements which indicate which variables in the Python program
     *                                 should be evaluated and at which line evaluation should take place.
     * @param {Function} onUpdate      a function of signature `(symbolData)` to be called whenever a variable is
     *                                 evaluated in the Python program.
     */
    constructor(scriptPath, watchStatements, onUpdate) {
        this.scriptPath = scriptPath;
        this.watchStatements = watchStatements;
        this.onUpdate = onUpdate;
        this.shell = null;
        // just for testing purposes
        this.onFileChanged();
    }

    /**
     * Called by the package whenever a file is updated.
     *
     * The engine should determine whether or not the change requires a re-run of the Python script, and which parts
     * of the script must be run.
     * @param  {string} filePath path to the file that was changed.
     * @param  {Object} diff     indicates what part of the file changed.
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
     * This function should be changed or removed as caching is added.
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
