/** @babel */
import { CompositeDisposable, Disposable } from 'atom';
import SandboxSettingsView from './views/sandbox-settings';

import REPL from './views/repl';

import { getMinimalUniquePaths } from "./services/path-utils";

// How long, in milliseconds, the editor must be untouched before sandboxes are re-run
let RERUN_DELAY = 1000;

/**
 * This object is the top-level module required of an Atom package. It manages the lifecycle of the package when
 * activated by Atom, including the consumption of other services, the creation/destruction of the views, and state
 * serialization.
 */
export default {

    repls: [],
    subscriptions: null,
    // Whenever a change is made to the file, this is incremented; after RERUN_DELAY, it is decremented, and the REPLs
    // are re-run if it is 0 after that decrement. This ensures that the REPLs are re-run RERUN_DELAY ms after the last
    // edit.
    changeStack: 0,

    /**
     * Run as package is starting up. Subscribe to Atom events: opening views, application/context menu commands.
     * @param state
     *     Object holding serialized state from last session, created through `serialize()`, if defined.
     */
    activate(state) {
        // Array of all REPL objects created by the package
        // TODO: how to destroy REPLs that are no longer open
        this.repls = [];
        this.sandboxSettingsView = new SandboxSettingsView();
        this.sandboxSettingsPanel = atom.workspace.addModalPanel({
            item: this.sandboxSettingsView.getElement(),
            visible: false,
        });

        // Use CompositeDisposable to easily clean up subscriptions on shutdown
        this.subscriptions = new CompositeDisposable(

            // Register openers to listen to particular URIs
            atom.workspace.addOpener(uri => {
                if(uri.startsWith('atom://xnode-sandbox')) {
                    this.sandboxSettingsPanel.hide();
                    const tokens = uri.split('/');
                    const repl = new REPL(decodeURIComponent(tokens[3]), decodeURIComponent(tokens[4]));
                    this.repls.push(repl);
                    const minimalUniquePaths = getMinimalUniquePaths(this.repls.filter(repl => !repl.isDestroyed).map(repl => repl.scriptPath));
                    this.repls.filter(repl => !repl.isDestroyed).forEach(repl => {
                       repl.name = minimalUniquePaths[repl.scriptPath];
                    });
                    console.debug('root -- new REPL added');
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
                    editor.onDidChange(() => {
                        this.changeStack += 1;
                        setTimeout(() => {
                            this.changeStack -= 1;
                            if (this.changeStack === 0) {
                                editor.save();
                                this.repls.filter(repl => !repl.isDestroyed).forEach(repl => {
                                    console.debug('root -- signaling change to REPL');
                                    repl.onFileChanged(editor.getPath(), changes);
                                });
                            }
                        }, RERUN_DELAY);
                    });
                }
            }),

            // Register commands to `atom-workspace` (highest-level) scope
            atom.commands.add('atom-workspace', {
                'xnode:create-sandbox': () => this.openSandboxSettings(),
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
     * Opens a modal that allows users to open a sandbox after specifying key parameters.
     */
    openSandboxSettings() {
        this.sandboxSettingsView.resetElement(atom.workspace.getActiveTextEditor().getPath());
        this.sandboxSettingsPanel.show();
        console.debug('root -- sandbox settings panel opened');
    },

    /**
     * Adds a watch expression to the selected line for the selected REPL. No-op if no REPLs have been created yet.
     * TODO: send the watch expression to selected REPL, use icon at line
     */
    watchLine() {
        // No-op if no repls/sandboxes created yet
        if(this.repls.length === 0) return;

        let editor = atom.workspace.getActiveTextEditor();
        let cursorPosition = editor.getCursorBufferPosition();
        let selectedRepl = 0; // TODO: have a "selected repl" to add watches to

        // Buffer coordinates are 0-indexed, but line numbers in Python are 1-indexed
        this.repls[selectedRepl].toggleWatchStatement(editor.getPath(), cursorPosition.row + 1);
    },
};
