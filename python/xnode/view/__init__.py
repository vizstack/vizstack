"""
This file defines all functions and objects which can be used by developers to create visualizations for their objects.
"""

import typing
from typing import Any, Mapping, Iterable, Optional, List, Tuple, Union, Dict
import os

from xnode._types import View, JsonType
import types
import inspect

# ======================================================================================================================
# View function tools.
# -------------------
# Functions and classes which might be used by a developer writing a new viz function for their object.
# ======================================================================================================================

# The name of the method on an object which should return a `View` depicting that object.
VIZ_FN = '__view__'

# TODO: this is a bad way to stop cyclic generation of vizzes
_CURRENT = []


def _get_view(o: Any) -> 'View':
    """Gets the View associated with ``o``.

    If ``o`` is already a View, it is returned unchanged. If ``o`` has an ``xn()`` method, its value is returned.
    Otherwise, a default visualization for ``o``, depending on its type, is returned.

    Args:
        o: An object to be visualized.

    Returns:
        A View which describes how to render ``o``.
    """
    global _CURRENT
    if o in _CURRENT and not (isinstance(o, (str, int, float, bool))
                              or o is None):
        # TODO: deal with this better
        return Token('<cyclic ref>')
    _CURRENT.append(o)
    if isinstance(o, View):
        viz = o
    elif hasattr(o, VIZ_FN):
        viz = getattr(o, VIZ_FN)()
    elif isinstance(o, (str, int, float, bool)) or o is None:
        viz = Token(o if not isinstance(o, str) else '"{}"'.format(o))
    # TODO: come up with a better method for dispatching default vizzes, like stubs
    elif isinstance(o, list):
        viz = SwitchSequence(
            o,
            start_motif='List[{}] ['.format(len(o)),
            end_motif=']',
            summary='List[{}]'.format(len(o)))
    elif isinstance(o, set):
        viz = SwitchSequence(
            o,
            start_motif='Set[{}] {{'.format(len(o)),
            end_motif='}',
            summary='Set[{}]'.format(len(o)))
    elif isinstance(o, tuple):
        viz = SwitchSequence(
            o,
            start_motif='Tuple[{}] ('.format(len(o)),
            end_motif=')',
            summary='Tuple[{}]'.format(len(o)))
    elif isinstance(o, dict):
        viz = SwitchKeyValues(
            o,
            start_motif='Dict[{}] {{'.format(len(o)),
            end_motif='}',
            summary='Dict[{}]'.format(len(o)))
    elif isinstance(
            o, (types.FunctionType, types.MethodType, type(all.__call__))):
        args = []
        kwargs = dict()
        for param_name, param in inspect.signature(o).parameters.items():
            if param.default is inspect._empty:
                args.append(param_name)
            else:
                kwargs[param_name] = param.default
        viz = SwitchSequence([
            SwitchSequence(
                args,
                start_motif='Positional Args [',
                end_motif=']',
                summary='Args',
                expansion_mode='compact'),
            SwitchKeyValues(
                kwargs,
                start_motif='Keyword Args {',
                end_motif='}',
                summary='Kwargs',
                expansion_mode='compact'),
        ],
                             start_motif='Function[{}] ('.format(o.__name__),
                             end_motif=')',
                             orientation='vertical',
                             summary='Function[{}]'.format(o.__name__))
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
        viz = SwitchKeyValues(
            attributes,
            start_motif='Module[{}] {{'.format(o.__name__),
            end_motif='}',
            summary='Module[{}]'.format(o.__name__))
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
                SwitchKeyValues(
                    functions,
                    start_motif='Functions {',
                    end_motif='}',
                    summary='Functions',
                    expansion_mode='compact'))
        if len(staticfields) > 0:
            contents.append(
                SwitchKeyValues(
                    staticfields,
                    start_motif='Fields {',
                    end_motif='}',
                    summary='Fields',
                    expansion_mode='compact'))
        viz = SwitchSequence(
            contents,
            start_motif='Class[{}] ('.format(o.__name__),
            end_motif=')',
            summary='Class[{}]'.format(o.__name__),
            orientation='vertical')
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
        viz = SwitchKeyValues(
            contents,
            item_separator='=',
            start_motif='Instance[{}] {{'.format(type(o).__name__),
            end_motif='}',
            summary='Instance[{}]'.format(type(o).__name__))
    _CURRENT.pop()
    return viz


