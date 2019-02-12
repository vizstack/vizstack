/** @babel */
import { CompositeDisposable, Disposable } from 'atom';
import SandboxSettingsView from './views/sandbox-settings';

import REPL from './views/repl';

import { getMinimalDisambiguatedPaths } from './services/path-utils';
import yaml from "js-yaml";
import fs from 'fs';
import path from 'path';

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

    changedFiles: [],

    changeInterval: null,

    settings: {sandboxes: {}},

    settingsErrors: [],

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
                    const settingsPath = path.join(atom.project.getPaths()[0], 'xnode.yaml');
                    const repl = new REPL(uriTokens[3], (repl, sandboxName) =>
                        this.updateReplSandbox(repl, sandboxName, true));
                    this.repls.push(repl);
                    console.debug('root -- new REPL added');

                    if (!fs.existsSync(settingsPath)) {
                        this.createSettingsFile(settingsPath);
                    }
                    else {
                        this.reloadSettings(settingsPath);
                    }
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
                    atom.workspace.open(`atom://xnode-sandbox/${Math.max(...this.repls.map((repl) => repl.id)) + 1}`);
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

    createSettingsFile(settingsPath) {
        atom.workspace.open(settingsPath).then(editor => {
            editor.insertText('# Define your sandbox configurations here.\n');
            editor.insertText(yaml.safeDump({
                'sandboxes': {
                    'MySandbox1': {
                        'pythonPath' : null,
                        'scriptPath' : null,
                    }
                }
            }));
            editor.save();
            this.reloadSettings(settingsPath);
        });
    },

    /**
     * Rerun the REPL script if `delay` has elapsed since last change.
     * @param changedPath
     * @param changes
     * @param delay
     */
    waitAndRerun(changedPath, changes, delay) {
        this.changedFiles.push(changedPath);
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
                const changedSettingsFile = this.changedFiles.find(
                    (filePath) => filePath !== null && filePath.endsWith('xnode.yaml'));
                if (changedSettingsFile !== undefined) {
                    this.reloadSettings(changedSettingsFile);
                }
                this.changedFiles = [];
                clearInterval(this.changeInterval);
                this.repls
                    .filter((repl) => !repl.isDestroyed)
                    .forEach((repl) => {
                        console.debug('root -- signaling change to REPL');
                        // TODO: pass all of the changed files to the REPL
                        repl.onFileChanged(changedPath, changes);
                    });
            }
        }, delay + 10); // Allow some buffer time
    },

    updateReplSandbox(repl, sandboxName, shouldRerun) {
        repl.sandboxName = sandboxName;
        const { pythonPath, scriptPath } = this.settings.sandboxes[sandboxName];
        let error;
        if (typeof pythonPath !== 'string') {
            error = atom.notifications.addError(`"pythonPath" for sandbox ${sandboxName} in "xnode.yaml" must be a string.`);
            this.settingsErrors.push(error);
            return;
        }
        if (typeof scriptPath !== 'string') {
            error = atom.notifications.addError(`"scriptPath" for sandbox ${sandboxName} in "xnode.yaml" must be a string.`);
            this.settingsErrors.push(error);
            return;
        }
        repl.createEngine(pythonPath, scriptPath);
        if (shouldRerun) {
            this.waitAndRerun(null, null, RERUN_DELAY);
        }
    },

    reloadSettings(settingsPath) {
        this.settingsErrors.forEach((error) => error.dismiss());
        this.settingsErrors = [];
        let newSettings;
        try {
            newSettings = yaml.safeLoad(fs.readFileSync(settingsPath));
        }
        catch(e) {
            let error;
            if (e.name === 'YAMLException') {
                error = atom.notifications.addError('"xnode.yaml" could not be parsed successfully.', {
                    buttons: [
                        {
                            text: 'Retry',
                            onDidClick: () => this.reloadSettings(settingsPath),
                        }
                    ],
                    dismissable: true,
                });
            }
            else {
                error = atom.notifications.addError('"xnode.yaml" could not be found in this project.', {
                    buttons: [
                        {
                            text: 'Retry',
                            onDidClick: () => this.reloadSettings(settingsPath),
                        },
                        {
                            text: 'Create xnode.yaml',
                            onDidClick: () => this.createSettingsFile(settingsPath),
                        }
                    ],
                    dismissable: true,
                });
            }
            this.settingsErrors.push(error);
            return;
        }
        console.debug('root -- settings file updated', newSettings);
        if (typeof newSettings !== 'object' || newSettings === null || !('sandboxes' in newSettings)) {
            let error = atom.notifications.addError('"xnode.yaml" is missing the "sandboxes" field.', {
                buttons: [
                    {
                        text: 'Retry',
                        onDidClick: () => this.reloadSettings(settingsPath),
                    }
                ],
                dismissable: true,
            });
            this.settingsErrors.push(error);
            return;
        }
        const updatedSandboxes = [];
        const deletedSandboxes = [];

        Object.entries(this.settings.sandboxes)
            .forEach(([sandboxName, {pythonPath, scriptPath}]) => {
                if (!(sandboxName in newSettings.sandboxes)) {
                    deletedSandboxes.push(sandboxName);
                }
                else if (pythonPath !== newSettings.sandboxes[sandboxName].pythonPath ||
                         scriptPath !== newSettings.sandboxes[sandboxName].scriptPath) {
                    updatedSandboxes.push(sandboxName);
                }
            });

        this.settings = newSettings;

        this.repls.filter((repl) => !repl.isDestroyed).forEach((repl) => {
           if (deletedSandboxes.includes(repl.sandboxName)) {
               repl.destroy();
           }
           if (updatedSandboxes.includes(repl.sandboxName)) {
               this.updateReplSandbox(repl, repl.sandboxName, false);
           }
           repl.sandboxSelectComponent.updateSandboxes(this.settings.sandboxes);
        });
    },
};
