'use babel';

import { CompositeDisposable, Disposable } from 'atom';

import REPL from './repl';
import path from 'path';

/**
 * This object is the top-level module required of an Atom package. It manages the lifecycle of the package when
 * activated by Atom, including the consumption of other services, the creation/destruction of the views, and state
 * serialization.
 */
export default {
    repls: [],
    subscriptions: null,

    /**
     * Run as package is starting up. Subscribe to Atom events: opening views, application/context menu commands.
     * @param state
     *     Object holding serialized state from last session, created through `serialize()`, if defined.
     */
    activate(state) {
        // Array of all REPL objects created by the package
        // TODO: how to destroy REPLs that are no longer open
        this.repls = [];
        // Use CompositeDisposable to easily clean up subscriptions on shutdown
        this.subscriptions = new CompositeDisposable(

            // Register openers to listen to particular URIs
            atom.workspace.addOpener(uri => {
                if(uri === 'atom://xnode-sandbox') {
                    const scriptPath = path.join(__dirname, "../dummy.py");  // TODO: Get rid of this! Make current script path.
                    let repl = new REPL(scriptPath);
                    this.repls.push(repl);
                    return repl;
                }
            }),

            // Register listener for whenever the active editor is edited
            atom.workspace.observeActiveTextEditor(editor => {
                if(editor) {
                    if(editor.gutterWithName('xnode-watch-gutter') === null) {
                        editor.addGutter({name: 'xnode-watch-gutter'});
                    }
                    const changes = null;  // TODO: get changes from last edit
                    editor.onDidSave(({path}) => {
                        this.repls.forEach(repl => {
                            repl.onFileChanged(path, changes);
                        })
                    });
                }
            }),

            // Register commands to `atom-workspace` (highest-level) scope
            atom.commands.add('atom-workspace', {
                'xnode:create-sandbox': () => this.createSandbox(),
                'xnode:watch-line': () => this.watchLine()
            }),

            // Destroy additional objects on package deactivation
            new Disposable(() => {
                atom.workspace.getPaneItems().forEach(item => {
                    if(item instanceof REPL) {
                        item.destroy();
                    }
                });
            })
        );

        console.debug('root -- Xnode package activated');
    },

    /**
     * Run as package is shutting down. Clears all subscriptions to Atom events.
     */
    deactivate() {
        this.subscriptions.dispose();
        console.debug('root -- Xnode package deactivated');
    },

    // =================================================================================================================
    // Consuming services
    // ------------------
    // Functions that are used by `package.json` to specify Atom services to consume.
    // =================================================================================================================

    // TODO: consume Ink


    // =================================================================================================================
    // Xnode-specific commands
    // =================================================================================================================

    /**
     * Creates a new sandbox for the open file in the current active editor.
     */
    createSandbox() {
        atom.workspace.toggle('atom://xnode-sandbox');
        console.debug('createSandbox() -- new sandbox for current active file');
    },

    /**
     * Adds a watch expression to the selected lines.
     * TODO: send the watch expression to selected REPL, use icon at line
     */
    watchLine() {
        let editor = atom.workspace.getActiveTextEditor();
        let cursorPosition = editor.getCursorBufferPosition();
        let selectedRepl = 0; // TODO: have a "selected repl" to add watches to
        // buffer coordinates are 0-indexed, but line numbers in Python are 1-indexed
        this.repls[selectedRepl].toggleWatchStatement(editor.getPath(), cursorPosition.row + 1);
    }
};
