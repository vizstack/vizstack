from typing import Any, NewType, Optional, List, MutableSet, Dict, Union, Tuple, overload
import json
from xnode.view import _get_view
from xnode._types import ViewId, JsonType, View

# Required for PyPI packaging.
name = 'xnode'


def _get_view_id(obj: 'View') -> ViewId:
    """Gets the VizId for a particular View object at a particular snapshot."""
    return ViewId('@id:{}'.format(str(id(obj))))


@overload
def _replace_view_with_id(o: 'View', referenced_views) -> ViewId:
    ...


@overload
def _replace_view_with_id(o: Dict[str, Union['View', JsonType]], referenced_views) -> Dict[str, JsonType]:
    ...


@overload
def _replace_view_with_id(o: List[Union['View', JsonType]], referenced_views) -> List[JsonType]:
    ...


def _replace_view_with_id(o, referenced_views: List['View']):
    if isinstance(o, dict):
        return {
            key: _replace_view_with_id(
                value, referenced_views)
            for key, value in o.items()
        }
    elif isinstance(o, list) or isinstance(o, tuple):
        return [
            _replace_view_with_id(
                elem, referenced_views) for elem in o
        ]
    elif isinstance(o, View):
        referenced_views.append(o)
        return _get_view_id(o)
    else:
        return o


def assemble(obj: Any) -> str:
    obj_view_id: Optional[ViewId] = None
    models: Dict[ViewId, Dict[str, JsonType]] = dict()
    to_add: List[View] = [_get_view(obj)]
    added: MutableSet[ViewId] = set()
    while len(to_add) > 0:
        view_obj: View = to_add.pop()
        view_id: ViewId = _get_view_id(view_obj)
        if obj_view_id is None:
            obj_view_id = view_id
        if view_id in added:
            continue
        added.add(view_id)
        view_dict: Dict[str, Union[View, JsonType]] = view_obj.assemble_dict()
        referenced_views: List[View] = []
        view_json: Dict[str, JsonType] = _replace_view_with_id(view_dict, referenced_views)
        models[view_id] = view_json
        to_add += referenced_views
    assert obj_view_id is not None
    return json.dumps({
        'rootId': obj_view_id,
        'models': models,
    })
