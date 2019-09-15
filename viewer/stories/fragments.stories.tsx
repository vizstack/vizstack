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
    Dag,
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

storiesOf('Integration', module)
    .add('interactive employee data structure', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Sequence([
                    Text("Johnny Appleseed", 'heading'),
                    Text("Joined on 9/1/2018", 'body', 'less'),
                    KeyValue([
                        [Text("status"), Token("active", 'green')],
                        [Text("employeeId"), Text("12345678")],
                        [Text("dateOfBirth"), Flow(Text('Oct'), Text('22'), Text('1986'))],
                        [Text("pastJobs"), Sequence([
                            Text("Software Engineer"), Text("UX Designer"), Text("AI Researcher")
                        ])]
                    ], { showLabels: false })
                ], { orientation: 'vertical', showLabels: false })
            } />
        </InteractionProvider>
    ));

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
    .add('inline block inline (mismatched baseline)', () => (
        <Viewer view={
            Flow(
                Text(kTextSingleShort),
                Token("Hello\nworld!"),
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
                { orientation:'horizontal', startMotif:'MySequence[3] [', endMotif:']'},
            )
        }/>
    ))
    .add('basic vertical', () => (
        <Viewer view={
            Sequence(
                [Text("Software"), Text("visualization"), Text("rocks!")],
                { orientation:'vertical', startMotif:'MySequence[3] [', endMotif:']'},
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
    .add('no labels', () => (
        <Viewer view={
            Sequence(
                [Text(kTextSingleShort),
                 Sequence(
                     [Text(kTextSingleShort), Text(kTextSingleShort)], { orientation: 'vertical' }
                 ),
                 Text(kTextSingleShort)],
                { showLabels: false }
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
    .add('newlines (\\n and |)', () => (
        <Viewer view={
            Grid('AAB\nCDD|EEE',
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
    .add('empty cells', () => (
        <Viewer view={
            Grid('A.B|CDE',
                {
                    A: Text("A"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("D"),
                    E: Text("E"),
                }
            )
        }/>
    ))
    .add('equal row/col', () => (
        <Viewer view={
            Grid('AB|CD',
                {
                    A: Text("AAA"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("D\nD"),
                }, { rowHeight: 'equal', colWidth: 'equal' }
            )
        }/>
    ))
    .add('no labels', () => (
        <Viewer view={
            Grid('A.B|C.D',
                {
                    A: Text("A"),
                    B: Text("B"),
                    C: Text("C"),
                    D: Text("D"),
                },
                { showLabels: false },
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
    .add('nested', () => (
        <Viewer view={
            Grid('AB|CD',{
                A: Grid('AB|CD', {
                        A: Text(kTextSingleShort),
                        B: Text(kTextSingleShort),
                        C: Text(kTextSingleShort),
                        D: Text(kTextSingleShort),
                    }),
                B: Text(kTextSingleShort),
                C: Text(kTextSingleShort),
                D: Text(kTextSingleShort),
            })
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                Grid('AAB|CCB',
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
                            A: Text(kTextSingleShort),
                            B: Text(kTextSingleShort),
                            C: Text(kTextSingleShort),
                            D: Text(kTextSingleShort),
                        }),
                    B: Text(kTextSingleShort),
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
                [Text('Egg yolks'), Text('6 yolks')],
                [Text('White sugar'), Text('6 tbsp')],
                [Text('Heavy cream'), Text('2 1/2 cups')],
                [Text('Vanilla extract'), Text('1/2 tsp')],
            ], { startMotif: 'MyKeyValue[4] {', endMotif: '}'})
        }/>
    ))
    .add('long list', () => (
        <Viewer view={
            KeyValue([
                [Text('First day'), Text('A partridge in a pear tree')],
                [Text('Second day'), Text('Two turtle doves')],
                [Text('Third day'), Text('Three French hens')],
                [Text('Fourth day'), Text('Four calling birds')],
                [Text('Fifth day'), Text('Five golden rings')],
                [Text('Sixth day'), Text('Six geese a-laying')],
                [Text('Seventh day'), Text('Seven swans a-swimming')],
                [Text('Eighth day'), Text('Eight maids a-milking')],
                [Text('Ninth day'), Text('Nine ladies dancing')],
                [Text('Tenth day'), Text('Ten lords a-leaping')],
                [Text('Eleventh day'), Text('Eleven pipers piping')],
                [Text('Twelfth day'), Text('Twelve drummers drumming')],
            ])
        }/>
    ))
    .add('wide key', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text(kTextSingleLong), Text('Dos')],
                [Text('Three'), Text('Tres')],
            ])
        }/>
    ))
    .add('wide value', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text('Two'), Text(kTextSingleLong)],
                [Text('Three'), Text('Tres')],
            ])
        }/>
    ))
    .add('tall key', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text(kTextMultiNarrowDeep), Text('Dos')],
                [Text('Three'), Text('Tres')],
            ])
        }/>
    ))
    .add('tall value', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text('Two'), Text(kTextMultiNarrowDeep)],
                [Text('Three'), Text('Tres')],
            ])
        }/>
    ))
    .add('align separators', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text('Two'), Text('Dos')],
                [Text('Three'), Text('Tres')],
            ], { alignSeparators: true })
        }/>
    ))
    .add('no labels', () => (
        <Viewer view={
            KeyValue([
                [Text('One'), Text('Uno')],
                [Text('Two'), Text('Dos')],
                [Text('Three'), Text('Tres')],
            ], { showLabels: false })
        }/>
    ))
    .add('nested', () => (
        <Viewer view={
            KeyValue([
                [Token('One'), Text('Uno')],
                [Flow(Text('Two')), Flow(Text('Dos'))],
                [Text('Three'), Sequence([Token('Tres'), Token('3'), Token('Three')])],
            ])
        }/>
    ))
    .add('interactive', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                KeyValue([
                    [Text('Egg yolks'), Text('6 yolks')],
                    [Text('White sugar'), Text('6 tbsp')],
                    [Text('Heavy cream'), Text('2 1/2 cups')],
                    [Text('Vanilla extract'), Text('1/2 tsp')],
                ])
            }/>
        </InteractionProvider>
    ))
    .add('interactive (empty)', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={
                KeyValue([])
            }/>
        </InteractionProvider>
    ));

storiesOf('Dag (Layout)', module)
    .add('basic', () => (
        <Viewer view={
            Dag().node("hello", {}, ["h", "e", "r", "r", "o"]).node("world", {}, "world").edge("hello", "world")
        }/>
    ))
