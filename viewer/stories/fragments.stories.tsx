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
import compgraph from './compgraph';

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
            Dag()
                .node("hello", {}, ["h", "e", "l", "l", "o"])
                .node("world", {}, "world")
                .edge("hello", "world")
        }/>
    ))
    .add('flow direction', () => (
        <Viewer view={
            Dag('east')
                .node("hello", {}, ["h", "e", "l", "l", "o"])
                .node("world", {}, "world")
                .edge("hello", "world")
        }/>
    ))
    .add('alignments', () => (
        <Viewer view={
            Dag()
                .node("hello", {}, ["h", "e", "l", "l", "o"])
                .node("world", {}, "world\nworld")
                .node("moon", {alignWith: {axis: 'x', nodes: ["world"], justify: 'north'}}, "moon")
                .edge("hello", "world")
                .edge("hello", "moon")
        }/>
    ))
    .add('interactive', () => (
      <InteractionProvider manager={new InteractionManager()}>
          <Viewer view={
              Dag()
                .node("hello", {parent: "parent"}, ["h", "e", "l", "l", "o"])
                .node("world", {}, "world")
                .edge("hello", "world")
                .node("parent", {}, "parent")
          }/>
      </InteractionProvider>
    ))
    .add('compgraph', () => (
        <InteractionProvider manager={new InteractionManager()}>
            <Viewer view={JSON.parse(compgraph)}/>
        </InteractionProvider>
      ))
    .add('compgraph2', () => {
        const cg2 = {'rootId': 'root', 'fragments': {'root': {'type': 'DagLayout', 'contents': {'nodes': {'0': {'flowDirection': 'south', 'children': ['1', '15'], 'fragmentId': 'aZTico6sbQ'}, '1': {'flowDirection': 'south', 'children': [], 'ports': {'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '53V9+epctP'}, '2': {'flowDirection': 'south', 'children': [], 'ports': {'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '7YYEtYqGae'}, '3': {'flowDirection': 'south', 'children': [], 'ports': {'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'k4/98KzMW0'}, '4': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'i1': {'side': 'north', 'order': 1}, 'i2': {'side': 'north', 'order': 2}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'zk1ZC7quyN'}, '5': {'flowDirection': 'south', 'children': ['2', '3', '4'], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'oGD7tWu3y/'}, '6': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'nXRP9TJT1i'}, '7': {'flowDirection': 'south', 'children': [], 'ports': {'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'l3GDdVUdvs'}, '8': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'i1': {'side': 'north', 'order': 1}, 'i2': {'side': 'north', 'order': 2}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'qQcPdXzZnc'}, '9': {'flowDirection': 'south', 'children': ['7', '8'], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '75LRSUCPQ/'}, '10': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '2QBl9x8VD0'}, '11': {'flowDirection': 'south', 'children': [], 'ports': {'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '1/UznmQGiG'}, '12': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'i1': {'side': 'north', 'order': 1}, 'i2': {'side': 'north', 'order': 2}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'BmcmXyO+ie'}, '13': {'flowDirection': 'south', 'children': ['11', '12'], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'H7DlKXD74V'}, '14': {'flowDirection': 'south', 'children': [], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': 'FEciab03El'}, '15': {'flowDirection': 'east', 'children': ['15_0', '15_1', '15_2'], 'ports': {'i0': {'side': 'north', 'order': 0}, 'o0': {'side': 'south', 'order': 0}}, 'fragmentId': '9tUNR6OCbG'}, '15_0': {'flowDirection': 'south', 'isVisible': true, 'children': ['5', '6'], 'fragmentId': 'p9LbCV8Jc0'}, '15_1': {'flowDirection': 'south', 'isVisible': true, 'children': ['9', '10'], 'fragmentId': 'p9LbCV8Jc0'}, '15_2': {'flowDirection': 'south', 'isVisible': true, 'children': ['13', '14'], 'fragmentId': 'p9LbCV8Jc0'}}, 'edges': {'e0': {'source': {'id': '1', 'port': 'o0'}, 'target': {'id': '15', 'port': 'i0'}, 'label': null}, 'e1': {'source': {'id': '15', 'port': 'i0'}, 'target': {'id': '5', 'port': 'i0'}, 'label': null}, 'e2': {'source': {'id': '2', 'port': 'o0'}, 'target': {'id': '4', 'port': 'i0'}, 'label': null}, 'e3': {'source': {'id': '5', 'port': 'i0'}, 'target': {'id': '4', 'port': 'i1'}, 'label': null}, 'e4': {'source': {'id': '3', 'port': 'o0'}, 'target': {'id': '4', 'port': 'i2'}, 'label': null}, 'e5': {'source': {'id': '4', 'port': 'o0'}, 'target': {'id': '5', 'port': 'o0'}, 'label': null}, 'e6': {'source': {'id': '5', 'port': 'o0'}, 'target': {'id': '6', 'port': 'i0'}, 'label': null}, 'e7': {'source': {'id': '6', 'port': 'o0'}, 'target': {'id': '9', 'port': 'i0'}, 'label': null}, 'e8': {'source': {'id': '2', 'port': 'o0'}, 'target': {'id': '8', 'port': 'i0'}, 'label': null}, 'e9': {'source': {'id': '9', 'port': 'i0'}, 'target': {'id': '8', 'port': 'i1'}, 'label': null}, 'e10': {'source': {'id': '7', 'port': 'o0'}, 'target': {'id': '8', 'port': 'i2'}, 'label': null}, 'e11': {'source': {'id': '8', 'port': 'o0'}, 'target': {'id': '9', 'port': 'o0'}, 'label': null}, 'e12': {'source': {'id': '9', 'port': 'o0'}, 'target': {'id': '10', 'port': 'i0'}, 'label': null}, 'e13': {'source': {'id': '10', 'port': 'o0'}, 'target': {'id': '13', 'port': 'i0'}, 'label': null}, 'e14': {'source': {'id': '2', 'port': 'o0'}, 'target': {'id': '12', 'port': 'i0'}, 'label': null}, 'e15': {'source': {'id': '13', 'port': 'i0'}, 'target': {'id': '12', 'port': 'i1'}, 'label': null}, 'e16': {'source': {'id': '11', 'port': 'o0'}, 'target': {'id': '12', 'port': 'i2'}, 'label': null}, 'e17': {'source': {'id': '12', 'port': 'o0'}, 'target': {'id': '13', 'port': 'o0'}, 'label': null}, 'e18': {'source': {'id': '13', 'port': 'o0'}, 'target': {'id': '14', 'port': 'i0'}, 'label': null}, 'e19': {'source': {'id': '14', 'port': 'o0'}, 'target': {'id': '15', 'port': 'o0'}, 'label': null}}, 'alignments': [{'axis': 'x', 'justify': 'north', 'nodes': ['9', '5']}, {'axis': 'x', 'justify': 'north', 'nodes': ['13', '9']}]}, 'meta': {}}, 'aZTico6sbQ': {'type': 'TokenPrimitive', 'contents': {'text': 'str'}, 'meta': {}}, '53V9+epctP': {'type': 'TokenPrimitive', 'contents': {'text': 'rand'}, 'meta': {}}, '7YYEtYqGae': {'type': 'TokenPrimitive', 'contents': {'text': 'Parameter'}, 'meta': {}}, 'k4/98KzMW0': {'type': 'TokenPrimitive', 'contents': {'text': 'Tensor'}, 'meta': {}}, 'zk1ZC7quyN': {'type': 'TokenPrimitive', 'contents': {'text': 'addmm'}, 'meta': {}}, 'oGD7tWu3y/': {'type': 'TokenPrimitive', 'contents': {'text': 'Linear'}, 'meta': {}}, 'nXRP9TJT1i': {'type': 'TokenPrimitive', 'contents': {'text': 'relu'}, 'meta': {}}, 'l3GDdVUdvs': {'type': 'TokenPrimitive', 'contents': {'text': 'Tensor'}, 'meta': {}}, 'qQcPdXzZnc': {'type': 'TokenPrimitive', 'contents': {'text': 'addmm'}, 'meta': {}}, '75LRSUCPQ/': {'type': 'TokenPrimitive', 'contents': {'text': 'Linear'}, 'meta': {}}, '2QBl9x8VD0': {'type': 'TokenPrimitive', 'contents': {'text': 'relu'}, 'meta': {}}, '1/UznmQGiG': {'type': 'TokenPrimitive', 'contents': {'text': 'Tensor'}, 'meta': {}}, 'BmcmXyO+ie': {'type': 'TokenPrimitive', 'contents': {'text': 'addmm'}, 'meta': {}}, 'H7DlKXD74V': {'type': 'TokenPrimitive', 'contents': {'text': 'Linear'}, 'meta': {}}, 'FEciab03El': {'type': 'TokenPrimitive', 'contents': {'text': 'relu'}, 'meta': {}}, '9tUNR6OCbG': {'type': 'TokenPrimitive', 'contents': {'text': 'Model'}, 'meta': {}}, 'p9LbCV8Jc0': {'type': 'TextPrimitive', 'contents': {'text': 'null'}, 'meta': {}}}}
        return (
            <InteractionProvider manager={new InteractionManager()}>
                <Viewer view={cg2 as any}/>
            </InteractionProvider>
        )
    })
