from vizstack.schema import FragmentMeta, JsonType, FragmentId, Fragment
from typing import Callable, Any, Tuple, List

__all__ = ['FragmentAssembler']


class FragmentAssembler:

    def __init__(self) -> None:
        self._meta: FragmentMeta = {}

    def meta(self, key: str, value: JsonType) -> 'FragmentAssembler':
        self._meta[key] = value
        return self

    def assemble(self, get_id: Callable[[Any, str], FragmentId]) -> Tuple[Fragment, List[Any]]:
        """Returns a `Fragment` and a `list` of all objects referenced by the `Fragment`.

        Any valid `View` which includes the assembled `Fragment` must also include the `Fragment` for each object in
        the returned `list`.

        Args:
            get_id: A function with signature `(obj, slot)`, where `obj` is an object referenced in the assembled
                `Fragment` and `slot` is a string which uniquely identifies that object among all other referenced
                objects. It returns a `FragmentId` for `obj`, which should be used in place of the object itself in
                the assembled `Fragment`.

        Returns:
            A `Fragment` which can be rendered.
            A `list` of objects whose `Fragment`s should be included in any `View` containing the returned `Fragment`.
        """
        raise NotImplementedError
