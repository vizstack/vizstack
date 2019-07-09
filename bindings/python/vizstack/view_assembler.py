from typing import Any, Optional, Callable, NoReturn, Dict, List, Set
from hashlib import md5
from base64 import b64encode
from vizstack.schema import FragmentId, View, Fragment
from vizstack.fragment_assembler import FragmentAssembler
from vizstack.lang import get_language_default
import inspect

__all__ = ['assemble']


class ViewAssembler:
    _ROOT_ID = 'root'

    @staticmethod
    def _get_fragment_assembler(obj: Any) -> FragmentAssembler:
        if isinstance(obj, FragmentAssembler):
            return obj
        # Do not call `__view__()` if `obj` is a class -- not an instance -- that defines `__view__()`
        elif not inspect.isclass(obj) and hasattr(obj, '__view__'):
            return getattr(obj, '__view__')()
        else:
            return get_language_default(obj)

    @staticmethod
    def _hash_fragment_id(name: str) -> FragmentId:
        m = md5()
        m.update(name.encode())
        return FragmentId(str(b64encode(m.digest()), 'utf-8')[:10])

    @staticmethod
    def _get_fragment_id(name: str, parent_id: FragmentId) -> FragmentId:
        return ViewAssembler._hash_fragment_id('{}-{}'.format(parent_id, name))

    @staticmethod
    def assemble(obj: Any) -> View:
        # Since Python `dict`s cannot use unhashable types (e.g., lists) as keys, we have to use the id of the
        # object instead. This requires us to reference each object in a `list` that will persist throughout the
        # function call so that the objects do not get garbage collected -- and their ids reused -- in the middle of
        # the call.
        assigned: Dict[int, FragmentId] = {id(obj): ViewAssembler._ROOT_ID}
        used: List[Any] = [obj]
        fragments: Dict[FragmentId, Optional[Fragment]] = {ViewAssembler._ROOT_ID: None}
        stack: List[Any] = [obj]

        while len(stack) > 0:
            curr = stack.pop()
            frag_id = assigned[id(curr)]

            assert frag_id, 'Object returned as ref was not assigned a FragmentId: {}'.format(curr)

            if fragments[frag_id] is not None:
                continue

            fasm = ViewAssembler._get_fragment_assembler(curr)

            def get_id(obj: Any, name: str):
                if id(obj) in assigned:
                    return assigned[id(obj)]
                used.append(obj)
                created_id = ViewAssembler._get_fragment_id(name, frag_id)
                assigned[id(obj)] = created_id
                fragments[created_id] = None
                return created_id

            frag, refs = fasm.assemble(get_id)
            fragments[frag_id] = frag
            stack.extend(refs)

        for frag_id, frag in fragments.items():
            assert frag, 'Object assigned a FragmentId was not returned as a ref: {}'.format(frag_id)

        return {
            'rootId': ViewAssembler._ROOT_ID,
            'fragments': fragments,
        }


def assemble(obj: Any):
    return ViewAssembler.assemble(obj)