# ======================================================================================================================
# View classes.
# -----------------
# These objects subclass View and will be instantiated directly by developers writing visualizations for their objects.
# ======================================================================================================================


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
            color: The color of the text.
            variant: The variant of the text; one of either "plain" or "token".
        """
        super(Text, self).__init__()
        self._text: str = text
        self._color: str = color
        self._variant: str = variant

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'TextPrimitive',
            'contents': {
                'text': self._text,
                'color': self._color,
                'variant': self._variant,
            },
            'meta': self._meta,
        }


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

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'ImagePrimitive',
            'contents': {
                'filePath': self._file_path,
            },
            'meta': self._meta,
        }


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
    A View which renders other Vizzes as a series of inline elements.
    """

    def __init__(self, elements: List[Any]) -> None:
        """
        Args:
            elements: A sequence of objects which should be visualized.
        """
        super(Flow, self).__init__()
        self._elements: List[View] = [_get_view(o) for o in elements]

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'FlowLayout',
            'contents': {
                'elements': self._elements,
            },
            'meta': self._meta,
        }


class DagLayout(View):
    def __init__(self,
                 flow_direction: Optional[str] = None,
                 align_children: Optional[bool] = None) -> None:
        super(DagLayout, self).__init__()
        self._flow_direction = flow_direction
        self._align_children = align_children
        self._nodes: List['DagLayoutNode'] = []
        self._edges: List['DagLayoutEdge'] = []
        self._alignments: List[List['DagLayoutNode']] = []

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'DagLayout',
            'contents': {
                'nodes':
                {node.get_id(): node.to_dict()
                 for node in self._nodes},
                'edges':
                {edge.get_id(): edge.to_dict()
                 for edge in self._edges},
                'alignments': [[item.get_id() for item in alignment]
                               for alignment in self._alignments],
                'flowDirection':
                self._flow_direction,
                'alignChildren':
                self._align_children,
            },
            'meta': self._meta,
        }

    def create_node(self,
                    o: Any,
                    flow_direction: Optional[str] = None,
                    align_children: Optional[bool] = None,
                    is_expanded: Optional[bool] = None,
                    is_interactive: Optional[bool] = None,
                    is_visible: Optional[bool] = None) -> 'DagLayoutNode':
        node = DagLayoutNode(
            str(len(self._nodes)), _get_view(o), flow_direction,
            align_children, is_expanded, is_interactive, is_visible)
        self._nodes.append(node)
        return node

    def create_edge(self,
                    start: 'DagLayoutNode',
                    end: 'DagLayoutNode',
                    start_port: Optional[str] = None,
                    end_port: Optional[str] = None) -> 'DagLayoutEdge':
        edge = DagLayoutEdge(
            str(len(self._edges)), start, end, start_port, end_port)
        self._edges.append(edge)
        return edge

    def align_elements(self, elements: List['DagLayoutNode']) -> None:
        self._alignments.append(elements)


