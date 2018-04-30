'use babel';

import PythonShell from 'python-shell';
import ExecutionEngine from './execution-engine';

// TODO find a better way to build views than using DOM API
export default class XnodeDashboardView {

    constructor(serializedState) {
        this.buildElement();
        this.engine = new ExecutionEngine();
        this.subscriptions = this.buildEditorListener();
    }

    /**
     * Build the root element of the view.
     */
    buildElement() {
        this.element = document.createElement('div');

        // TODO use an EditorView instead of input, which is broken inside of Atom panes
        this.input = document.createElement('input');
        this.input.setAttribute('type', 'text');
        this.element.appendChild(this.input);

        this.message = document.createElement('div');
        this.element.appendChild(this.message);
    }

    /**
     * Return a listener which reloads view contents whenever the active text editor is changed.
     * @return {Disposable} the text editor listener
     */
    buildEditorListener() {
        atom.workspace.observeActiveTextEditor(editor => {
            editor.onDidStopChanging(() => {
                this.reloadContents();
            });
        });
    }

    /**
     * Reload the contents of the view.
     */
    reloadContents() {
        this.engine.run(this.input.value, {}, null, (results, err) => this.message.innerHTML = results);
    }

    getTitle() {
      // Title shown in Atom tab
      return 'Xnode Dashboard';
    }

    getURI() {
      // Used by Atom to identify the view when opening
      return 'atom://xnode-dashboard';
    }

    getDefaultLocation() {
        // Used by Atom to place the pane in the window
        return 'right';
    }

    getAllowedLocations() {
        // Used by Atom to place the pane in the window
        return ['left', 'right', 'bottom'];
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {}

    // Tear down any state and detach
    destroy() {
        this.element.remove();
        this.subscriptions.dispose();
    }

    getElement() {
        // Returns the DOM element to be rendered
        return this.element;
    }

}
