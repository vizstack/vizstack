
import React from 'react';

// Hack to make cypress-react-unit-test work with React Hooks.
import * as ReactDOM from 'react-dom';
// @ts-ignore
window.ReactDOM = ReactDOM;

import { Viewer, InteractionProvider, InteractionManager } from '../../../src';
import {
    assemble,
    Text,
    Image,
    Flow,
    Switch,
    Sequence,
    Grid,
    KeyValue,
} from '@vizstack/js';


describe('Fragments (Primitive)', () => {
    it('Text basic', () => {
        cy.mount(<Viewer view={assemble(
            Text("Hello, world!")
        )}/>);
        cy.contains('Hello');
    });

    // it('Image basic', () => {
    //     cy.mount(<Viewer view={assemble(
    //         Image("Hello, world!")
    //     )}/>);
    //     cy.contains('Hello');
    // });
});

describe('Fragments (Layout)', () => {
    it('Flow basic', () => {
        cy.mount(<Viewer view={assemble(
            Flow(
                Text("Hello, world!"),
                Text("Goodbye!"),
            )
        )}/>);
        cy.contains('Hello');
        cy.contains('Goodbye');
    });

    it('Switch basic', () => {
        cy.mount(<Viewer view={assemble(
            Switch(
                ["foo", "bar"],
                {
                    "foo": Text("FOO!"),
                    "bar": Text("BAR!"),
                },
            )
        )}/>);
        cy.contains('FOO');
        cy.should('not.contain', 'BAR');
    });

    it('Sequence basic', () => {
        cy.mount(<Viewer view={assemble(
            Sequence(
                [Text("A"), Text("B"), Text("C")]
            )
        )}/>);
        cy.contains('A');
        cy.contains('B');
        cy.contains('C');
    });

    it('Grid basic', () => {
        cy.mount(<Viewer view={assemble(
            Grid(
                `AAB
                 CDD`,
                {
                    A: Text("A"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("D"),
                }
            )
        )}/>);
        cy.contains('A');
        cy.contains('B');
        cy.contains('C');
        cy.contains('D');
    });

    it('KeyValue basic', () => {
        cy.mount(<Viewer view={assemble(
            KeyValue(
                [{key: Text('Hello'), value: Text('World!')}]
            )
        )}/>);
        cy.contains('Hello');
    });
});