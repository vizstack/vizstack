/** @babel */
import { CompositeDisposable, Disposable } from 'atom';
import SandboxSettingsView from './views/sandbox-settings';

import REPL from './views/repl';

import { getMinimalDisambiguatedPaths } from './services/path-utils';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Elapsed time (in ms) while editor is unchanged before triggering a REPL script rerun.
let RERUN_DELAY = 0;

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

    settings: { sandboxes: {} },

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
                        this.updateReplSandbox(repl, sandboxName, true),
                    );
                    this.repls.push(repl);
                    console.debug('root -- new REPL added');

                    if (!fs.existsSync(settingsPath)) {
                        this.createSettingsFile(settingsPath);
                    } else {
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
                    editor.onDidSave(() => {
                        this.waitAndRerun(editor.getPath(), changes, RERUN_DELAY);
                    });
                }
            }),

            // Register commands to `atom-workspace` (highest-level) scope
            atom.commands.add('atom-workspace', {
                'xnode:show-canvas': () => {
                    const replId =
                        this.repls.length > 0
                            ? Math.max(...this.repls.map((repl) => repl.id)) + 1
                            : 0;
                    atom.workspace.open(`atom://xnode-sandbox/${replId}`);
                },
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
        atom.workspace.open(settingsPath).then((editor) => {
            editor.insertText('# Define your sandbox configurations here.\n');
            editor.insertText(
                yaml.safeDump({
                    sandboxes: {
                        MySandbox1: {
                            pythonPath: 'TODO: specify a Python executable',
                            scriptPath: 'TODO: specify a Python script to run',
                            scriptArgs: [],
                        },
                    },
                }),
            );
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
                    (filePath) => filePath !== null && filePath.endsWith('xnode.yaml'),
                );
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
        const { pythonPath, scriptPath, scriptArgs } = this.settings.sandboxes[sandboxName];
        repl.sandboxName = sandboxName;
        repl.createEngine(pythonPath, scriptPath, scriptArgs);
        if (shouldRerun) {
            this.waitAndRerun(null, null, RERUN_DELAY);
        }
    },

    parseSettings(settingsPath) {
        let settings;
        let error;
        const createErrorNotification = (message, extraButtons) => {
            return atom.notifications.addError(message, {
                buttons: [
                    {
                        text: 'Retry',
                        onDidClick: () => this.reloadSettings(settingsPath),
                    },
                    ...extraButtons,
                ],
                dismissable: true,
            });
        };

        try {
            settings = yaml.safeLoad(fs.readFileSync(settingsPath));
        } catch (e) {
            if (e.name === 'YAMLException') {
                error = createErrorNotification(
                    '"xnode.yaml" could not be parsed successfully.',
                    [],
                );
            } else {
                error = createErrorNotification(
                    '"xnode.yaml" could not be found in this project.',
                    [
                        {
                            text: 'Create xnode.yaml',
                            onDidClick: () => this.createSettingsFile(settingsPath),
                        },
                    ],
                );
            }
            return { error };
        }
        if (typeof settings !== 'object' || settings === null || !('sandboxes' in settings)) {
            error = createErrorNotification('"xnode.yaml" is missing the "sandboxes" field.', []);
            return { error };
        }
        for (let [sandboxName, sandbox] of Object.entries(settings.sandboxes)) {
            if (typeof sandbox !== 'object' || sandbox === null) {
                error = createErrorNotification(
                    `Sandbox ${sandboxName} must be an object with "pythonPath", "scriptPath", and "scriptArgs" fields.`,
                    [],
                );
                return { error };
            }
            const { pythonPath, scriptPath, scriptArgs } = sandbox;
            if (typeof pythonPath !== 'string') {
                error = createErrorNotification(
                    `"pythonPath" for sandbox ${sandboxName} in "xnode.yaml" must be a string.`,
                    [],
                );
                return { error };
            }
            if (typeof scriptPath !== 'string') {
                error = createErrorNotification(
                    `"scriptPath" for sandbox ${sandboxName} in "xnode.yaml" must be a string.`,
                    [],
                );
                return { error };
            }
            if (!Array.isArray(scriptArgs)) {
                error = createErrorNotification(
                    `"scriptArgs" for sandbox ${sandboxName} in "xnode.yaml" must be a list.`,
                    [],
                );
                return { error };
            }
        }
        return { settings };
    },

    reloadSettings(settingsPath) {
        console.debug('root -- settings file updated');
        this.settingsErrors.forEach((error) => error.dismiss());
        this.settingsErrors = [];
        const { settings: newSettings, error } = this.parseSettings(settingsPath);
        if (error !== undefined) {
            this.settingsErrors.push(error);
            return;
        }

        const updatedSandboxes = new Set();
        const deletedSandboxes = new Set();

        Object.entries(this.settings.sandboxes).forEach(
            ([sandboxName, { pythonPath, scriptPath, scriptArgs }]) => {
                if (!(sandboxName in newSettings.sandboxes)) {
                    deletedSandboxes.add(sandboxName);
                } else if (
                    pythonPath !== newSettings.sandboxes[sandboxName].pythonPath ||
                    scriptPath !== newSettings.sandboxes[sandboxName].scriptPath ||
                    scriptArgs !== newSettings.sandboxes[sandboxName].scriptArgs
                ) {
                    updatedSandboxes.add(sandboxName);
                }
            },
        );

        this.settings = newSettings;

        this.repls
            .filter((repl) => !repl.isDestroyed)
            .forEach((repl) => {
                if (deletedSandboxes.has(repl.sandboxName)) {
                    repl.destroy();
                }
                if (updatedSandboxes.has(repl.sandboxName)) {
                    this.updateReplSandbox(repl, repl.sandboxName, false);
                }
                repl.sandboxSelectComponent.updateSandboxes(this.settings.sandboxes);
            });
    },
};
