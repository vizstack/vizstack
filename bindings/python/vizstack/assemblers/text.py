from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment

Color = Literal['default', 'primary', 'secondary', 'error', 'invisible', None]
Variant = Literal['plain', 'token', None]


class Text(FragmentAssembler):
    """
    A View which renders a contiguous block of text.
    """

    def __init__(self,
                 text: str,
                 color: Color = None,
                 variant: Variant = None) -> None:
        """
        Args:
            text: The text which should be rendered.
            color: The color of the text; one of ('default' | 'primary' | 'secondary' | 'error' | 'invisible')
            variant: The variant of the text; one of either "plain" or "token".
        """
        super(Text, self).__init__()
        self._text: str = text
        self._color: str = color
        self._variant: str = variant

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'TextPrimitive',
            'contents': {
                'text': self._text,
                'color': self._color,
                'variant': self._variant
            },
            'meta': self._meta,
        }, []
