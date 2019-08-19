import React from 'react';

function Hello() {
    return (<div>Hello, world!</div>);
}

describe('Hello world', () => {
    it('works', () => {
        cy.mount(<Hello/>);
        cy.contains('Hello');
    });
});
