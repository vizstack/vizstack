
import React from 'react';

// Hack to make cypress-react-unit-test work with React Hooks.
import * as ReactDOM from 'react-dom';
// @ts-ignore
window.ReactDOM = ReactDOM;


import { Viewer, InteractionProvider, InteractionManager } from '../../../src';
import { assemble, Text } from '@vizstack/js';
import Hello from '../../../src/Hello'


describe('Fragments (Primitive)', () => {
    it('Text', () => {
        const view = assemble(Text("Hello, world!"));
        // const im = new InteractionManager();
        cy.mount(
            // <InteractionProvider manager={im}>
                <Viewer view={view}/>
            // </InteractionProvider>
        );
        cy.contains('Hello');
    });
});

// describe('Hello', () => {
//     it('works', () => {
//         cy.mount(
//             <Hello/>
//         );
//         cy.contains('Hello');
//     });
// });