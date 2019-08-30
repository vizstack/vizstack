from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


Orientation = Literal['horizontal', 'vertical', None]


class Sequence(FragmentAssembler):
    """
    A View which renders other Vizzes as blocks arranged in a fixed order.
    """
    _orientation: Orientation = None
    _start_motif: Optional[str] = None
    _end_motif: Optional[str] = None
    _show_labels: Optional[bool] = None

    def __init__(self,
                 elements: Optional[Iterable[Any]] = None,
                 orientation: Orientation = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 show_labels: Optional[bool] = None) -> None:
        """"""
        super(Sequence, self).__init__()
        self._elements: List[Any] = []
        if elements: self._elements = list(elements)
        self.config(orientation=orientation,
                    start_motif=start_motif,
                    end_motif=end_motif,
                    show_labels=show_labels)

    def item(self, item: Any):
        self._elements.append(item)
        return self

    def items(self, *items: Iterable[Any]):
        self._elements.extend(items)
        return self

    def config(self, orientation: Orientation = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 show_labels: Optional[bool] = None):
        if orientation is not None: self._orientation = orientation
        if start_motif is not None: self._start_motif = start_motif
        if end_motif is not None: self._end_motif = end_motif
        if show_labels is not None: self._show_labels = show_labels
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'SequenceLayout',
            'contents': {
                'elements': [get_id(elem, '{}'.format(i)) for i, elem in enumerate(self._elements)],
                'orientation': self._orientation,
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'showLabels': self._show_labels,
            },
            'meta': self._meta,
        }, self._elements
