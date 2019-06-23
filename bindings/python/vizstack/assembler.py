import json
from typing import Any, Optional, List, MutableSet, Dict, Union

from vizstack.types import JsonType, View
from vizstack.view import get_view


__all__ = ['assemble']


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
    added: MutableSet[str] = set()
    while len(to_add) > 0:
        view_obj: View = to_add.pop()
        view_id: str = view_obj.id
        if return_dict['rootId'] is None:
            return_dict['rootId'] = view_id
        if view_id in added:
            continue
        added.add(view_id)
        return_dict['models'][view_id], referenced_views = view_obj.assemble()
        to_add += referenced_views
    return json.dumps(return_dict)
