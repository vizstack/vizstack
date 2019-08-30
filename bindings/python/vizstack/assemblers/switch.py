from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


class Switch(FragmentAssembler):

    _NONE_SPECIFIED = object()
    _show_labels: Optional[bool] = None

    def __init__(self,
                 modes: Optional[List[str]] = None,
                 items: Optional[Dict[str, Any]] = None,
                 show_labels: Optional[bool] = None) -> None:
        """

        Args:
            modes: An optional list of mode names. The order of the names is the order through which
                they will be cycled.
            items: An optional mapping of mode names to items.
            show_labels: Whether to show the labels.
        """
        super(Switch, self).__init__()
        self._modes: List[str] = []
        if modes is not None: self._modes = modes
        self._items: Dict[str, Any] = dict()
        if items is not None:
            for mode, item in items.items():
                self.item(mode, item)
        self.config(show_labels=show_labels)

    def mode(self, name: str, item=_NONE_SPECIFIED):
        """Adds a new mode to the existing modes."""
        self._modes.append(name)
        if item is not Switch._NONE_SPECIFIED:
            self.item(name, item)
        return self

    def item(self, name: str, item: Any):
        self._items[name] = item
        return self

    def config(self, show_labels: Optional[bool] = None):
        if show_labels is not None: self._show_labels = show_labels
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        for mode_name in self._modes:
            assert mode_name in self._items, 'No item was provided for mode "{}".'.format(mode_name)
        return {
            'type': 'SwitchLayout',
            'contents': {
                'modes': [get_id(self._items[name], str(name)) for name in self._modes],
                'showLabels': self._show_labels,
            },
            'meta': self._meta,
        }, [self._items[mode] for mode in self._modes]
