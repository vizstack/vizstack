from vizstack import *
from .test_utils import hash_ids, match_object


def test_class_instance_with_custom_view():
    class MyClass:
        def __view__(self):
            return Sequence().item(Text('hello')).item(Text('there'))

    obj = MyClass()
    view = assemble(obj)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['root-0', 'root-1'] },
        },
        'root-0': { 'type': 'TextPrimitive', 'contents': { 'text': 'hello' } },
        'root-1': { 'type': 'TextPrimitive', 'contents': { 'text': 'there' } },
    }))
