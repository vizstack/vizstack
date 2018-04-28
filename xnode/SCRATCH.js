'use babel';

import IdeView from './ide-view';
import { CompositeDisposable } from 'atom';

export default {

  ideView: null,
  modalPanel: null,
  subscriptions: null,
  cons: null,

  consumeInk(ink) {
    this.cons = ink.Console.fromId('my-language-client');
  },

  activate(state) {
    this.ideView = new IdeView(state.ideViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.ideView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'ide:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.ideView.destroy();
  },

  serialize() {
    return {
      ideViewState: this.ideView.serialize()
    };
  },

  toggle() {
    console.log('Ide was toggled!');
    return (
      this.cons.open({
        split: 'down',
        searchAllPanes: true,
      })

      // this.modalPanel.isVisible() ?
      // this.modalPanel.hide() :
      // this.modalPanel.show()
    );
  }

};
