from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from vizstack.schema import Fragment


class KeyValue(FragmentAssembler):

    _separator: Optional[str] = None
    _start_motif: Optional[str] = None
    _end_motif: Optional[str] = None
    _align_separators: Optional[bool] = None
    _show_labels: Optional[bool] = None

    def __init__(self,
                 keyvalues: Optional[Dict[Any, Any]] = None,
                 separator: Optional[str] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 align_separators: Optional[bool] = None,
                 show_labels: Optional[bool] = None,
                 ) -> None:
        """"""
        super(KeyValue, self).__init__()
        self._entries: List[Tuple[Any, Any]] = []
        if keyvalues:
            for key, value in keyvalues.items():
                self.item(key, value)
        self.config(separator=separator, start_motif=start_motif, end_motif=end_motif,
                    align_separators=align_separators, show_labels=show_labels)

    def item(self, key: Any, value: Any):
        self._entries.append((key, value))
        return self

    def config(self,
               separator: Optional[str] = None,
               start_motif: Optional[str] = None,
               end_motif: Optional[str] = None,
               align_separators: Optional[bool] = None,
               show_labels: Optional[bool] = None,
               ):
        if separator is not None: self._separator = separator
        if start_motif is not None: self._start_motif = start_motif
        if end_motif is not None: self._end_motif = end_motif
        if align_separators is not None: self._align_separators = align_separators
        if show_labels is not None: self._show_labels = show_labels
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'KeyValueLayout',
            'contents': {
                'entries': [
                    {'key': get_id(key, '{}k'.format(i)), 'value': get_id(value, '{}v'.format(i))}
                    for i, (key, value) in enumerate(self._entries)],
                'separator': self._separator,
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'alignSeparators': self._align_separators,
                'showLabels': self._show_labels,

            },
            'meta': self._meta,
        }, [t[0] for t in self._entries] + [t[1] for t in self._entries]
