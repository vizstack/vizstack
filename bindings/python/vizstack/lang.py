from vizstack.fragment_assembler import FragmentAssembler
from typing import Any, Optional, List, Dict
from vizstack.assemblers import Text, KeyValue, Sequence, Switch
import types
import inspect


__all__ = ['get_language_default']


def get_language_default(obj: Any) -> FragmentAssembler:
    # Primitives: Token containing the value in full
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        fasm = Text(str(obj) if not isinstance(obj, str) else '"{}"'.format(obj), variant='token')

    # List: Sequence of the list elements
    elif isinstance(obj, list):
        fasm = _SwitchSequence(
            obj,
            start_motif='List[{}] ['.format(len(obj)),
            end_motif=']',
            summary='List[{}]'.format(len(obj)))
    # Set: Sequence of the set items
    elif isinstance(obj, set):
        fasm = _SwitchSequence(
            list(obj),
            start_motif='Set[{}] {{'.format(len(obj)),
            end_motif='}',
            summary='Set[{}]'.format(len(obj)))
    # Tuple: Sequence of the tuple elements
    elif isinstance(obj, tuple):
        fasm = _SwitchSequence(
            list(obj),
            start_motif='Tuple[{}] ('.format(len(obj)),
            end_motif=')',
            summary='Tuple[{}]'.format(len(obj)))
    # Dict: KeyValue of the dict items
    elif isinstance(obj, dict):
        fasm = _SwitchKeyValue(
            obj,
            start_motif='Dict[{}] {{'.format(len(obj)),
            end_motif='}',
            summary='Dict[{}]'.format(len(obj)))
    # Function: Sequence of positional arguments and the KeyValue of keyword arguments
    elif isinstance(
        obj, (types.FunctionType, types.MethodType, type(all.__call__))):
        parameters = inspect.signature(obj).parameters.items()
        args = [param_name for param_name, param in parameters if param.default is inspect._empty]
        kwargs = {
            param_name: param.default for param_name, param in parameters if param.default is not inspect._empty
        }

        fasm = _SwitchSequence([
            _SwitchSequence(
                args,
                start_motif='Positional Args [',
                end_motif=']',
                summary='Args',
                initial_expansion_mode='compact'),
            _SwitchKeyValue(
                kwargs,
                start_motif='Keyword Args {',
                end_motif='}',
                summary='Kwargs',
                initial_expansion_mode='compact'),
        ],
            start_motif='Function[{}] ('.format(obj.__name__),
            end_motif=')',
            orientation='vertical',
            summary='Function[{}]'.format(obj.__name__))
    # Module: KeyValue of module contents
    elif inspect.ismodule(obj):
        attributes = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(obj)):
            # There are some functions, like torch.Tensor.data, which exist just to throw errors. Testing these
            # fields will throw the errors. We should consume them and keep moving if so.
            try:
                value = getattr(obj, attr)
                if not inspect.ismodule(
                        value
                ):  # Prevent recursing through many modules for no reason
                    attributes[attr] = getattr(obj, attr)
            except Exception:
                continue
        fasm = _SwitchKeyValue(
            attributes,
            start_motif='Module[{}] {{'.format(obj.__name__),
            end_motif='}',
            summary='Module[{}]'.format(obj.__name__))
    # Class: KeyValue of functions and KeyValue of static fields
    elif inspect.isclass(obj):
        functions = dict()
        staticfields = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(obj)):
            try:
                value = getattr(obj, attr)
                if inspect.isfunction(value):
                    functions[attr] = value
                else:
                    staticfields[attr] = value
            except AttributeError:
                continue
        contents = []
        if len(functions) > 0:
            contents.append(
                _SwitchKeyValue(
                    functions,
                    start_motif='Functions {',
                    end_motif='}',
                    summary='Functions',
                    initial_expansion_mode='compact'))
        if len(staticfields) > 0:
            contents.append(
                _SwitchKeyValue(
                    staticfields,
                    start_motif='Fields {',
                    end_motif='}',
                    summary='Fields',
                    initial_expansion_mode='compact'))
        fasm = _SwitchSequence(
            contents,
            start_motif='Class[{}] ('.format(obj.__name__),
            end_motif=')',
            summary='Class[{}]'.format(obj.__name__),
            orientation='vertical')
    # Object instance: KeyValue of all instance attributes
    else:
        instance_class = type(obj)
        instance_class_attrs = dir(instance_class)
        contents = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(obj)):
            value: Any = getattr(obj, attr)
            try:
                if not isinstance(
                        value,
                        (types.FunctionType, types.MethodType, type(all.__call__)
                         )) and (attr not in instance_class_attrs
                                 or getattr(instance_class, attr, None) != value):
                    contents[attr] = value
            except Exception:
                # If some unexpected error occurs (as any object can override `getattr()` like Pytorch does,
                # and raise any error), just skip over instead of crashing
                continue
        fasm = _SwitchKeyValue(
            contents,
            item_separator='=',
            start_motif='Instance[{}] {{'.format(type(obj).__name__),
            end_motif='}',
            summary='Instance[{}]'.format(type(obj).__name__))
    return fasm


