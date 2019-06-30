"""
This file defines all functions and objects which can be used by developers to create visualizations for their objects.
"""

import inspect
import os
import types
from collections import defaultdict
from typing import Any, Iterable, Optional, List, Tuple, Union, Dict

import cuid
from vizstack.types import JsonType

__all__ = ['Text', 'Token', 'Image', 'Flow', 'Sequence', 'Switch', 'KeyValue', 'Grid', 'DagLayout', 'get_view', 'View']

# A naive implementation of `get_view()` loops infinitely when an object references itself, e.g.,
# ```
#   a = {}
#   a['key'] = a
#   v = get_view(a)
#   assemble(v)
# ```
# `get_view(a)` would start to create the `View` for `a`. While doing so, it would need to create the `View` for each
# element in `a`, one of which is `a`; this calls `get_view(a)` again, and the loop progresses infinitely.
#
# We address this issue with _placeholders_. Intuitively, when we call `get_view(a)` during another call to
# `get_view(a)`, instead of trying to build the `View` for `a` again, we want to leave a placeholder that says "once
# you've finished building the `View` for `a`, put it here."
#
# At the start of the first call to `get_view(a)`, we create an empty generic `View` instance and set
# `_current_placeholders[id(a)] = View()`. The placeholder is an empty object at this point. The process
# then continues as in the naive implementation, and eventually `get_view(a)` is called for the second time. When
# this happens, `id(a)` will already by in `_current_placeholders`, so instead of trying to generate a new `View` for
# `a` again, we immediately return `_current_placeholders[id(a)]`. This breaks the infinite loop, and the first call to
# `get_view(a)` is able to finish creating the `View` object for `a`. Before the function returns, the generic `View`
# at `_current_placeholders[id(a)]` will be mutated to be identical to the `View` that was generated for `a`,
# and is then removed from `_current_placeholders`. By the end of any top-level call to `get_view()`,
# `_current_placeholders` will be empty.
_current_placeholders = dict()


