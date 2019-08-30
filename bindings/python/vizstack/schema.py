from typing import Union, Dict, List, NewType
from mypy_extensions import TypedDict

JsonType = Union[str, float, int, bool, None, List['JsonType'], Dict[str, 'JsonType']]

FragmentMeta = Dict[str, JsonType]

FragmentId = NewType('FragmentId', str)

Fragment = TypedDict(
    'Fragment', {
        'type': str,
        'contents': Dict[str, JsonType],
        'meta': FragmentMeta,
    }
)

View = TypedDict('View', {
    'rootId': FragmentId,
    'fragments': Dict[FragmentId, Fragment],
})