class DagLayoutNode:
    def __init__(self, node_id: str, viz: 'View',
                 flow_direction: Optional[str], align_children: Optional[bool],
                 is_expanded: Optional[bool], is_interactive: Optional[bool],
                 is_visible: Optional[bool]) -> None:
        self.node_id = node_id
        self.viz = viz
        self.flow_direction = flow_direction
        self.is_expanded = is_expanded
        self.is_interactive = is_interactive
        self.is_visible = is_visible
        self.align_children = align_children
        self.elements: List['DagLayoutNode'] = []
        self.ports: Dict[str, Mapping[str, Union[str, int]]] = {}
        self.container: Optional['DagLayoutNode'] = None

    def get_id(self) -> str:
        return self.node_id

    def to_dict(self) -> Mapping[str, Any]:
        assert self.container is None or self in self.container.elements
        all_values = {
            'viewId': self.viz,
            'children': [item.get_id() for item in self.elements],
            'flowDirection': self.flow_direction,
            'isExpanded': self.is_expanded,
            'isInteractive': self.is_interactive,
            'isVisible': self.is_visible,
            'alignChildren': self.align_children,
            'ports': self.ports,
        }
        return {
            key: value
            for key, value in all_values.items() if value is not None
        }

    # TODO: this interface is strange. make it clear what should be used by devs and what's for internal use
    def create_port(self,
                    port_name: str,
                    side: str,
                    order: Optional[int] = None):
        assert port_name not in self.ports
        self.ports[port_name] = {
            'side': side,
            'order': order,
        }

    def add_child(self, child: 'DagLayoutNode') -> None:
        assert child.container is None
        child.container = self
        self.elements.append(child)

    def remove_child(self, child: 'DagLayoutNode') -> None:
        assert child in self.elements
        assert child.container == self
        child.container = None
        self.elements.remove(child)

    def is_ancestor(self, descendant: 'DagLayoutNode') -> bool:
        if len(self.elements) == 0:
            return False
        if descendant in self.elements or descendant is self:
            return True
        return any([child.is_ancestor(descendant) for child in self.elements])

    def get_container(self) -> Optional['DagLayoutNode']:
        return self.container


class DagLayoutEdge:
    def __init__(self, edge_id: str, start: 'DagLayoutNode',
                 end: 'DagLayoutNode', start_port: Optional[str],
                 end_port: Optional[str]) -> None:
        self.edge_id = edge_id
        self.start = start
        self.end = end
        self.start_port = start_port
        self.end_port = end_port

    def get_id(self) -> str:
        return self.edge_id

    def to_dict(self) -> Mapping[str, Any]:
        all_values = {
            'startId': self.start.get_id(),
            'endId': self.end.get_id(),
            'startPort': self.start_port,
            'endPort': self.end_port,
        }
        return {
            key: value
            for key, value in all_values.items() if value is not None
        }


# TODO: ensure no overlap of elements
class Grid(View):
    """
   A View which renders other Vizzes in a flexibly-sized grid.
   """

    def __init__(self, elements: List[Tuple[Any, int, int, int, int]]) -> None:
        """
        Args:
            elements: The contents of the grid as a list of tuples. Each tuple is of the form
                ``(obj, col, row, width, height)``,
                where ``obj`` is the object to be visualized, ``col`` is its horizontal position in the grid,
                ``row`` is its vertical position, ``width`` is the number of columns it should span, and ``height``
                is the number of rows it should span.
        """
        super(Grid, self).__init__()
        self._num_cols = max(
            x + w for _, x, _, w, _ in elements) if len(elements) > 0 else 1
        self._num_rows = max(
            y + h for _, _, y, _, h in elements) if len(elements) > 0 else 1
        self._elements: List[Tuple[View, int, int, int, int]] = [
            (_get_view(o), x, y, w, h) for o, x, y, w, h in elements
        ]

    def __add__(self, other: Tuple[Any, int, int, int, int]) -> 'Grid':
        elem, x, y, w, h = other
        self._elements.append((_get_view(elem), x, y, w, h))
        self._num_cols = max(self._num_cols, x + w)
        self._num_rows = max(self._num_rows, y + h)
        return self

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'GridLayout',
            'contents': {
                'elements': [{
                    'viewId': view,
                    'col': col,
                    'row': row,
                    'width': width,
                    'height': height,
                } for view, col, row, width, height in self._elements],
            },
            'meta': self._meta,
        }


