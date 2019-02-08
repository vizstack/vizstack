/** @babel */
import { CompositeDisposable, Disposable } from 'atom';
import SandboxSettingsView from './views/sandbox-settings';

import REPL from './views/repl';

import { getMinimalDisambiguatedPaths } from './services/path-utils';

// Elapsed time (in ms) while editor is unchanged before triggering a REPL script rerun.
let RERUN_DELAY = 2000;

/**
 * This object is the top-level module required of an Atom package. It manages the lifecycle of the package when
 * activated by Atom, including the consumption of other services, the creation/destruction of the views, and state
 * serialization.
 */
export default {
    // List of REPL objects that are active.
    repls: [],

    // Object that manages event listener/subscriber resources and is disposed on package close.
    subscriptions: null,

    // Time that the active editor was last changed.
    lastChangedTime: null,

    changeInterval: null,

    /**
     * Run as package is starting up. Subscribe to Atom events: opening views, application/context menu commands.
     * @param state
     *     Object holding serialized state from last session, created through `serialize()`, if defined.
     */
    activate(state) {
        // Use CompositeDisposable to easily clean up subscriptions on shutdown
        this.subscriptions = new CompositeDisposable(
            // Register openers to listen to particular URIs
            atom.workspace.addOpener((uri) => {
                if (uri.startsWith('atom://xnode-sandbox')) {
                    const uriTokens = uri.split('/');
                    const repl = new REPL(uriTokens[3], () => this.waitAndRerun(null, null, 0));
                    this.repls.push(repl);
                    console.debug('root -- new REPL added');
                    return repl;
                }
            }),

            // Register listener for whenever the active editor is changed
            atom.workspace.observeActiveTextEditor((editor) => {
                if (editor) {
                    if (editor.gutterWithName('xnode-watch-gutter') === null) {
                        editor.addGutter({ name: 'xnode-watch-gutter' });
                    }
                    const changes = null; // TODO: get changes from last edit
                    editor.onDidChange(() => {
                        editor.save();
                        this.waitAndRerun(editor.getPath(), changes, RERUN_DELAY);
                    });
                }
            }),

            // Register commands to `atom-workspace` (highest-level) scope
            atom.commands.add('atom-workspace', {
                'xnode:create-sandbox': () => {
                    atom.workspace.open(`atom://xnode-sandbox/${this.repls.length}`);
                }
            }),

            // Destroy additional objects on package deactivation
            new Disposable(() => {
                atom.workspace.getPaneItems().forEach((item) => {
                    if (item instanceof REPL) {
                        item.destroy();
                    }
                });
            }),
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
    // Xnode-specific commands
    // =================================================================================================================

    // onReplRename() {
    //     const minimalUniquePaths = getMinimalDisambiguatedPaths(
    //         this.repls
    //             .filter((repl) => !repl.isDestroyed)
    //             .map((repl) => repl.scriptPath),
    //     );
    //     this.repls
    //         .filter((repl) => !repl.isDestroyed)
    //         .forEach((repl) => {
    //             repl.name = minimalUniquePaths[repl.scriptPath];
    //         });
    // },

    /**
     * Opens a modal that allows users to open a sandbox after specifying key parameters.
     */
    openSandboxSettings() {
        this.sandboxSettingsView.resetElement(atom.workspace.getActiveTextEditor().getPath());
        this.sandboxSettingsPanel.show();
        console.debug('root -- sandbox settings panel opened');
    },

    /**
     * Rerun the REPL script if `delay` has elapsed since last change.
     * @param changedPath
     * @param changes
     * @param delay
     */
    waitAndRerun(changedPath, changes, delay) {
        this.lastChangedTime = new Date();
        clearInterval(this.changeInterval);
        this.changeInterval = setInterval(() => {
            this.repls
                .filter((repl) => !repl.isDestroyed)
                .forEach((repl) => {
                    repl.setTimeToFileChange(delay - (new Date() - this.lastChangedTime), delay);
                });
        }, 100);
        this.repls
            .filter((repl) => !repl.isDestroyed)
            .forEach((repl) => {
                repl.onFileEdit(changedPath, changes);
            });
        setTimeout(() => {
            const now = new Date();
            if (now - this.lastChangedTime >= delay) {
                clearInterval(this.changeInterval);
                this.repls
                    .filter((repl) => !repl.isDestroyed)
                    .forEach((repl) => {
                        console.debug('root -- signaling change to REPL');
                        repl.onFileChanged(changedPath, changes);
                    });
            }
        }, delay + 10); // Allow some buffer time
    },
};
