import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Viewer } from '../src'
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

storiesOf('Text (Primitive)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Text("Hello, world!")
        )}/>
    ));

storiesOf('Flow (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Flow(
                Text("Hello, world!"),
                Text("Goodbye!"),
            )
        )}/>
    ));

storiesOf('Switch (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Switch(
                ["foo", "bar"],
                {
                    "foo": Text("FOO!"),
                    "bar": Text("BAR!"),
                },
            )
        )}/>
    ));

storiesOf('Sequence (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Sequence(
                [Text("A"), Text("B"), Text("C")]
            )
        )}/>
    ));

storiesOf('Grid (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Grid(
                `AAB
                 CDD`,
                {
                    A: Text("AA"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("DD"),
                }
            )
        )}/>
    ));

storiesOf('KeyValue (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            KeyValue(
                [{key: Text('Hello'), value: Text('World!')}]
            )
        )}/>
    ));