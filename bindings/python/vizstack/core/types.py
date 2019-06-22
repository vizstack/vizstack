from typing import NewType, Union, Dict, List
import uuid

ViewId = NewType('ViewId', str)
JsonType = Union[str, float, int, bool, None, List['JsonType'], Dict[str, 'JsonType']]

_ViewOrJsonType = Union['View', 'ViewPlaceholder', str, float, int, bool, None,
                        List['_ViewOrJsonType'], Dict[str, '_ViewOrJsonType']]
ViewDict = NewType('ViewDict', Dict[str, _ViewOrJsonType])


class View:
    def __init__(self):
        self.id = '@id:{}'.format(str(uuid.uuid4()))
        self._meta: Dict[str, JsonType] = {}

    def assemble_dict(self) -> ViewDict:
        raise NotImplementedError

    def meta(self, key: str, value: JsonType) -> None:
        self._meta[key] = value


class ViewPlaceholder:
    def __init__(self):
        self.id = None