def get_view(o: Any) -> 'View':
    """Gets the View associated with ``o``.

    If ``o`` is already a View, it is returned unchanged. If ``o`` has a ``__view__()`` method, its value is returned.
    Otherwise, a default visualization for ``o``, depending on its type, is returned.

    TODO: use a stub file to define default Views

    Args:
        o: An object to be visualized.

    Returns:
        A View which describes how to render ``o``.
    """
    global _current_placeholders
    if id(o) in _current_placeholders:
        return _current_placeholders[id(o)]
    _current_placeholders[id(o)] = View()

    is_switch = False

    if isinstance(o, View):
        view = o
    elif hasattr(o, '__view__'):
        view = getattr(o, '__view__')()
    # Primitives: Token containing the value in full
    elif isinstance(o, (str, int, float, bool)) or o is None:
        view = Token(o if not isinstance(o, str) else '"{}"'.format(o))
    # List: Sequence of the list elements
    elif isinstance(o, list):
        view = _SwitchSequence(
            o,
            start_motif='List[{}] ['.format(len(o)),
            end_motif=']',
            summary='List[{}]'.format(len(o)))
        is_switch = True
    # Set: Sequence of the set items
    elif isinstance(o, set):
        view = _SwitchSequence(
            list(o),
            start_motif='Set[{}] {{'.format(len(o)),
            end_motif='}',
            summary='Set[{}]'.format(len(o)))
        is_switch = True
    # Tuple: Sequence of the tuple elements
    elif isinstance(o, tuple):
        view = _SwitchSequence(
            list(o),
            start_motif='Tuple[{}] ('.format(len(o)),
            end_motif=')',
            summary='Tuple[{}]'.format(len(o)))
        is_switch = True
    # Dict: KeyValue of the dict items
    elif isinstance(o, dict):
        view = _SwitchKeyValue(
            o,
            start_motif='Dict[{}] {{'.format(len(o)),
            end_motif='}',
            summary='Dict[{}]'.format(len(o)))
        is_switch = True
    # Function: Sequence of positional arguments and the KeyValue of keyword arguments
    elif isinstance(
            o, (types.FunctionType, types.MethodType, type(all.__call__))):
        parameters = inspect.signature(o).parameters.items()
        args = [param_name for param_name, param in parameters if param.default is inspect._empty]
        kwargs = {
            param_name: param.default for param_name, param in parameters if param.default is not inspect._empty
        }

        view = _SwitchSequence([
            _SwitchSequence(
                args,
                start_motif='Positional Args [',
                end_motif=']',
                summary='Args',
                initial_expansion_mode='compact'),
            _SwitchKeyValue(
                kwargs,
                start_motif='Keyword Args {',
                end_motif='}',
                summary='Kwargs',
                initial_expansion_mode='compact'),
        ],
            start_motif='Function[{}] ('.format(o.__name__),
            end_motif=')',
            orientation='vertical',
            summary='Function[{}]'.format(o.__name__))
        is_switch = True
    # Module: KeyValue of module contents
    elif inspect.ismodule(o):
        attributes = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(o)):
            # There are some functions, like torch.Tensor.data, which exist just to throw errors. Testing these
            # fields will throw the errors. We should consume them and keep moving if so.
            try:
                value = getattr(o, attr)
                if not inspect.ismodule(
                        value
                ):  # Prevent recursing through many modules for no reason
                    attributes[attr] = getattr(o, attr)
            except Exception:
                continue
        view = _SwitchKeyValue(
            attributes,
            start_motif='Module[{}] {{'.format(o.__name__),
            end_motif='}',
            summary='Module[{}]'.format(o.__name__))
        is_switch = True
    # Class: KeyValue of functions and KeyValue of static fields
    elif inspect.isclass(o):
        functions = dict()
        staticfields = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(o)):
            try:
                value = getattr(o, attr)
                if inspect.isfunction(value):
                    functions[attr] = value
                else:
                    staticfields[attr] = value
            except AttributeError:
                continue
        contents = []
        if len(functions) > 0:
            contents.append(
                _SwitchKeyValue(
                    functions,
                    start_motif='Functions {',
                    end_motif='}',
                    summary='Functions',
                    initial_expansion_mode='compact'))
        if len(staticfields) > 0:
            contents.append(
                _SwitchKeyValue(
                    staticfields,
                    start_motif='Fields {',
                    end_motif='}',
                    summary='Fields',
                    initial_expansion_mode='compact'))
        view = _SwitchSequence(
            contents,
            start_motif='Class[{}] ('.format(o.__name__),
            end_motif=')',
            summary='Class[{}]'.format(o.__name__),
            orientation='vertical')
        is_switch = True
    # Object instance: KeyValue of all instance attributes
    else:
        instance_class = type(o)
        instance_class_attrs = dir(instance_class)
        contents = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(o)):
            value: Any = getattr(o, attr)
            try:
                if not isinstance(
                        value,
                        (types.FunctionType, types.MethodType, type(all.__call__)
                         )) and (attr not in instance_class_attrs
                                 or getattr(instance_class, attr, None) != value):
                    contents[attr] = value
            except Exception:
                # If some unexpected error occurs (as any object can override `getattr()` like Pytorch does,
                # and raise any error), just skip over instead of crashing
                continue
        view = _SwitchKeyValue(
            contents,
            item_separator='=',
            start_motif='Instance[{}] {{'.format(type(o).__name__),
            end_motif='}',
            summary='Instance[{}]'.format(type(o).__name__))
        is_switch = True
    # If we have a cyclic reference where the `View` uses one of our defaults, then we need the placeholder to start
    # in the "summary" mode; otherwise, our renderer would be caught in an loop, showing the same "full" mode within
    # itself infinitely.
    if is_switch:
        mutate_view(_current_placeholders[id(o)], Switch(view._modes[-1:] + view._modes[:-1], view._items))
    else:
        mutate_view(_current_placeholders[id(o)], view)
    del _current_placeholders[id(o)]
    return view


# ======================================================================================================================
# View classes.
# -----------------
# These objects subclass `View` and will be instantiated directly by developers writing visualizations for their
# objects.
#
# Subtle stuff:
#  - Every "slot" (e.g., a `Switch` mode or a `DagLayout` cell) must have an item attached to it, but not every item
#    needs an existing mode; such items will not be included in the assembled `View`.
# ======================================================================================================================

