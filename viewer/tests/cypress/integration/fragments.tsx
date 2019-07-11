import React from 'react';
import { Viewer } from '../../../src/Viewer';


test('works', () => {
    cy.mount(<Viewer/>);
    cy.contains('Herro');
});