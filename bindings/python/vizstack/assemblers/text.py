from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment

Variant = Literal['caption', 'body',  'subheading', 'heading', None]
Emphasis = Literal['normal', 'less', 'more', None]


class Text(FragmentAssembler):
    """
    A View which renders a contiguous block of text.
    """

    def __init__(self,
                 text: str,
                 variant: Variant = None,
                 emphasis: Emphasis = None,) -> None:
        """
        Args:
            text: Text which should be rendered.
            variant: Semantic role of text.
            emphasis: Relative important of text.
        """
        super(Text, self).__init__()
        self._text: str = text
        self._variant: Variant = variant
        self._emphasis: Emphasis = emphasis

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'TextPrimitive',
            'contents': {
                'text': self._text,
                'variant': self._variant,
                'emphasis': self._emphasis,
            },
            'meta': self._meta,
        }, []