class View:
    def __init__(self):
        # A unique ID which will be used to identify this `View` when assembled into a normalized nested dict.
        self.id: str = '@id:{}'.format(cuid.cuid())
        self._meta: Dict[str, JsonType] = {}

    def assemble(self) -> Tuple[Dict[str, JsonType], List['View']]:
        raise NotImplementedError

    def meta(self, key: str, value: JsonType) -> None:
        """Adds a new piece of metadata to this `View`'s metadata dict.

        The metadata dict is sent alongside the `View`'s "type" and "contents", and can store arbitrary information
        that applications might use.

        Args:
            key:
            value:

        Returns:

        """
        self._meta[key] = value


def mutate_view(view: 'View', target: 'View') -> None:
    """Mutates `view` into a copy of `target`.

    When creating the `View` for a given object, cyclic references -- for example, when d['key'] = d -- might be
    encountered. When this happens, a `View` is used to denote the cyclic reference, then that `View` is mutated
    into a copy of the object's "true" `View`. See `view.py` for more.

    Args:
        view: A `View` that should be mutated.
        target: A `View` that `view` should become a functional copy of.
    """
    view.id = target.id
    view._meta = target._meta
    view.assemble = target.assemble


class Text(View):
    """
    A View which renders a contiguous block of text.
    """

    def __init__(self,
                 text: str,
                 color: Optional[str] = None,
                 variant: Optional[str] = None) -> None:
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

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        return {
            'type': 'TextPrimitive',
            'contents': {
                'text': self._text,
                'color': self._color,
                'variant': self._variant,
            },
            'meta': self._meta,
        }, []


class Image(View):
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

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        return {
            'type': 'ImagePrimitive',
            'contents': {
                'filePath': self._file_path,
            },
            'meta': self._meta,
        }, []


class Token(Text):
    """
    A View which renders a string representation of any object.
    """

    def __init__(self, o: Any) -> None:
        """
        Args:
            o: The object whose string representation should be rendered.
        """
        super(Token, self).__init__(str(o), variant='token')


class Flow(View):
    """
    A View which renders other Views as a series of inline elements.
    """

    def __init__(self, items: Iterable[Any]) -> None:
        """
        Args:
            items: A sequence of objects which should be visualized.
        """
        super(Flow, self).__init__()
        self._elements: List[View] = [get_view(o) for o in items]

    def item(self, item: Any):
        """Add an item to the end of the flow.

        Args:
            item: The new item to be added.

        Returns:
            This `Flow` instance.
        """
        self._elements.append(get_view(item))
        return self

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        return {
            'type': 'FlowLayout',
            'contents': {
                'elements': [view.id for view in self._elements],
            },
            'meta': self._meta,
        }, self._elements


# When calling `DagLayout.node()`, the user can specify an optional `item` argument, which populates that node with
# that item. We need a sentinel value to indicate that the user has not specified an `item` argument; we cannot use
# `None`, since that is a possible item. Instead, we instantiate an object to be the default value of `item`.
_DEFAULT_ITEM = object()
# `DagLayout.node()` also takes a `parent` argument. Recall that `node()` can be called any number of times,
# and will update only those parameters specified in each call. We need to distinguish between `parent=None`,
# which indicates that the node should have no parent, and `parent=_DEFAULT_PARENT`, indicating that the user did not
# specify a parent in this call to `node()`.
_DEFAULT_PARENT = object()