_COMPACT_LEN = 3


def _SwitchSequence(
        elements: Optional[List[Any]] = None,
        start_motif: Optional[str] = None,
        end_motif: Optional[str] = None,
        orientation: str = 'horizontal',
        summary: Optional[str] = None,
        initial_expansion_mode: Optional[str] = None):
    """Returns a `Switch` which cycles through full, compact, and summary modes of a `Sequence` with the given elements.

    Args:
        elements:
        start_motif:
        end_motif:
        orientation:
        summary:
        initial_expansion_mode:

    Returns:

    """
    full_view = Sequence(elements, start_motif, end_motif, orientation)
    compact_view = Sequence(elements[:_COMPACT_LEN], start_motif, end_motif, orientation)
    compact_view.item('...')
    summary_view = summary if summary is not None else 'sequence[{}]'.format(len(elements))
    # If the compact and full modes would be the same, exclude the compact mode
    if len(elements) <= _COMPACT_LEN:
        modes = ['full', 'summary'] if initial_expansion_mode != 'summary' else ['summary', 'full']
        return Switch(modes, {'full': full_view, 'summary': summary_view})
    modes = ['full', 'compact', 'summary']
    # If an initial expansion mode is given, move it to the start of the list of modes
    if initial_expansion_mode is not None:
        modes = modes[:modes.index(initial_expansion_mode)] + modes[modes.index(initial_expansion_mode):]
    return Switch(modes, {'full': full_view, 'compact': compact_view, 'summary': summary_view})


def _SwitchKeyValue(
        key_value_mapping: Dict[Any, Any],
        item_separator: str = ':',
        start_motif: Optional[str] = None,
        end_motif: Optional[str] = None,
        summary: Optional[str] = None,
        initial_expansion_mode: Optional[str] = None):
    """Returns a `Switch` which cycles through full, compact, and summary modes of a `KeyValue` with given items.

    Args:
        key_value_mapping:
        item_separator:
        start_motif:
        end_motif:
        summary:
        initial_expansion_mode:

    Returns:

    """
    full_view = KeyValue(key_value_mapping, item_separator, start_motif, end_motif)
    compact = dict()
    for i, (key, value) in enumerate(key_value_mapping.items()):
        if i >= _COMPACT_LEN:
            break
        compact[key] = value
    compact_view = KeyValue(compact, item_separator, start_motif, '...')
    summary_view = summary if summary is not None else 'dict[{}]'.format(len(key_value_mapping))
    # If the compact and full modes would be the same, exclude the compact mode
    if len(key_value_mapping) <= _COMPACT_LEN:
        modes = ['full', 'summary'] if initial_expansion_mode != 'summary' else ['summary', 'full']
        return Switch(modes, {'full': full_view, 'summary': summary_view})
    modes = ['full', 'compact', 'summary']
    # If an initial expansion mode is given, move it to the start of the list of modes
    if initial_expansion_mode is not None:
        modes = modes[:modes.index(initial_expansion_mode)] + modes[modes.index(initial_expansion_mode):]
    return Switch(modes, {'full': full_view, 'compact': compact_view, 'summary': summary_view})