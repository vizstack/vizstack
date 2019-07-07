from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any
from typing_extensions import Literal
from vizstack.schema import JsonType, View, Fragment
import os


class Image(FragmentAssembler):
    """
    A View which renders an image as read from a file.
    """

    def __init__(self, file_path: str) -> None:
        """
        Args:
            file_path: The local path to the image file.
        """
        super(Image, self).__init__()
        self._file_path: str = os.path.abspath(file_path)

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        return {
            'type': 'ImagePrimitive',
            'contents': {
                'filePath': self._file_path,
            },
            'meta': self._meta,
        }, []
