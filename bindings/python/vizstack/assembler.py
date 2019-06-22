import json
from typing import Any, Optional, List, MutableSet, Dict, Union, overload

from vizstack.types import ViewId, JsonType, View, ViewPlaceholder, ViewDict
from vizstack.view import get_view


__all__ = ['assemble']


@overload
def _replace_view_with_id(o: View, referenced_views) -> ViewId:
    ...


@overload
def _replace_view_with_id(o: ViewPlaceholder, referenced_views) -> ViewId:
    ...


@overload
def _replace_view_with_id(o: Dict[str, Union[View, JsonType]], referenced_views) -> Dict[str, Union[ViewId, JsonType]]:
    ...


@overload
def _replace_view_with_id(o: List[Union[View, JsonType]], referenced_views) -> List[Union[ViewId, JsonType]]:
    ...


def _replace_view_with_id(o, referenced_views: List[View]) -> JsonType:
    """Replaces any `View` instance at any depth in `o` with that `View`'s corresponding `ViewId`.

    Args:
        o: A dict, list, `View`, `ViewPlaceholder`, or primitive.
        referenced_views: A list to which any `View` found in `o` should be added.

    Returns:
        A version of `o` with all `View` and `ViewPlaceholder` instances replaced with `ViewId`s.
    """
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
        return o.id
    elif isinstance(o, ViewPlaceholder):
        return o.id
    else:
        return o


def assemble(obj: Any) -> str:
    """Returns a string which contains all of the information needed to render a visualization of `obj`.

    Args:
        obj: An object to be visualized.

    Returns:
        A JSON-valid string which encodes the visualization for `obj`.
    """
    return_dict: Dict[str, Union[Optional[str], Dict[str, JsonType]]] = {
        'rootId': None,
        'models': dict(),
    }
    to_add: List[View] = [get_view(obj)]
    added: MutableSet[ViewId] = set()
    while len(to_add) > 0:
        # Get the `ViewDict` for the next view, add it to the output, then enqueue all `View` instances that it
        # references.
        view_obj: View = to_add.pop()
        view_id: ViewId = view_obj.id
        if return_dict['rootId'] is None:
            return_dict['rootId'] = view_id
        if view_id in added:
            continue
        added.add(view_id)
        view_dict: ViewDict = view_obj.assemble_dict()
        referenced_views: List[View] = []
        return_dict['models'][view_id] = _replace_view_with_id(view_dict, referenced_views)
        to_add += referenced_views
    return json.dumps(return_dict)
