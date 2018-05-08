'use babel';

import { CompositeDisposable, Disposable } from 'atom';

import REPL from './repl';

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
        // Use CompositeDisposable to easily clean up subscriptions on shutdown
        this.subscriptions = new CompositeDisposable(
            // Register openers to listen to particular URIs
            atom.workspace.addOpener(uri => {
                if (uri === 'atom://xnode-sandbox') {
                    const scriptPath = "../dummy.py";  // TODO: Get rid of this! Make current script path.
                    return new REPL(scriptPath);
                }
            }),

            // Register commands to `atom-workspace` (highest-level) scope
            atom.commands.add('atom-workspace', {
                'xnode:create-sandbox': () => this.createSandbox()
            }),

            // Destroy additional objects on package deactivation
            new Disposable(() => {
                atom.workspace.getPaneItems().forEach(item => {
                    if (item instanceof REPL) {
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
    }
};
