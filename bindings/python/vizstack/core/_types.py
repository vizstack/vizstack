from typing import NewType, Union, Dict, Any

ViewId = NewType('ViewId', str)
JsonType = Union[str, float, int, bool, None, list, Dict[str, Any]]


class _Dataclass:
    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def __eq__(self, other):
        """Define two `_Dataclass`s as equal if all of their member fields are equal."""
        return isinstance(other, type(self)) and vars(self) == vars(other)


VizContents = Dict[str, Any]


class VizModel(_Dataclass):
    def __init__(self, type: str, contents: VizContents) -> None:
        self.type: str = type
        self.contents: VizContents = {
            key: value
            for key, value in contents.items() if value is not None
        }


class View:
    def __init__(self):
        self._meta: Dict[str, JsonType] = {}

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        raise NotImplementedError

    def meta(self, key: str, value: JsonType):
        self._meta[key] = value


class ViewPlaceholder:
    def __init__(self):
        self.view = None