class DagLayout(View):
    def __init__(self,
                 flow_direction: Optional[str] = None,
                 align_children: Optional[bool] = None) -> None:
        """

        Args:
            flow_direction: The direction of the top-level flow; one of ('north' | 'south' | 'east' | 'west').
            align_children: Whether the top-level nodes should be aligned on the flow axis.
        """
        super(DagLayout, self).__init__()
        self._flow_direction = flow_direction
        self._align_children = align_children
        self._nodes: Dict[str, dict] = defaultdict(dict)
        self._items: Dict[str, View] = dict()
        self._edges: List[dict] = []
        self._alignments: List[List[str]] = []

    def node(self, node_id: str,
             flow_direction: Optional[str] = None, align_children: Optional[bool] = None,
             is_expanded: Optional[bool] = None, is_interactive: Optional[bool] = None,
             is_visible: Optional[bool] = None, parent=_DEFAULT_PARENT,
             align_with: Optional[List[str]] = None,
             item: Any = _DEFAULT_ITEM,
             ports: Optional[List[Union[Tuple[str, str, str], Tuple[str, str, str, int]]]] = None):
        for key, var in {
            'flowDirection': flow_direction,
            'alignChildren': align_children,
            'isExpanded': is_expanded,
            'isInteractive': is_interactive,
            'isVisible': is_visible,
        }.items():
            if var is not None or key not in self._nodes[node_id]:
                self._nodes[node_id][key] = var
        if parent is not _DEFAULT_PARENT:
            self._nodes[node_id]['parent'] = parent
        elif 'parent' not in self._nodes[node_id]:
            self._nodes[node_id]['parent'] = None

        self._nodes[node_id]['children'] = []
        if align_with is not None:
            self._alignments.append([node_id] + align_with)
        if item is not _DEFAULT_ITEM:
            self.item(item, node_id)
        if ports is not None:
            for port in ports:
                self.port(*port)
        return self

    def port(self, node_id: str, port_name: str, side: str, order: Optional[int] = None):
        if 'ports' not in self._nodes[node_id]:
            self._nodes[node_id]['ports'] = {}
        self._nodes[node_id]['ports'][port_name] = {
            'side': side,
        }
        if order is not None:
            self._nodes[node_id]['ports'][port_name]['order'] = order
        return self

    # TODO: remove "id" and "name" everywhere
    def edge(self, start_node_id: str, end_node_id: str,
             start_port: Optional[str] = None, end_port: Optional[str] = None):
        edge = {
            'startId': start_node_id,
            'endId': end_node_id,
        }
        if start_port is not None:
            edge['startPort'] = start_port
        if end_port is not None:
            edge['endPort'] = end_port
        self._edges.append(edge)
        return self

    def item(self, item: Any, node_id: str):
        self._items[node_id] = get_view(item)
        return self

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        for node_id in self._nodes:
            # All nodes must have an item
            assert node_id in self._items, 'No item was provided for node "{}".'.format(node_id)
            # All node parents must exist
            assert self._nodes[node_id]['parent'] is None or self._nodes[node_id][
                'parent'] in self._nodes, 'Parent node "{}" not found for child "{}".'.format(
                self._nodes[node_id]['parent'], node_id)
        for edge in self._edges:
            # All edges must connect real nodes
            assert edge['startId'] in self._nodes, 'An edge starts at non-existent node "{}".'.format(edge['startId'])
            assert edge['endId'] in self._nodes, 'An edge ends at non-existent node "{}".'.format(edge['endId'])
            # All edge ports must exist
            if 'startPort' in edge:
                assert edge['startPort'] in self._nodes[edge['startId']][
                    'ports'], 'An edge starts at non-existent port "{}" on node "{}".'.format(edge['startPort'],
                                                                                              edge['startId'])
            if 'endPort' in edge:
                assert edge['endPort'] in self._nodes[edge['endId']][
                    'ports'], 'An edge ends at non-existent port "{}" on node "{}".'.format(edge['endPort'],
                                                                                            edge['endId'])
        return {
            'type': 'DagLayout',
            'contents': {
                'nodes':
                    {node_id: {
                    **{key: value for key, value in node.items() if value is not None and key is not 'parent'},
                    'viewId': self._items[node_id].id,
                    'children': [_node_id for _node_id in self._nodes if self._nodes[_node_id]['parent'] == node_id]}
                     for node_id, node in self._nodes.items()},
                'edges':
                    {str(i): edge
                     for i, edge in enumerate(self._edges)},
                'alignments': self._alignments,
                'flowDirection':
                    self._flow_direction,
                'alignChildren':
                    self._align_children,
            },
            'meta': self._meta,
        }, list(self._items.values())


