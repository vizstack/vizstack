from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment
import os


class Image(FragmentAssembler):
    """
    A View which renders an image as read from a file.
    """

    def __init__(self, image: str) -> None:
        """
        Args:
            location: Either (1) absolute path to file on local filesystem, (2) a URL prefixed
                "http://" or "https://", (3) a base64 bytes string.
        """
        super(Image, self).__init__()
        self._image: str = image

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'ImagePrimitive',
            'contents': {
                'image': self._image,
            },
            'meta': self._meta,
        }, []
