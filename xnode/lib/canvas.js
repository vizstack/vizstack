'use babel';

import React from 'react';
import ReactDOM from 'react-dom';

import PythonShell from 'python-shell';
import DashboardREPL from './repl';

// TODO find a better way to build views than using DOM API

/**
 * This class ...
 */
export default class Canvas {

    /**
     * Constructor.
     *
     * @param {Object} state
     *     Deserialized state object to use for re-initialization of the view.
     */
    constructor(state) {
        // this.buildElement();
        // Setup top-level DOM element for React
        this.element = document.createElement('div');


        this.engine = new ExecutionEngine();
        this.subscriptions = this.buildEditorListener();
    }

    /** Returns an object that can be retrieved when package is activated. */
    serialize() {}

    /** Tear down any state and detach from DOM. */
    destroy() {
        this.element.remove();
        this.subscriptions.dispose();
    }

    // Atom getter methods
    // -------------------

    getTitle() {
        // Used by Atom to show title in a tab
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
    getElement() {
        // Used by Atom to get the DOM element to be rendered
        return this.element;
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




}
