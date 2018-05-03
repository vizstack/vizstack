'use babel';

import { CompositeDisposable, Disposable } from 'atom';

import XnodeDashboardView from './xnode-dashboard-view';
import ExecutionEngine from './execution-engine';

export default {
    subscriptions: null,

    activate(state) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable(
            atom.workspace.addOpener(uri => {
                if (uri === 'atom://xnode-dashboard') {
                    return new XnodeDashboardView();
                }
            }),

            atom.commands.add('atom-workspace', {
                'xnode:toggle': () => this.toggle()
            }),

            new Disposable(() => {
                atom.workspace.getPaneItems().forEach(item => {
                    if (item instanceof XnodeDashboard) {
                        item.destroy();
                    }
                });
            })
        );
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    // From flight manual: with workspace items, it's possible to have more than one instance
    // of a given view, and each can have its own state, so each should do its own serialization.
    // serialize() {
    //   return {
    //     xnodeViewState: this.xnodeView.serialize()
    //   };
    // },

    toggle() {
        // As a test, let's just create an arbitrary engine
        let engine = new ExecutionEngine(null, null, (data) => {console.log(data)});
        atom.workspace.toggle('atom://xnode-dashboard');
    }
};
