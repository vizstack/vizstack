'use babel';

import PythonShell from 'python-shell';

export default class ExecutionEngine{

    constructor() {}

    /**
     * Executes a Python script.
     * @param  {string}   scriptPath        the path to the Python script
     * @param  {Object}   watchStatements   which variables should have their values watched and returned; has form TODO
     * @param  {?Object}  diff              changes since the last call to run; has form TODO
     * @param  {function} callback          a `(results, err)` function where `results` are the values of watched
     *                                          variables, in Xnode symbol schema format? TODO
     */
    run(scriptPath, watchStatements, diff, callback) {
        PythonShell.run(scriptPath, (err, results) => callback(results, err));
    }
}
