from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


Emphasis = Literal['normal', 'less', 'more', None]


class Icon(FragmentAssembler):
    """
    A View which renders an image as read from a file.
    """

    def __init__(self, name: str, emphasis: Emphasis = None) -> None:
        """
        Args:
            name: Name of Material UI icon formatted like "add_circle".
            emphasis: Relative important of icon.
        """
        super(Icon, self).__init__()
        self._name = name
        self._emphasis = emphasis

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'IconPrimitive',
            'contents': {
                'name': self._name,
                'emphasis': self._emphasis,
            },
            'meta': self._meta,
        }, []
