from typing import Any, Optional, Callable, NoReturn, Dict, List
from hashlib import md5
from base64 import b64encode
from vizstack.schema import FragmentId, View, Fragment
from vizstack.fragment_assembler import FragmentAssembler
from vizstack.lang import get_language_default

__all__ = ['assemble']


class ViewAssembler:
    _ROOT_ID = 'root'

    @staticmethod
    def _get_fragment_assembler(obj: Any) -> FragmentAssembler:
        if isinstance(obj, FragmentAssembler):
            return obj
        elif hasattr(obj, '__view__'):
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
        assigned: Dict[Any, FragmentId] = {obj: ViewAssembler._ROOT_ID}
        fragments: Dict[FragmentId, Optional[Fragment]] = {ViewAssembler._ROOT_ID: None}
        stack: List[Any] = [obj]

        while len(stack) > 0:
            curr = stack.pop()
            frag_id = assigned[curr]

            assert frag_id, 'Object returned as ref was not assigned a FragmentId: {}'.format(curr)

            if fragments[frag_id] is not None:
                continue

            fasm = ViewAssembler._get_fragment_assembler(curr)

            def get_id(obj: Any, name: str):
                if obj in assigned:
                    return assigned[obj]
                created_id = ViewAssembler._get_fragment_id(name, frag_id)
                assigned[obj] = created_id
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
