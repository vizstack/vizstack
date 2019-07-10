from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Iterable
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


class Sequence(FragmentAssembler):
    """
    A View which renders other Vizzes as blocks arranged in a fixed order.
    """

    def __init__(self,
                 elements: Optional[Iterable[Any]] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 orientation: Optional[str] = None) -> None:
        """"""
        super(Sequence, self).__init__()
        self._orientation = orientation
        self._start_motif = start_motif
        self._end_motif = end_motif
        self._elements = []
        if elements:
            for elem in elements:
                self.item(elem)

    def item(self, item: Any):
        self._elements.append(item)
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'SequenceLayout',
            'contents': {
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'orientation': self._orientation,
                'elements': [get_id(elem, '{}'.format(i)) for i, elem in enumerate(self._elements)],
            },
            'meta': self._meta,
        }, self._elements
