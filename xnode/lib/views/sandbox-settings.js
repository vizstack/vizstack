'use babel';

import React from 'react';
import ReactDOM from 'react-dom';
import SandboxSettingsComponent from '../components/atom/SandboxSettings';

export default class SandboxSettingsView {

    /**
     * Constructor.
     * Create a <div> for the `SandboxSettings` React components to be added to.
     */
    constructor() {
        // Initialize React root component for Canvas
        this.element = document.createElement('div');
    }

    /**
     * Returns an object that can be retrieved when package is activated.
     */
    serialize() {}

    /**
     * Tear down state and detach.
     */
    destroy() {
        this.element.remove();
        console.debug('destroy() -- SandboxSettingsView instance destroyed');
    }

    /**
     * Used by Atom to get the DOM element to be rendered.
     */
    getElement() {
        return this.element;
    }

    /**
     * Resets the React component in the view, supplying the given default script path.
     *
     * The React component will show `defaultScriptPath` as the suggested script that the sandbox should run, and allow
     * the user to change that parameter and the path to the Python executable that will run it. The user can then send
     * a message to `main` to open the sandbox.
     *
     * @param {string} defaultScriptPath
     *      A path to a script that should be supplied as the sandbox's target script by default.
     */
    resetElement(defaultScriptPath) {
        ReactDOM.unmountComponentAtNode(this.element);
        ReactDOM.render(
            <SandboxSettingsComponent defaultScriptPath={defaultScriptPath} />,
            this.element
        );
    }
}