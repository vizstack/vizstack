'use babel';

import PythonShell from 'python-shell';

export default class XnodeDashboard {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('xnode');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The Xnode package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);

    // Path is from the package root
    PythonShell.run('./lib/dummy.py', (err, results) => {
        if (err) throw err;
        message.textContent = results;
    })
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
      return 'right';
  }

  getAllowedLocations() {
      return ['left', 'right', 'bottom'];
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
