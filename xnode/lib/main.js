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
                if (editor !== null) {
                    if (editor.gutterWithName('watch-gutter') === null) {
                        editor.addGutter({name: 'watch-gutter'});
                    }
                    const editorPath = editor.getPath();
                    const changes = null;  // TODO: get changes from last edit
                    editor.onDidStopChanging(() => {
                        this.repls.forEach(repl => {
                            repl.onFileChanged(editorPath, changes);
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
    },

    /**
     * Run as package is shutting down. Clears all subscriptions to Atom events.
     */
    deactivate() {
        this.subscriptions.dispose();
    },

    // =================================================================================================================
    // Consuming services
    // ------------------
    // Functions that are used by `package.json` to specify Atom services to consume.
    // =================================================================================================================

    // TODO: consume Ink


    // =================================================================================================================
    // Xnode-specific functions
    // =================================================================================================================

    /** Creates a new sandbox for the file open in the current active editor. */
    createSandbox() {
        console.log("Creating Sandbox!");
        atom.workspace.toggle('atom://xnode-sandbox');
    },

    /**
     * Adds a watch expression to the selected lines.
     * TODO: send the watch expression to selected REPL, use icon at line
     */
    watchLine() {
        let editor = atom.workspace.getActiveTextEditor();
        let gutter = editor.gutterWithName('watch-gutter');
        let range = editor.getSelectedBufferRange();
        let marker = editor.markBufferRange(range);
        gutter.decorateMarker(marker, {
            'type': 'gutter',
            'class': 'watched-line',
        });
    }
};
