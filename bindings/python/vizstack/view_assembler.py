from typing import Any, Optional, Dict, List
from hashlib import md5
from base64 import b64encode
from vizstack.schema import FragmentId, View, Fragment
from vizstack.fragment_assembler import FragmentAssembler
from vizstack.lang import get_language_default
import inspect

__all__ = ['assemble']


class ViewAssembler:
    _ROOT_ID = FragmentId('root')

    @staticmethod
    def _get_fragment_assembler(obj: Any) -> FragmentAssembler:
        """Returns a `FragmentAssembler` whose `assemble()` method produces a `Fragment` representing `obj`.

        If `obj` is already a `FragmentAssembler`, then it is returned unchanged. If `obj` is an instance of a class
        which defines a `__view__()` method, then `obj.__view__()` is returned. Otherwise, language defaults are used to
        create a new `FragmentAssembler`.

        Args:
            obj: Any object whose `FragmentAssembler` should be created.

        Returns:
            A `FragmentAssembler` for `obj`.
        """
        if isinstance(obj, FragmentAssembler):
            return obj
        # Do not call `__view__()` if `obj` is a class -- not an instance -- that defines `__view__()`
        elif not inspect.isclass(obj) and hasattr(obj, '__view__'):
            return getattr(obj, '__view__')()
        else:
            return get_language_default(obj)

    @staticmethod
    def _hash_fragment_id(fragment_name: str) -> FragmentId:
        """Returns the `FragmentId` produced by hashing a human-readable fragment name.

        Typically, a fragment name is of the form `${parent_id}-{slot}`.

        This function is separated from `_get_fragment_id()` so that tests can compare `assemble()` outputs to
        human-readable `View` objects. See `tests/utils.py:hash_ids()` for an example.

        Args:
            fragment_name: A string which should be hashed.

        Returns:
            A `FragmentId` produced by hashing `fragment_name`.
        """
        m = md5()
        m.update(fragment_name.encode())
        return FragmentId(str(b64encode(m.digest()), 'utf-8')[:10])

    @staticmethod
    def _get_fragment_id(slot: str, parent_id: FragmentId) -> FragmentId:
        """Returns a `FragmentId` for a `Fragment` with slot name `slot` and a parent with id `parent_id`.

        Args:
            slot: The string uniquely identifying the `Fragment` amongst its siblings.
            parent_id: The `FragmentId` of the parent `Fragment`.

        Returns:
            A new `FragmentId` which globally identifies the `Fragment`.
        """
        return ViewAssembler._hash_fragment_id('{}-{}'.format(parent_id, slot))

    @staticmethod
    def _remove_null_contents(frag: Fragment) -> Fragment:
        """Modifies a `Fragment` in-place, removing any top-level content keys whose values are `None`.

        The `Fragment` schema calls for any non-specified value in "contents" to be undefined, but the 
        `FragmentAssembler`s map non-specified values to `None`.

        Args:
            frag: A `Fragment` whose `None`-valued keys should be deleted.

        Returns:
            `frag` modified in-place to have no `None`-valued keys.
        """
        for key in list(frag['contents'].keys()):
            if frag['contents'][key] is None:
                del frag['contents'][key]
        return frag

    @staticmethod
    def assemble(obj: Any) -> View:
        # Since Python `dict`s cannot use unhashable types (e.g., lists) as keys, we have to use the id of the
        # object instead. This requires us to reference each object in a `list` that will persist throughout the
        # call to `assemble()` so that the objects do not get garbage collected -- and their ids reused -- in the
        # middle of the call.
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

            def get_id(obj: Any, slot: str):
                # If `obj` has already been given a `FragmentId`, return that
                if id(obj) in assigned:
                    return assigned[id(obj)]
                # Otherwise, create a new `FragmentId` for `obj` using its slot and the `FragmentId` of its parent
                created_id = ViewAssembler._get_fragment_id(slot, frag_id)
                assigned[id(obj)] = created_id
                # Store a reference to `obj` so it is not garbage collected until this call to `assemble()` terminates
                used.append(obj)
                # Indicate that a `Fragment` for `obj` will need to be created in a later iteration
                fragments[created_id] = None
                return created_id

            frag, refs = fasm.assemble(get_id)
            fragments[frag_id] = ViewAssembler._remove_null_contents(frag)
            stack.extend(refs)

        for frag_id, frag in fragments.items():
            assert frag, 'Object assigned a FragmentId was not returned as a ref: {}'.format(
                frag_id
            )

        return {
            'rootId': ViewAssembler._ROOT_ID,
            'fragments': fragments,
        }


def assemble(obj: Any):
    return ViewAssembler.assemble(obj)