# TODO: ensure no overlap of elements
class Grid(View):
    """

   """

    def __init__(self, cells: Optional[str] = None, items: Optional[Dict[str, Any]] = None) -> None:
        """
        
        Args:
            cells: A string like "ABB\nACC\nACC", which specifies initial cell sizes and positions. The given example 
                creates a cell "A" at (0,0) with dimensions 1x3, cell "B" at (1,0) with dimensions 2x1, and a cell 
                "C" at position (1,1) with dimensions 2x2.
            items: An optional mapping of cell names to items.
        """""
        super(Grid, self).__init__()
        self._cells = dict()
        if cells is not None:
            cell_bounds = dict()
            row_len = None
            for y, row in enumerate(cells.splitlines()):
                if row_len is None:
                    row_len = len(row)
                else:
                    # TODO: meaningful error here
                    assert len(row) == row_len
                current_char = None
                for x, c in enumerate(row):
                    if c not in cell_bounds:
                        cell_bounds[c] = {
                            'x': x, 'y': y, 'X': -1, 'Y': -1
                        }
                    cell_bounds[c]['Y'] = y + 1
                    if current_char is None:
                        current_char = c
                    elif current_char != c:
                        cell_bounds[current_char]['X'] = x
                        current_char = c
                    cell_bounds[current_char]['X'] = row_len
            for cell_name, cell_bound in cell_bounds.items():
                self._cells[cell_name] = {
                    'col': cell_bound['x'],
                    'row': cell_bound['y'],
                    'width': cell_bound['X'] - cell_bound['x'],
                    'height': cell_bound['Y'] - cell_bound['y'],
                }
        # TODO: assert non-overlapping
        if items is not None:
            self._items = {key: get_view(value) for key, value in items.items()}
        else:
            self._items = dict()

    def cell(self, cell_name: str, col: int, row: int, width: int, height: int):
        self._cells[cell_name] = {
            'col': col,
            'row': row,
            'width': width,
            'height': height,
        }
        # TODO: assert non-overlapping
        return self

    def item(self, item: Any, cell_name: str):
        self._items[cell_name] = get_view(item)
        return self

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        for cell_name in self._cells:
            assert cell_name in self._items, 'No item was provided for cell "{}".'.format(cell_name)
        return {
            'type': 'GridLayout',
            'contents': {
                'cells': [{**cell, 'viewId': self._items[cell_name].id} for cell_name, cell in self._cells.items()],
            },
            'meta': self._meta,
        }, list(self._items.values())


class Switch(View):
    """

    """

    def __init__(self,
                 modes: Optional[List[str]] = None,
                 items: Optional[Dict[str, Any]] = None) -> None:
        """

        Args:
            modes: An optional list of mode names. The order of the names is the order through which they will be
                cycled.
            items: An optional mapping of mode names to items.
        """
        super(Switch, self).__init__()
        if modes is not None:
            self._modes = modes
        else:
            self._modes = []
        if items is not None:
            self._items = {key: get_view(value) for key, value in items.items()}
        else:
            self._items = dict()

    def mode(self, mode_name: str, index: Optional[int] = None):
        """Adds a new mode to the list of modes.

        Args:
            mode_name: The name of the new mode.
            index: An optional index at which to insert the new mode; if `None`, the mode is inserted at the end.

        Returns:

        """
        if index is not None:
            self._modes.insert(index, mode_name)
        else:
            self._modes.append(mode_name)
        return self

    def item(self, item: Any, mode_name: str):
        self._items[mode_name] = get_view(item)
        return self

    def assemble(self) -> Tuple[Dict[str, JsonType], List[View]]:
        for mode_name in self._modes:
            assert mode_name in self._items, 'No item was provided for mode "{}".'.format(mode_name)
        return {
            'type': 'SwitchLayout',
            'contents': {
                'modes': [self._items[mode_name].id for mode_name in self._modes],
            },
            'meta': self._meta,
        }, list(self._items.values())


class Sequence(View):
    """
    A View which renders other Vizzes as blocks arranged in a fixed order.
    """

    def __init__(self,
                 elements: Optional[Iterable[Any]] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 orientation: Optional[str] = None) -> None:
        """"""
        super(Sequence, self).__init__()
        self._orientation = orientation
        self._start_motif = start_motif
        self._end_motif = end_motif
        self._elements = [get_view(o) for o in elements] if elements is not None else []

    def item(self, item: Any):
        self._elements.append(get_view(item))
        return self

    def assemble(self):
        return {
            'type': 'SequenceLayout',
            'contents': {
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'orientation': self._orientation,
                'elements': [elem.id for elem in self._elements],
            },
            'meta': self._meta,
        }, self._elements


