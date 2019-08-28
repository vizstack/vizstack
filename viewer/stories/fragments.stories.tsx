import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Viewer, InteractionManager, InteractionProvider } from '../src'
import {
    Text,
    Token,
    Icon,
    Image,
    Flow,
    Switch,
    Sequence,
    Grid,
    KeyValue,
} from '@vizstack/js';

const kTextSingleShort = (
    "Vizstack"
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
    .add('single short', () => (
        <Viewer view={
            Text(kTextSingleShort)
        }/>
    ))
    .add('single long', () => (
        <Viewer view={
            Text(kTextSingleLong)
        }/>
    ))
    .add('multi narrow', () => (
        <Viewer view={
            Text(kTextMultiNarrow)
        }/>
    ))
    .add('multi wide', () => (
        <Viewer view={
            Text(kTextMultiWide)
        }/>
    ))
    .add('variants', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort, "caption"),
                Text(kTextSingleShort, "body"),
                Text(kTextSingleShort, "subheading"),
                Text(kTextSingleShort, "heading"),
            )
        }/>
    ))
    .add('emphasis', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort, undefined, "less"),
                Text(kTextSingleShort, undefined, "normal"),
                Text(kTextSingleShort, undefined, "more"),
            )
        }/>
    ))
    .add('newline', () => (
        <Viewer view={
            Text(`${kTextSingleShort}\n${kTextSingleShort}`)
        } />
    ))
    .add('interactive single short', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextSingleShort)
            } />
        </InteractionProvider>
    ))
    .add('interactive multi narrow', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Text(kTextMultiNarrow)
            } />
        </InteractionProvider>
    ));

storiesOf('Token (Primitive)', module)
    .add('single short', () => (
        <Viewer view={
            Token(kTextSingleShort)
        }/>
    ))
    .add('single long', () => (
        <Viewer view={
            Token(kTextSingleLong)
        }/>
    ))
    .add('multi narrow', () => (
        <Viewer view={
            Token(kTextMultiNarrow)
        }/>
    ))
    .add('multi wide', () => (
        <Viewer view={
            Token(kTextMultiWide)
        }/>
    ))
    .add('interactive colors', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Flow(
                    Token("Hello", "gray"),
                    Token("Hello", "brown"),
                    Token("Hello", "purple"),
                    Token("Hello", "blue"),
                    Token("Hello", "green"),
                    Token("Hello", "yellow"),
                    Token("Hello", "orange"),
                    Token("Hello", "red"),
                    Token("Hello", "pink"),
                )
            }/>
        </InteractionProvider>
        
    ))
    .add('interactive single short', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Token(kTextSingleShort)
            } />
        </InteractionProvider>
    ))
    .add('interactive multi narrow', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Token(kTextMultiNarrow)
            } />
        </InteractionProvider>
    ));

storiesOf('Icon (Primitive)', module)
    .add('basic', () => (
        <Viewer view={
            Flow(
                Icon('account_circle'),
                Icon('announcement'),
                Icon('label'),
                Icon('alarm'),
                Icon('delete'),
            )
        }/>
    ))
    .add('emphasis', () => (
        <Viewer view={
            Flow(
                Icon('account_circle', "less"),
                Icon('account_circle', "normal"),
                Icon('account_circle', "more"),
            )
        }/>
    ))
    .add('with text', () => (
        <Viewer view={
            Flow(
                Icon('account_circle'),
                Text(kTextSingleShort),
            )
        }/>
    ))
    .add('special cases', () => (
        <Viewer view={
            Flow(
                Icon('add_circle'),
            )
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Flow(
                    Icon('account_circle'),
                    Text(kTextSingleShort),
                )
            }/>
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
                Token(kTextMultiNarrow),
                Text(kTextSingleShort),
            )
        }/>
    ))
    .add('block inline block', () => (
        <Viewer view={
            Flow(
                Token(kTextSingleShort),
                Text(kTextMultiNarrow),
                Token(kTextSingleShort),
            )
        }/>
    ))
    .add('block block block', () => (
        <Viewer view={
            Flow(
                Token(kTextSingleShort),
                Token(kTextMultiNarrow),
                Token(kTextSingleShort),
            )
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Flow(
                    Text(kTextSingleShort),
                    Token(kTextMultiNarrow),
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
    .add('basic horizontal', () => (
        <Viewer view={
            Sequence(
                [Text("Software"), Text("visualization"), Text("rocks!")],
                "horizontal",
                '[',
                ']',
            )
        }/>
    ))
    .add('basic vertical', () => (
        <Viewer view={
            Sequence(
                [Text("Software"), Text("visualization"), Text("rocks!")],
                "vertical",
                '[',
                ']',
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
                    [Text(kTextSingleShort), Text(kTextMultiNarrow), Text(kTextSingleShort)]
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
    .add('nested', () => (
        <Viewer view={
            Grid(
                `AB
                 CD`,
                {
                    A: Grid(
                        `AB
                         CD`,
                        {
                            A: Text("A"),
                            B: Text("B"),
                            C: Text("C"),
                            D: Text("D"),
                        }),
                    B: Text("B"),
                    C: Text(kTextSingleShort),
                    D: Text(kTextSingleShort),
                }
            )
        }/>
    ))
    .add('newlines (\\n and |)', () => (
        <Viewer view={
            Grid(
                `AAB\nCDD|EEE`,
                {
                    A: Text(kTextSingleShort),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text(kTextSingleShort),
                    E: Text(kTextSingleShort),
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
                        A: Text(kTextSingleShort),
                        B: Text(kTextMultiNarrow),
                        C: Text(kTextSingleShort),
                    }
                )
            }/>
        </InteractionProvider>
    ))
    .add('interactive (nested)', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Grid('AB|CD',{
                    A: Grid('AB|CD', {
                            A: Text("A"),
                            B: Text("B"),
                            C: Text("C"),
                            D: Text("D"),
                        }),
                    B: Text("B"),
                    C: Text(kTextSingleShort),
                    D: Text(kTextSingleShort),
                })
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
                    {key: Text('Egg yolks'), value: Text('6 yolks')},
                    {key: Text('White sugar'), value: Text('6 tbsp')},
                    {key: Text('Heavy cream'), value: Text('2 1/2 cups')},
                    {key: Text('Vanilla extract'), value: Text('1/2 tsp')},
                ])
            }/>
        </InteractionProvider>
    ));