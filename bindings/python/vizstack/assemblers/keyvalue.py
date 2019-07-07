from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


class KeyValue(FragmentAssembler):
    """

    """

    def __init__(self,
                 key_value_mapping: Optional[Dict[Any, Any]] = None,
                 item_separator: Optional[str] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None) -> None:
        """"""
        super(KeyValue, self).__init__()
        self._start_motif = start_motif
        self._end_motif = end_motif
        self._item_separator = item_separator
        self._entries = []
        if key_value_mapping:
            for key, value in key_value_mapping.items():
                self.item(key, value)

    def item(self, key: Any, value: Any):
        self._entries.append((key, value))
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'KeyValueLayout',
            'contents': FragmentAssembler._filter_none({
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'separator': self._item_separator,
                'entries': [{'key': get_id(key, '{}k'.format(i)), 'value': get_id(value, '{}v'.format(i))} for i, (key,
                                                                                         value) in
                            enumerate(self._entries)],
            }, ['startMotif', 'endMotif', 'separator']),
            'meta': self._meta,
        }, [t[0] for t in self._entries] + [t[1] for t in self._entries]
