import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Viewer, InteractionManager, InteractionProvider } from '../src'
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
    ))
    .add('interactive token', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={assemble(
                Text("Hello, world!", "token")
            )} />
        </InteractionProvider>
    ));

storiesOf('Flow (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Flow(
                Text("Hello, world!"),
                Text("Goodbye!", "token"),
            )
        )}/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={assemble(
                Flow(
                    Text("Hello, world!"),
                    Text("Goodbye!", "token"),
                )
            )} />
        </InteractionProvider>
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
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={assemble(
                Switch(
                    ["foo", "bar"],
                    {
                        "foo": Text("FOO!"),
                        "bar": Text("BAR!"),
                    },
                )
            )} />
        </InteractionProvider>
    ));

storiesOf('Sequence (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            Sequence(
                [Text("A"), Text("B"), Text("C")]
            )
        )}/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={assemble(
                Sequence(
                    [Text("A"), Text("B"), Text("C")]
                )
            )}/>
        </InteractionProvider>
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
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
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
        </InteractionProvider>
    ));

storiesOf('KeyValue (Layout)', module)
    .add('basic', () => (
        <Viewer view={assemble(
            KeyValue(
                [{key: Text('Hello'), value: Text('World!')},
                 {key: Text('Good'), value: Text('Bye!')}]
            )
        )}/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={assemble(
                KeyValue(
                    [{key: Text('Hello'), value: Text('World!')},
                     {key: Text('Good'), value: Text('Bye!')}]
                )
            )}/>
        </InteractionProvider>
    ));