class Switch(View):
    """
    """

    def __init__(self,
                 elements: List[Any],
                 default_element: Optional[int] = None) -> None:
        """
        """
        super(Switch, self).__init__()
        self._elements = [_get_view(elem) for elem in elements]
        if default_element is not None:
            self._elements = self._elements[
                default_element:] + self._elements[:default_element]

    def assemble_dict(self) -> Dict[str, Union['View', JsonType]]:
        return {
            'type': 'SwitchLayout',
            'contents': {
                'elements': self._elements,
            },
            'meta': self._meta,
        }


class Sequence(Grid):
    """
    A View which renders other Vizzes as blocks arranged in a fixed order.
    """

    def __init__(self,
                 elements: Optional[Iterable[Any]] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 orientation: str = 'horizontal') -> None:
        """
        Args:
            elements: A sequence of objects which should be visualized.
            orientation: How to arrange the elements of this View. Should be either "horizontal" or "vertical".
        """
        self._orientation = orientation
        self._has_start_motif = start_motif is not None
        self._has_end_motif = end_motif is not None
        if elements is None:
            elements = []

        if orientation == 'horizontal':
            grid_elements = [(elem, i + 1, 0, 1, 1)
                             for i, elem in enumerate(elements)]
            if start_motif:
                grid_elements.append((Text(start_motif), 0, 0, 1, 1))
            if end_motif:
                grid_elements.append((Text(end_motif), len(elements) + 1, 0, 1,
                                      1))
            super(Sequence, self).__init__(grid_elements)
        elif orientation == 'vertical':
            grid_elements = [(elem, 1, i + 1, 1, 1)
                             for i, elem in enumerate(elements)]
            if start_motif:
                grid_elements.append((Text(start_motif), 0, 0, 2, 1))
            if end_motif:
                grid_elements.append((Text(end_motif), 0, len(elements) + 1, 2,
                                      1))
            super(Sequence, self).__init__(grid_elements)
        else:
            raise ValueError(
                'Provided orientation "{}" not recognized.'.format(
                    orientation))

    def __add__(self, other: Any) -> 'Sequence':
        # TODO: clean this up
        if self._has_end_motif:
            end_motif, _, _, _, _ = self._elements.pop()
        if self._orientation == 'horizontal':
            self._elements.append((_get_view(other), len(self._elements) + (1 if not self._has_start_motif else 0), 0, 1,
                                   1))
            if self._has_end_motif:
                self._elements.append((end_motif, len(self._elements), 0, 1, 1))
            self._num_cols += 1
        elif self._orientation == 'vertical':
            self._elements.append((_get_view(other), 0, len(self._elements) + (1 if not self._has_start_motif else 0), 1,
                                   1))
            if self._has_end_motif:
                self._elements.append((end_motif, 0, len(self._elements), 1, 1))
            self._num_rows += 1
        return self


class KeyValues(Grid):
    """
    A View which renders other Vizzes as key-value pairs.
    """

    def __init__(self,
                 key_value_mapping: Dict[Any, Any],
                 item_separator: str = ':',
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None) -> None:
        """Constructor.

        Args:
            key_value_mapping: A mapping of objects which should be visualized as key-value pairs
            summary: An optional string which will be shown when the ``KeyValues`` is in its summary expansion
                mode.
            expansion_mode: An optional expansion mode which the ``KeyValues`` should adopt by default.
        """
        self._keys = list(key_value_mapping.keys())
        self._has_end_motif = end_motif is not None
        self._item_separator = item_separator
        elements = [(key, 1, i + 1, 1, 1) for i, key in enumerate(self._keys)] + [
            (Text(self._item_separator), 2, i + 1, 1, 1) for i in range(len(self._keys))
        ] + [(key_value_mapping[key], 3, i + 1, 1, 1)
             for i, key in enumerate(self._keys)]
        if start_motif is not None:
            elements.append((Text(start_motif), 0, 0, 4, 1))
        if end_motif is not None:
            elements.append((Text(end_motif), 0, len(key_value_mapping) + 1, 4,
                             1))
        super(KeyValues, self).__init__(elements)


