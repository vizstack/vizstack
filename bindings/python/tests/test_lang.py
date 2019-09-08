from .utils import hash_ids, match_object
from vizstack import *


def test_number_should_produce_text_primitive_without_quotation_marks():
    view = assemble(123)
    assert match_object(
        view['fragments'],
        hash_ids({
            'root': {
                'type': 'TokenPrimitive',
                'contents': {
                    'text': '123'
                }
            },
        })
    )


def test_string_should_produce_text_primitive_with_quotation_marks():
    view = assemble('123')
    assert match_object(
        view['fragments'],
        hash_ids({
            'root': {
                'type': 'TokenPrimitive',
                'contents': {
                    'text': '"123"'
                }
            },
        })
    )


def test_list_with_two_elements_should_produce_switch_layout_with_two_modes_and_correct_elements():
    view = assemble(['hello', 123])
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'SequenceLayout',
                    'contents': {
                        'elements': ['root-0', 'root-1']
                    },
                },
                'root-0': {
                    'type': 'TokenPrimitive',
                    'contents': {
                        'text': '"hello"'
                    }
                },
                'root-1': {
                    'type': 'TokenPrimitive',
                    'contents': {
                        'text': '123'
                    }
                },
            }
        )
    )


def test_list_with_repeated_string_element_should_use_same_fragment_id():
    view = assemble(['hello', 'hello'])
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'SequenceLayout',
                    'contents': {
                        'elements': ['root-0', 'root-0']
                    },
                },
                'root-0': {
                    'type': 'TokenPrimitive',
                    'contents': {
                        'text': '"hello"'
                    }
                },
            }
        )
    )


def test_list_with_repeated_text_element_should_use_same_fragment_id():
    text = Text('hello')
    view = assemble([text, text])
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'SequenceLayout',
                    'contents': {
                        'elements': ['root-0', 'root-0']
                    },
                },
                'root-0': {
                    'type': 'TextPrimitive',
                    'contents': {
                        'text': 'hello'
                    }
                },
            }
        )
    )


def test_list_with_self_reference_should_use_fragment_id_of_switch_as_sequence_element():
    obj = ['hello']
    obj.append(obj)
    view = assemble(obj)
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'SequenceLayout',
                    'contents': {
                        'elements': ['root-0', 'root']
                    },
                },
                'root-0': {
                    'type': 'TokenPrimitive',
                    'contents': {
                        'text': '"hello"'
                    }
                },
            }
        )
    )


def test_class_instance_without_custom_view_should_produce_default_view():

    class MyClass:
        pass

    obj = MyClass()
    view = assemble(obj)
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'KeyValueLayout'
                },
            }
        )
    )


def test_class_without_custom_view_should_produce_default_view():

    class MyClass:
        pass

    view = assemble(MyClass)
    assert match_object(
        view['fragments'],
        hash_ids(
            {
                'root': {
                    'type': 'SequenceLayout'
                },
            }
        )
    )
