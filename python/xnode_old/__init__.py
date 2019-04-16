"""
This file defines the ``view()`` function, which can be used with the Xnode plugin to render objects of any type
beautifully.
"""

from typing import Callable

from xnode_old.viz import *


# Required for PyPI packaging.
name = 'xnode'

# A function which takes as input any Python object and performs some action that allows it to be viewed by the client.
# By default, this prints it to stdout, but it can be changed via `set_show_fn()` to write objects as Xnode symbol
# schemas to a client, or to do nothing.
_SHOW_FN: Callable[[Any], None] = print


def set_show_fn(fn: Callable[[Any], None]) -> None:
    """Changes the function which is called on objects passed to `show()`.

    Args:
        fn: A function which does not alter its input object.
    """
    global _SHOW_FN
    _SHOW_FN = fn


def show(*args: Any, **kwargs: Any) -> None:
    """Performs some action, as defined by a call to `set_show_fn()`, that allows an object to be visualized.

    Args:
        args: The object(s) to be visualized.
    """
    _SHOW_FN(*args, **kwargs)
