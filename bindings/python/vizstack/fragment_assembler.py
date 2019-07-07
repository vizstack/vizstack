from vizstack.schema import FragmentMeta, JsonType, FragmentId, Fragment
from typing import Callable, Any, Tuple, NoReturn, List

__all__ = ['FragmentAssembler']


class FragmentAssembler:
    def __init__(self) -> NoReturn:
        self._meta: FragmentMeta = {}

    @staticmethod
    def _filter_none(d, keys):
        return {
            key: value for key, value in d.items() if key not in keys or d[key] is not None
        }

    def meta(self, key: str, value: JsonType) -> 'FragmentAssembler':
        self._meta[key] = value
        return self

    def assemble(self, get_id: Callable[[Any, str], FragmentId]) -> Tuple[Fragment, List[Any]]:
        raise NotImplementedError
