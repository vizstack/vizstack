from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment
import os


class Image(FragmentAssembler):
    """
    A View which renders an image as read from a file.
    """

    def __init__(self, location: str) -> None:
        """
        Args:
            location: Either (1) absolute path to file on local filesystem or (2) a URL prefixed
                "http://" or "https://".
        """
        super(Image, self).__init__()
        self._location: str = location

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'ImagePrimitive',
            'contents': {
                'location': self._location,
            },
            'meta': self._meta,
        }, []
