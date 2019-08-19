import React from 'react';
import { Viewer, InteractionProvider, InteractionManager } from '../../../src';
import { assemble, Text } from '@vizstack/js';


describe('Fragments (Primitive)', () => {
    it('Text', () => {
        const view = assemble(Text("Hello, world!"));
        const im = new InteractionManager();
        cy.mount(
            <InteractionProvider manager={im}>
                <Viewer view={view}/>
            </InteractionProvider>
        );
        cy.contains('Hello');
    });
});
