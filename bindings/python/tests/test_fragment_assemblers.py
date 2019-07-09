from vizstack import *
from vizstack.view_assembler import ViewAssembler
from .test_utils import hash_ids, match_object


def test_fragment_with_metadata():
    text = Text("hello").meta("arr", [1,2,3])
    view = assemble(text)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'meta': { 'arr': [1, 2, 3] },
        }
    }))


def test_text_primitive():
    text = Text("hello", variant='token')
    view = assemble(text)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'TextPrimitive',
            'contents': {
                'text': 'hello',
                'variant': 'token',
            }
        }
    }))


def test_image_primitive():
    image = Image('mypath.jpg')
    view = assemble(image)
    assert match_object(view['fragments'], hash_ids({
        'root': {'type': 'ImagePrimitive', 'contents': {'filePath': 'mypath.jpg'}}
    }))


def test_sequence_layout():
    sequence = Sequence([Text('hello'), Text('there')], orientation='vertical', start_motif='[', end_motif=']')
    view = assemble(sequence)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SequenceLayout',
            'contents': {
                'elements': ['root-0', 'root-1'],
                'orientation': 'vertical',
                'startMotif': '[',
                'endMotif': ']',
            },
        },
        'root-0': { 'type': 'TextPrimitive', 'contents': { 'text': 'hello' } },
        'root-1': { 'type': 'TextPrimitive', 'contents': { 'text': 'there' } },
    }))


def test_sequence_with_default_id_generator(capsys):
    sequence = Sequence([Text('hello'), Text('there')])
    view = assemble(sequence)
    assert match_object(view['fragments'], {
        'root': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['OZb3FBqdia', 'iFFzkzVSDF'] },
        },
        'OZb3FBqdia': { 'type': 'TextPrimitive', 'contents': { 'text': 'hello' }, },
        'iFFzkzVSDF': { 'type': 'TextPrimitive', 'contents': { 'text': 'there' }, },
    })


def test_layout_with_duplicates():
    text = Text('hello')
    sequence = Sequence([text, text])
    view = assemble(sequence)
    assert match_object(view, hash_ids({
        'rootId': ViewAssembler._ROOT_ID,
        'fragments': {
            'root': {
                'type': 'SequenceLayout',
                'contents': { 'elements': ['root-0', 'root-0'] }
            },
            'root-0': { 'type': 'TextPrimitive', 'contents': { 'text': 'hello' } },
        }
    }))


def test_layout_with_self_reference():
    sequence = Sequence()
    sequence.item(sequence)
    view = assemble(sequence)
    assert match_object(view, hash_ids({
        'rootId': ViewAssembler._ROOT_ID,
        'fragments': {
            'root': {
                'type': 'SequenceLayout',
                'contents': { 'elements': ['root'] }
            },
        }
    }))
