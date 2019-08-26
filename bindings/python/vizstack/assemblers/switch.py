from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


class Switch(FragmentAssembler):
    """

    """

    _DEFAULT_ITEM = object()

    def __init__(self,
                 modes: Optional[List[str]] = None,
                 items: Optional[Dict[str, Any]] = None) -> None:
        """

        Args:
            modes: An optional list of mode names. The order of the names is the order through which they will be
                cycled.
            items: An optional mapping of mode names to items.
        """
        super(Switch, self).__init__()
        self._modes: List[str] = []
        if modes is not None:
            for mode in modes:
                self.mode(mode)
        self._items: Dict[str, Any] = dict()
        if items is not None:
            for mode, item in items.items():
                self.item(item, mode)

    def mode(self, mode_name: str, index: Optional[int] = None, item=_DEFAULT_ITEM):
        """Adds a new mode to the list of modes.

        Args:
            mode_name: The name of the new mode.
            index: An optional index at which to insert the new mode; if `None`, the mode is inserted at the end.
            item: An optional item to show in the new mode.

        Returns:

        """
        if index is not None:
            self._modes.insert(index, mode_name)
        else:
            self._modes.append(mode_name)
        if item is not Switch._DEFAULT_ITEM:
            self.item(item, mode_name)
        return self

    def item(self, item: Any, mode_name: str):
        self._items[mode_name] = item
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        for mode_name in self._modes:
            assert mode_name in self._items, 'No item was provided for mode "{}".'.format(mode_name)
        return {
            'type': 'SwitchLayout',
            'contents': {
                'modes': [get_id(self._items[mode_name], mode_name) for mode_name in self._modes],
            },
            'meta': self._meta,
        }, [self._items[mode] for mode in self._modes]
