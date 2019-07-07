import { View, Fragment, FragmentId } from '@vizstack/schema';
import {
    assemble,
    Text,
    Image,
    Flow,
    Grid,
    Sequence,
    KeyValue,
    Switch,
    Dag,
} from './';

function getFragmentId(name: string, parentId: FragmentId): FragmentId {
    return `${parentId}-${name}`;
}

describe('View Assemblers declarative bindings', () => {
    
    test('Fragment with metadata', () => {
        const viz = Text("herro").meta("arr", [1,2,3]);
        const schema = assemble(viz, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'TextPrimitive',
                contents: { text: 'herro' },
                meta: { arr: [1, 2, 3] },
            }
        });
    });

    test('Primitive basic (Text)', () => {
        const viz = Text("herro", 'token');
        const schema = assemble(viz, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'TextPrimitive',
                contents: {
                    text: 'herro',
                    variant: 'token',
                }
            }
        });
    });

    test('Primitive basic (Image)', () => {
        const viz = Image("mypath.jpg");
        const schema = assemble(viz, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': { type: 'ImagePrimitive', contents: { filePath: 'mypath.jpg' } }
        });
    });
    
    test('Layout basic (Sequence)', () => {
        const viz = Sequence([Text("herro"), Text("there")], 'vertical', '[', ']');
        const schema = assemble(viz, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SequenceLayout',
                contents: {
                    elements: ['root-0', 'root-1'],
                    orientation: 'vertical',
                    startMotif: '[',
                    endMotif: ']',
                }
            },
            'root-0': { type: 'TextPrimitive', contents: { text: 'herro' } },
            'root-1': { type: 'TextPrimitive', contents: { text: 'there' } },
        });
    });

    test('Layout with default id generator (Sequence)', () => {
        const viz = Sequence([Text("herro"), Text("there")]);
        const schema = assemble(viz);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SequenceLayout',
                contents: { elements: ['OZb3FBqdia', 'iFFzkzVSDF'] }
            },
            'OZb3FBqdia': { type: 'TextPrimitive', contents: { text: 'herro' } },
            'iFFzkzVSDF': { type: 'TextPrimitive', contents: { text: 'there' } },
        });
    });

    test('Layout with duplicate elements (Sequence)', () => {
        const text = Text("herro");
        const viz = Sequence([text, text]);
        const schema = assemble(viz, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SequenceLayout',
                contents: { elements: ['root-0', 'root-0'] }
            },
            'root-0': { type: 'TextPrimitive', contents: { text: 'herro' } },
        });
    });

});

describe('Custom Views defined by user', () => {
    
    test('Class with custom view', () => {
        class MyClass {
            __view__() {
                return (
                    Sequence()
                    .item(Text("herro"))
                    .item(Text("there"))
                );
            }
        }
        const obj = new MyClass();
        const schema = assemble(obj, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SequenceLayout',
                contents: { elements: ['root-0', 'root-1'] }
            },
            'root-0': { type: 'TextPrimitive', contents: { text: 'herro' } },
            'root-1': { type: 'TextPrimitive', contents: { text: 'there' } },
        });
    });

});

describe('Language-specific defaults', () => {
    
    test('JS primitive (number)', () => {
        const schema = assemble(123, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': { type: 'TextPrimitive', contents: { text: '123' } },
        });
    });

    test('JS primitive (string)', () => {
        const schema = assemble("123", getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': { type: 'TextPrimitive', contents: { text: '"123"' } },
        });
    });

    test('JS composite (Array)', () => {
        const schema = assemble(['herro', 'there'], getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SwitchLayout',
                contents: { modes: ['root-full', 'root-summary'] }
            },
            'root-full': {
                type: 'SequenceLayout',
                contents: { elements: ['root-full-0', 'root-full-1'] }
            },
            'root-full-0': { type: 'TextPrimitive', contents: { text: '"herro"' } },
            'root-full-1': { type: 'TextPrimitive', contents: { text: '"there"' } },
            'root-summary': { type: 'TextPrimitive' },
        });
    });

    test('JS composite with duplicate elements (Array)', () => {
        const text = 'herro';
        const schema = assemble([text, text], getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SwitchLayout',
                contents: { modes: ['root-full', 'root-summary'] }
            },
            'root-full': {
                type: 'SequenceLayout',
                contents: { elements: ['root-full-0', 'root-full-0'] }
            },
            'root-full-0': { type: 'TextPrimitive', contents: { text: '"herro"' } },
            'root-summary': { type: 'TextPrimitive' },
        });
    });

    test('JS composite with self-reference (Array)', () => {
        const arr: any[] = ['herro'];
        arr.push(arr);
        const schema = assemble(arr, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SwitchLayout',
                contents: { modes: ['root-full', 'root-summary'] }
            },
            'root-full': {
                type: 'SequenceLayout',
                contents: { elements: ['root-full-0', 'root'] }
            },
            'root-full-0': { type: 'TextPrimitive', contents: { text: '"herro"' } },
            'root-summary': { type: 'TextPrimitive' },
        });
    });

    test('JS class without custom view', () => {
        class MyClass {}
        const obj = new MyClass();
        const schema = assemble(obj, getFragmentId);
        expect(schema.fragments).toMatchObject({
            'root': {
                type: 'SwitchLayout',
                contents: { modes: ['root-full', 'root-summary'] }
            },
            'root-full': { type: 'KeyValueLayout' },
            'root-summary': { type: 'TextPrimitive' },
        });
    });
});