class KeyValue(View):
    """

    """

    def __init__(self,
                 key_value_mapping: Optional[Dict[Any, Any]] = None,
                 item_separator: Optional[str] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None) -> None:
        """"""
        super(KeyValue, self).__init__()
        self._start_motif = start_motif
        self._end_motif = end_motif
        self._item_separator = item_separator
        self._entries = [] if key_value_mapping is None else [(get_view(key), get_view(value)) for key, value in
                                                              key_value_mapping.items()]

    def item(self, key: Any, value: Any):
        self._entries.append((get_view(key), get_view(value)))
        return self

    def assemble(self):
        return {
            'type': 'KeyValueLayout',
            'contents': {
                'startMotif': self._start_motif,
                'endMotif': self._end_motif,
                'itemSep': self._item_separator,
                'entries': [{'key': key.id, 'value': value.id} for key, value in self._entries],
            },
            'meta': self._meta,
        }, [t[0] for t in self._entries] + [t[1] for t in self._entries]


_COMPACT_LEN = 3


def _SwitchSequence(
        elements: Optional[List[Any]] = None,
        start_motif: Optional[str] = None,
        end_motif: Optional[str] = None,
        orientation: str = 'horizontal',
        summary: Optional[str] = None,
        initial_expansion_mode: Optional[str] = None):
    """Returns a `Switch` which cycles through full, compact, and summary modes of a `Sequence` with the given elements.

    Args:
        elements:
        start_motif:
        end_motif:
        orientation:
        summary:
        initial_expansion_mode:

    Returns:

    """
    full_view = Sequence(elements, start_motif, end_motif, orientation)
    compact_view = Sequence(elements[:_COMPACT_LEN], start_motif, end_motif, orientation)
    compact_view.item('...')
    summary_view = summary if summary is not None else 'sequence[{}]'.format(len(elements))
    # If the compact and full modes would be the same, exclude the compact mode
    if len(elements) <= _COMPACT_LEN:
        modes = ['full', 'summary'] if initial_expansion_mode != 'summary' else ['summary', 'full']
        return Switch(modes, {'full': full_view, 'summary': summary_view})
    modes = ['full', 'compact', 'summary']
    # If an initial expansion mode is given, move it to the start of the list of modes
    if initial_expansion_mode is not None:
        modes = modes[:modes.index(initial_expansion_mode)] + modes[modes.index(initial_expansion_mode):]
    return Switch(modes, {'full': full_view, 'compact': compact_view, 'summary': summary_view})


def _SwitchKeyValue(
        key_value_mapping: Dict[Any, Any],
        item_separator: str = ':',
        start_motif: Optional[str] = None,
        end_motif: Optional[str] = None,
        summary: Optional[str] = None,
        initial_expansion_mode: Optional[str] = None):
    """Returns a `Switch` which cycles through full, compact, and summary modes of a `KeyValue` with given items.

    Args:
        key_value_mapping:
        item_separator:
        start_motif:
        end_motif:
        summary:
        initial_expansion_mode:

    Returns:

    """
    full_view = KeyValue(key_value_mapping, item_separator, start_motif, end_motif)
    compact = dict()
    for i, (key, value) in enumerate(key_value_mapping.items()):
        if i >= _COMPACT_LEN:
            break
        compact[key] = value
    compact_view = KeyValue(compact, item_separator, start_motif, '...')
    summary_view = summary if summary is not None else 'dict[{}]'.format(len(key_value_mapping))
    # If the compact and full modes would be the same, exclude the compact mode
    if len(key_value_mapping) <= _COMPACT_LEN:
        modes = ['full', 'summary'] if initial_expansion_mode != 'summary' else ['summary', 'full']
        return Switch(modes, {'full': full_view, 'summary': summary_view})
    modes = ['full', 'compact', 'summary']
    # If an initial expansion mode is given, move it to the start of the list of modes
    if initial_expansion_mode is not None:
        modes = modes[:modes.index(initial_expansion_mode)] + modes[modes.index(initial_expansion_mode):]
    return Switch(modes, {'full': full_view, 'compact': compact_view, 'summary': summary_view})
