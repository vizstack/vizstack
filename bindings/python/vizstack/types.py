from typing import NewType, Union, Dict, List, Tuple
import cuid

JsonType = Union[str, float, int, bool, None, List['JsonType'], Dict[str, 'JsonType']]


class View:
    def __init__(self):
        self.id = '@id:{}'.format(cuid.cuid())
        self._meta: Dict[str, JsonType] = {}

    def assemble(self) -> Tuple[Dict[str, JsonType], List['View']]:
        raise NotImplementedError

    def meta(self, key: str, value: JsonType) -> None:
        self._meta[key] = value

    def __mutate__(self, view: 'View'):
        self.id = view.id
        self._meta = view._meta
        self.assemble = view.assemble
