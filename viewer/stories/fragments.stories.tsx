import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Viewer, InteractionManager, InteractionProvider } from '../src'
import {
    Text,
    Image,
    Flow,
    Switch,
    Sequence,
    Grid,
    KeyValue,
} from '@vizstack/js';

const kTextSingleShort = (
    "Hello, world!"
);

const kTextSingleLong = (
    "Software visualization refers to the visualization of information of and related to software systems and their development process by means of static, interactive, or animated 2D or 3D visual representations of their structure, execution, behavior, and evolution."
);

const kTextMultiWide = (
    `Software visualization refers to the visualization of information of and related to software
    systems and their development process by means of static, interactive, or animated 2D or 3D
    visual representations of their structure, execution, behavior, and evolution.`
);;

const kTextMultiNarrow = (
    `Software
    visualization
    rocks!`
);

const kTextMultiNarrowDeep = (
    `The
    quick
    brown
    fox
    jumps
    over
    the
    lazy
    dog.`
);

storiesOf('Text (Primitive)', module)
    .add('plain single short', () => (
        <Viewer view={
            Text(kTextSingleShort)
        }/>
    ))
    .add('plain single long', () => (
        <Viewer view={
            Text(kTextSingleLong)
        }/>
    ))
    .add('plain multi narrow', () => (
        <Viewer view={
            Text(kTextMultiNarrow)
        }/>
    ))
    .add('plain multi wide', () => (
        <Viewer view={
            Text(kTextMultiWide)
        }/>
    ))
    .add('token single short', () => (
        <Viewer view={
            Text(kTextSingleShort, "token")
        }/>
    ))
    .add('token single long', () => (
        <Viewer view={
            Text(kTextSingleLong, "token")
        }/>
    ))
    .add('token multi narrow', () => (
        <Viewer view={
            Text(kTextMultiNarrow, "token")
        }/>
    ))
    .add('token multi wide', () => (
        <Viewer view={
            Text(kTextMultiWide, "token")
        }/>
    ))
    .add('interactive plain single short', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextSingleShort)
            } />
        </InteractionProvider>
    ))
    .add('interactive plain multi narrow', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextMultiNarrow)
            } />
        </InteractionProvider>
    ))
    .add('interactive token single short', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextSingleShort, "token")
            } />
        </InteractionProvider>
    ))
    .add('interactive token multi narrow', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextMultiNarrow, "token")
            } />
        </InteractionProvider>
    ));


storiesOf('Flow (Layout)', module)
    .add('inline inline inline', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort),
                Text(kTextMultiNarrow),
                Text(kTextSingleShort),
            )
        }/>
    ))
    .add('inline block inline', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort),
                Text(kTextMultiNarrow, "token"),
                Text(kTextSingleShort),
            )
        }/>
    ))
    .add('block inline block', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort, "token"),
                Text(kTextMultiNarrow),
                Text(kTextSingleShort, "token"),
            )
        }/>
    ))
    .add('block block block', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort, "token"),
                Text(kTextMultiNarrow, "token"),
                Text(kTextSingleShort, "token"),
            )
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Flow(
                    Text(kTextSingleShort),
                    Text(kTextMultiNarrow, "token"),
                    Text(kTextSingleShort),
                )
            } />
        </InteractionProvider>
    ));

storiesOf('Switch (Layout)', module)
    .add('basic', () => (
        <Viewer view={
            Switch(
                ["foo", "bar", "baz"],
                {
                    foo: Text("Software"),
                    bar: Text("visualization"),
                    baz: Text("rocks!"),
                },
            )
        }/>
    ))
    .add('interactive basic', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Switch(
                    ["foo", "bar", "baz"],
                    {
                        foo: Text("Software"),
                        bar: Text("visualization"),
                        baz: Text("rocks!"),
                    },
                )
            }/>
        </InteractionProvider>
    ))
    .add('interactive with repeats', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Switch(
                    ["foo", "bar", "foo"],
                    {
                        foo: Text("Software"),
                        bar: Text("visualization"),
                    },
                )
            }/>
        </InteractionProvider>
    ));

storiesOf('Sequence (Layout)', module)
    .add('basic', () => (
        <Viewer view={
            Sequence(
                [Text("Software"), Text("visualization"), Text("rocks!")]
            )
        }/>
    ))
    .add('tall element', () => (
        <Viewer view={
            Sequence(
                [Text(kTextSingleShort), Text(kTextMultiNarrow), Text(kTextSingleShort)]
            )
        }/>
    ))
    .add('wide element', () => (
        <Viewer view={
            Sequence(
                [Text(kTextSingleShort), Text(kTextSingleLong), Text(kTextSingleShort)]
            )
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Sequence(
                    [Text(kTextSingleShort, 'token'), Text(kTextMultiNarrow, 'token'), Text(kTextSingleShort, 'token')]
                )
            }/>
        </InteractionProvider>
    ));

