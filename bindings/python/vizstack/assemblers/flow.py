from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


class Flow(FragmentAssembler):
    """
    A View which renders other Views as a series of inline elements.
    """

    def __init__(self, items: List[Any]) -> None:
        """
        Args:
            items: A sequence of objects which should be visualized.
        """
        super(Flow, self).__init__()
        self._elements = items

    def item(self, item: Any):
        """Add an item to the end of the flow.

        Args:
            item: The new item to be added.

        Returns:
            This `Flow` instance.
        """
        self._elements.append(item)
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'FlowLayout',
            'contents': {
                'elements': [get_id(elem, '{}'.format(i)) for i, elem in enumerate(self._elements)],
            },
            'meta': self._meta,
        }, self._elements