_MODE_INDICES = {
    'full': 0,
    'compact': 1,
    'summary': 2,
}
_COMPACT_COLS = 3
_COMPACT_ROWS = 3


# TODO: syntatic sugar for these? they surface a switch, so can't do operators

def SwitchSequence(
        elements: Optional[typing.Sequence[Any]] = None,
         start_motif: Optional[str] = None,
         end_motif: Optional[str] = None,
         orientation: str = 'horizontal',
         summary: Optional[str] = None,
         expansion_mode: Optional[str] = None):
    full_view = Sequence(elements, start_motif, end_motif, orientation)
    compact_view = Sequence(elements[:_COMPACT_COLS], start_motif, end_motif, orientation)
    compact_view += Text('...')
    summary_view = summary if summary is not None else 'sequence[{}]'.format(len(elements))
    mode_index = _MODE_INDICES[expansion_mode] if expansion_mode is not None else None
    if len(elements) <= _COMPACT_COLS:
        return Switch([full_view, summary_view], mode_index if not mode_index == 1 else 0)
    return Switch([full_view, compact_view, summary_view])


def SwitchKeyValues(
        key_value_mapping: Dict[Any, Any],
         item_separator: str = ':',
         start_motif: Optional[str] = None,
         end_motif: Optional[str] = None,
         summary: Optional[str] = None,
         expansion_mode: Optional[str] = None):
    full_view = KeyValues(key_value_mapping, item_separator, start_motif, end_motif)
    compact = dict()
    for i, (key, value) in enumerate(key_value_mapping.items()):
        if i >= _COMPACT_ROWS:
            break
        compact[key] = value
    compact_view = KeyValues(compact, item_separator, start_motif, end_motif)
    end_motif, _, _, _, _ = compact_view._elements.pop()
    compact_view._elements.append((Text('...'), 2, _COMPACT_ROWS + 1, 1, 1))
    compact_view._elements.append((end_motif, 0, _COMPACT_ROWS + 2, 4, 1))
    summary_view = summary if summary is not None else 'dict[{}]'.format(len(key_value_mapping))
    mode_index = _MODE_INDICES[expansion_mode] if expansion_mode is not None else None
    if len(key_value_mapping) <= _COMPACT_ROWS:
        return Switch([full_view, summary_view], mode_index if not mode_index == 1 else 0)
    return Switch([full_view, compact_view, summary_view])


def SwitchGrid(elements: List[Tuple[Any, int, int, int, int]],
                 summary: Optional[str] = None,
                 expansion_mode: Optional[str] = None):
    full_view = Grid(elements)
    visible_elements = []
    extends_right = full_view._num_cols > _COMPACT_COLS
    extends_below = full_view._num_rows > _COMPACT_ROWS
    for o, x, y, w, h in full_view._elements:
        if (x < _COMPACT_COLS - 1
                or not extends_right) and (y < _COMPACT_ROWS - 1
                                           or not extends_below):
            visible_elements.append((o, x, y, min(w,
                                                  _COMPACT_COLS - x),
                                     min(h, _COMPACT_ROWS - y)))
    if extends_right:
        visible_elements.append(
            (Text('. . .'), _COMPACT_COLS,
             min(_COMPACT_ROWS, full_view._num_rows) // 2, 1, 1))
    if extends_below:
        visible_elements.append(
            (Text('. . .'), min(_COMPACT_COLS, full_view._num_cols) // 2,
             _COMPACT_ROWS, min(_COMPACT_COLS, full_view._num_cols), 1))
    compact_view = Grid(visible_elements)
    summary_view = summary if summary is not None else 'grid[{}, {}]'.format(full_view._num_cols, full_view._num_rows)
    mode_index = _MODE_INDICES[expansion_mode] if expansion_mode is not None else None
    if len(elements) <= _COMPACT_COLS:
        return Switch([full_view, summary_view], mode_index if not mode_index == 1 else 0)
    return Switch([full_view, compact_view, summary_view])
