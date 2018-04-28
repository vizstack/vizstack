'use babel';

import XnodeView from './xnode-view';
import { CompositeDisposable } from 'atom';

export default {

  xnodeView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.xnodeView = new XnodeView(state.xnodeViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.xnodeView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'xnode:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.xnodeView.destroy();
  },

  serialize() {
    return {
      xnodeViewState: this.xnodeView.serialize()
    };
  },

  toggle() {
    console.log('Xnode was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