storiesOf('Grid (Layout)', module)
    .add('basic', () => (
        <Viewer view={
            Grid(
                `AAB
                 CDD`,
                {
                    A: Text(kTextSingleShort),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text(kTextSingleShort),
                }
            )
        }/>
    ))
    .add('wide element', () => (
        <Viewer view={
            Grid(
                `AAB
                 CDD
                 EFG`,
                {
                    A: Text(kTextSingleShort),
                    B: Text("B"),
                    C: Text(kTextSingleShort),
                    D: Text(kTextSingleShort),
                    E: Text("E"),
                    F: Text("F"),
                    G: Text("G"),
                }
            )
        }/>
    ))
    .add('tall element', () => (
        <Viewer view={
            Grid(
                `AAB
                 CDD
                 EFG`,
                {
                    A: Text(kTextSingleShort),
                    B: Text("B"),
                    C: Text(kTextMultiNarrow),
                    D: Text(kTextSingleShort),
                    E: Text("E"),
                    F: Text("F"),
                    G: Text("G"),
                }
            )
        }/>
    ))
    .add('tall element tall cell', () => (
        <Viewer view={
            Grid(
                `AAB
                 CDD
                 CFG`,
                {
                    A: Text(kTextSingleShort),
                    B: Text("B"),
                    C: Text(kTextMultiNarrow),
                    D: Text(kTextSingleShort),
                    F: Text("F"),
                    G: Text("G"),
                }
            )
        }/>
    ))
    .add('empty cells', () => (
        <Viewer view={
            Grid(
                `A.B
                 C.D`,
                {
                    A: Text("A"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("D"),
                }
            )
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Grid(
                    `AAAB
                     .CCB`,
                    {
                        A: Text(kTextSingleShort, 'token'),
                        B: Text(kTextMultiNarrow, 'token'),
                        C: Text(kTextSingleShort, 'token'),
                    }
                )
            }/>
        </InteractionProvider>
    ));

storiesOf('KeyValue (Layout)', module)
    .add('basic', () => (
        <Viewer view={
            KeyValue([
                {key: Text('Egg yolks'), value: Text('6 yolks')},
                {key: Text('White sugar'), value: Text('6 tbsp')},
                {key: Text('Heavy cream'), value: Text('2 1/2 cups')},
                {key: Text('Vanilla extract'), value: Text('1/2 tsp')},
            ])
        }/>
    ))
    .add('long list', () => (
        <Viewer view={
            KeyValue([
                {key: Text('First day'), value: Text('A partridge in a pear tree')},
                {key: Text('Second day'), value: Text('Two turtle doves')},
                {key: Text('Third day'), value: Text('Three French hens')},
                {key: Text('Fourth day'), value: Text('Four calling birds')},
                {key: Text('Fifth day'), value: Text('Five golden rings')},
                {key: Text('Sixth day'), value: Text('Six geese a-laying')},
                {key: Text('Seventh day'), value: Text('Seven swans a-swimming')},
                {key: Text('Eighth day'), value: Text('Eight maids a-milking')},
                {key: Text('Ninth day'), value: Text('Nine ladies dancing')},
                {key: Text('Tenth day'), value: Text('Ten lords a-leaping')},
                {key: Text('Eleventh day'), value: Text('Eleven pipers piping')},
                {key: Text('Twelfth day'), value: Text('Twelve drummers drumming')},
            ])
        }/>
    ))
    .add('wide key', () => (
        <Viewer view={
            KeyValue([
                {key: Text('One'), value: Text('Uno')},
                {key: Text(kTextSingleLong), value: Text('Dos')},
                {key: Text('Three'), value: Text('Tres')},
            ])
        }/>
    ))
    .add('wide value', () => (
        <Viewer view={
            KeyValue([
                {key: Text('One'), value: Text('Uno')},
                {key: Text('Two'), value: Text(kTextSingleLong)},
                {key: Text('Three'), value: Text('Tres')},
            ])
        }/>
    ))
    .add('tall key', () => (
        <Viewer view={
            KeyValue([
                {key: Text('One'), value: Text('Uno')},
                {key: Text(kTextMultiNarrowDeep), value: Text('Dos')},
                {key: Text('Three'), value: Text('Tres')},
            ])
        }/>
    ))
    .add('tall value', () => (
        <Viewer view={
            KeyValue([
                {key: Text('One'), value: Text('Uno')},
                {key: Text('Two'), value: Text(kTextMultiNarrowDeep)},
                {key: Text('Three'), value: Text('Tres')},
            ])
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                KeyValue([
                    {key: Text('Egg yolks', 'token'), value: Text('6 yolks', 'token')},
                    {key: Text('White sugar', 'token'), value: Text('6 tbsp', 'token')},
                    {key: Text('Heavy cream', 'token'), value: Text('2 1/2 cups', 'token')},
                    {key: Text('Vanilla extract', 'token'), value: Text('1/2 tsp', 'token')},
                ])
            }/>
        </InteractionProvider>
    ));