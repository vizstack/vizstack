from vizstack import *
from .utils import hash_ids, match_object


def test_class_instance_with_custom_view_should_use_custom_view():
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


def test_class_with_custom_view_should_not_use_custom_view():
    class MyClass:
        def __view__(self):
            return Text('should not see this')

    view = assemble(MyClass)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': { 'type': 'SequenceLayout' },
        'root-summary': { 'type': 'TextPrimitive' },
    }))
