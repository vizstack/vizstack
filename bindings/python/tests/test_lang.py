from .utils import hash_ids, match_object
from vizstack import *


def test_number_should_produce_text_primitive_without_quotation_marks():
    view = assemble(123)
    assert match_object(view['fragments'], hash_ids({
        'root': {'type': 'TextPrimitive', 'contents': {'text': '123', 'variant': 'token',}},
    }))


def test_string_should_produce_text_primitive_with_quotation_marks():
    view = assemble('123')
    assert match_object(view['fragments'], hash_ids({
        'root': {'type': 'TextPrimitive', 'contents': {'text': '"123"', 'variant': 'token',}},
    }))


def test_list_with_two_elements_should_produce_switch_layout_with_two_modes_and_correct_elements():
    view = assemble(['hello', 123])
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
        'root-full-1': { 'type': 'TextPrimitive', 'contents': { 'text': '123', 'variant': 'token', } },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_list_with_four_elements_should_produce_switch_layout_with_three_modes():
    view = assemble(['hello', 123, 'world', 456])
    assert match_object(view['fragments'], hash_ids({
        'root': {
            'type': 'SwitchLayout',
            'contents': { 'modes': ['root-full', 'root-compact', 'root-summary'] },
        },
        'root-full': {
            'type': 'SequenceLayout',
        },
        'root-compact': {
            'type': 'SequenceLayout',
        },
        'root-summary': { 'type': 'TextPrimitive' },
    }))


def test_list_with_repeated_string_element_should_use_same_fragment_id():
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


def test_list_with_repeated_text_element_should_use_same_fragment_id():
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


def test_list_with_self_reference_should_use_fragment_id_of_switch_as_sequence_element():
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


def test_class_instance_without_custom_view_should_produce_default_view():
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


def test_class_without_custom_view_should_produce_default_view():
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
