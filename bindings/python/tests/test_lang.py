from .test_utils import hash_ids, match_object
from vizstack import *


def test_number():
    view = assemble(123)
    assert match_object(view['fragments'], hash_ids({
        'root': {'type': 'TextPrimitive', 'contents': {'text': '123', 'variant': 'token',}},
    }))


def test_string():
    view = assemble('123')
    assert match_object(view['fragments'], hash_ids({
        'root': {'type': 'TextPrimitive', 'contents': {'text': '"123"', 'variant': 'token',}},
    }))


def test_list():
    view = assemble(['hello', 'there'])
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['root-full-0', 'root-full-1'] },
        },
        'root-full-0': { 'type': 'TextPrimitive', 'contents': { 'text': '"hello"', 'variant': 'token', } },
        'root-full-1': { 'type': 'TextPrimitive', 'contents': { 'text': '"there"', 'variant': 'token', } },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_list_with_repeated_string_element():
    view = assemble(['hello', 'hello'])
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['root-full-0', 'root-full-0'] },
        },
        'root-full-0': { 'type': 'TextPrimitive', 'contents': { 'text': '"hello"' } },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_list_with_repeated_text_element():
    text = Text('hello')
    view = assemble([text, text])
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['root-full-0', 'root-full-0'] },
        },
        'root-full-0': { 'type': 'TextPrimitive', 'contents': { 'text': 'hello' } },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_list_with_self_reference():
    obj = ['hello']
    obj.append(obj)
    view = assemble(obj)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': {
            'type': 'SequenceLayout',
            'contents': { 'elements': ['root-full-0', 'root'] },
        },
        'root-full-0': { 'type': 'TextPrimitive', 'contents': { 'text': '"hello"' } },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_class_instance_without_custom_view():
    class MyClass:
        pass

    obj = MyClass()
    view = assemble(obj)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': { 'type': 'KeyValueLayout' },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_class_without_custom_view():
    class MyClass:
        pass

    view = assemble(MyClass)
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-summary'] },
        },
        'root-full': { 'type': 'SequenceLayout' },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_class_with_custom_view():
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