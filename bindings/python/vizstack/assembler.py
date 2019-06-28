import json
from typing import Any, Optional, List, MutableSet, Dict, Union

from vizstack.types import JsonType
from vizstack.view import get_view, View


__all__ = ['assemble']


def assemble(obj: Any) -> Dict[str, Union[str, Dict[str, Dict[str, JsonType]]]]:
    """Returns a dict with all of the information needed to render a visualization of `obj`.

    Args:
        obj: An object to be visualized.

    Returns:
        {
            'models': Maps a View ID to its ViewModel.
            'rootId': the View ID of the top-level View in 'models'.
        }
    """
    to_add: List[View] = [get_view(obj)]
    added: MutableSet[str] = set()
    return_dict: Dict[str, Union[Optional[str], Dict[str, JsonType]]] = {
        'rootId': to_add[0].id,
        'models': dict(),
    }
    while len(to_add) > 0:
        # Create the ViewModel, add it to `return_dict`, then enqueue all Views referenced in the ViewModel
        view_obj: View = to_add.pop()
        view_id: str = view_obj.id
        if view_id in added:
            continue
        added.add(view_id)
        return_dict['models'][view_id], referenced_views = view_obj.assemble()
        to_add += referenced_views
    return return_dict
