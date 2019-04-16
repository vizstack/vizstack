from typing import Any, Dict, Union, Optional
from inspect import currentframe, getframeinfo
from types import FrameType

import xnode
import json


def view(*args: Any):
    for arg in args:
        view_spec: str = xnode.assemble(arg)
        frame: Optional[FrameType] = currentframe()
        assert frame is not None
        frame_info = getframeinfo(frame.f_back.f_back)
        filename, line_number = frame_info.filename, frame_info.lineno
        _send_message(filename, line_number, view_spec, False, False)


def _send_message(filename: Optional[str], line_number: Optional[int], view_spec: Optional[str], script_start: bool,
                  script_end: bool) -> None:
    print(json.dumps({
        'fileName': filename,
        'lineNumber': line_number,
        'viewSpec': json.loads(view_spec),
        'scriptStart': script_start,
        'scriptEnd': script_end,
    }))
