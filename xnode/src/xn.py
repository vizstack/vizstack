from typing import Callable, Any

# TODO: actions, like recurse?

# A function which takes as input any Python object and performs some action that allows it to be viewed by the client.
# By default, this prints it to stdout, but it can be changed via `set_view_fn()` to write objects as Xnode symbol
# schemas to a client, or to do nothing.
_VIEW_FN: Callable[[Any], None] = print


def set_view_fn(fn: Callable[[Any], None]) -> None:
    """Changes the function which is called on objects passed to `view()`.

    Args:
        fn: A function which does not alter its input object.
    """
    global _VIEW_FN
    _VIEW_FN = fn


def view(obj: Any) -> None:
    """Performs some action, as defined by a call to `set_view_fn()`, that allows an object to be visualized.

    Args:
        obj: The object to be visualized.
    """
    _VIEW_FN(obj)

