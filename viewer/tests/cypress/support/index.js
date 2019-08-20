// Hack from https://github.com/bahmutov/cypress-react-unit-test/issues/51 to make cypress-react-unit-test work with React Hooks.
Cypress.on('window:load', win => {
    win.ReactDOM = window.ReactDOM || win.ReactDOM;
});

import 'cypress-react-unit-test';
