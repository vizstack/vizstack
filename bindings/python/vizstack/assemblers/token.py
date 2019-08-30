from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment


Color = Literal['gray', 'brown', 'purple', 'blue', 'green', 'yellow', 'orange', 'red', 'pink', None]


class Token(FragmentAssembler):
    """
    A View which renders a boxed piece of text on a colored background.
    """

    def __init__(self,
                 text: str,
                 color: Color = None) -> None:
        """
        Args:
            text: Text which should be rendered.
            color: Name of color for background.
        """
        super(Token, self).__init__()
        self._text: str = text
        self._color: Color = color

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'TokenPrimitive',
            'contents': {
                'text': self._text,
                'color': self._color,
            },
            'meta': self._meta,
        }, []
