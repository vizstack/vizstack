from vizstack.fragment_assembler import FragmentAssembler
from typing import Any, Optional, List, Dict
from vizstack.assemblers import Token, KeyValue, Sequence, Switch
import types
import inspect

__all__ = ['get_language_default']


_MIN_SHOWN_LENGTH = 10


def get_language_default(obj: Any) -> FragmentAssembler:
    # Primitives: Token containing the value in full
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return Token('"{}"'.format(obj) if isinstance(obj, str) else str(obj))

    # List: Sequence of the list elements
    elif isinstance(obj, list):
        return Sequence(
            obj,
            start_motif='[{}] ['.format(len(obj))[-1 if len(obj) < _MIN_SHOWN_LENGTH else 0:],
            end_motif=']',
        )

    # Set: Sequence of the set items
    elif isinstance(obj, set):
        return Sequence(
            list(obj),
            start_motif='[{}] {{'.format(len(obj))[-1 if len(obj) < _MIN_SHOWN_LENGTH else 0:],
            end_motif='}',
        )

    # Tuple: Sequence of the tuple elements
    elif isinstance(obj, tuple):
        return Sequence(
            list(obj),
            start_motif='[{}] ('.format(len(obj))[-1 if len(obj) < _MIN_SHOWN_LENGTH else 0:],
            end_motif=')',
        )

    # Dict: KeyValue of the dict items
    elif isinstance(obj, dict):
        return KeyValue(
            obj,
            start_motif='[{}] {{'.format(len(obj))[-1 if len(obj) < _MIN_SHOWN_LENGTH else 0:],
            end_motif='}',
        )

    # Function: Sequence of positional arguments and the KeyValue of keyword arguments
    elif callable(obj):
        parameters = inspect.signature(obj).parameters.items()
        args = [param_name for param_name, param in parameters if param.default is inspect._empty] # type: ignore
        kwargs = {
            param_name: param.default
            for param_name, param in parameters
            if param.default is not inspect._empty  # type: ignore
        }

        return Sequence(
            [
                Sequence(
                    args,
                    start_motif='Positional Args [',
                    end_motif=']',
                ),
                KeyValue(
                    kwargs,
                    start_motif='Keyword Args {',
                    end_motif='}',
                ),
            ],
            start_motif='Function[{}] ('.format(obj.__name__),
            end_motif=')',
            orientation='vertical',
        )

    # Module: KeyValue of module contents
    elif inspect.ismodule(obj):
        attributes = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(obj)):
            # There are some functions, like torch.Tensor.data, which exist just to throw errors.
            # Testing these fields will throw the errors. We should consume them and keep moving
            # if so.
            try:
                value: Any = getattr(obj, attr)
                if not inspect.ismodule(value):
                    # Prevent recursing through many modules for no reason
                    attributes[attr] = getattr(obj, attr)
            except Exception:
                continue
        return KeyValue(
            attributes,
            start_motif='Module[{}] {{'.format(obj.__name__),
            end_motif='}',
        )

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
        contents: List[FragmentAssembler] = []
        if len(functions) > 0:
            contents.append(
                KeyValue(
                    functions,
                    start_motif='Functions {',
                    end_motif='}',
                )
            )
        if len(staticfields) > 0:
            contents.append(
                KeyValue(
                    staticfields,
                    start_motif='Fields {',
                    end_motif='}',
                )
            )
        return Sequence(
            contents,
            start_motif='Class[{}] ('.format(obj.__name__),
            end_motif=')',
            orientation='vertical'
        )

    # Object instance: KeyValue of all instance attributes
    else:
        instance_class = type(obj)
        instance_class_attrs = dir(instance_class)
        instance_fields: Dict[str, Any] = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(obj)):
            value = getattr(obj, attr)
            try:
                if not callable(value) and (attr not in instance_class_attrs or
                                            getattr(instance_class, attr, None) != value):
                    instance_fields[attr] = value
            except Exception:
                # If some unexpected error occurs (as any object can override `getattr()` like
                # Pytorch does, and raise any error), just skip over instead of crashing
                continue
        return KeyValue(
            instance_fields,
            separator='=',
            start_motif='Instance[{}] {{'.format(type(obj).__name__),
            end_motif='}',
        )
