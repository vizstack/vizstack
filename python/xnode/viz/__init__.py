"""
This file defines all functions and objects which can be used by developers to create visualizations for their objects.
"""

from typing import Iterable, Any, Mapping, Iterable, Optional, List, Tuple, Union, Dict
from enum import Enum
import types
import inspect
import os
from xnode.constants import VizModel, ExpansionMode

# TODO: potentially use these remnants of the old get_viz engine
# TENSOR_TYPES: Mapping[str, str] = {
#     'torch.HalfTensor': 'float16',
#     'torch.FloatTensor': 'float32',
#     'torch.DoubleTensor': 'float64',
#     'torch.ByteTensor': 'uint8',
#     'torch.CharTensor': 'int8',
#     'torch.ShortTensor': 'int16',
#     'torch.IntTensor': 'int32',
#     'torch.LongTensor': 'int64',
#     'torch.cuda.HalfTensor': 'float16',
#     'torch.cuda.FloatTensor': 'float32',
#     'torch.cuda.DoubleTensor': 'float64',
#     'torch.cuda.ByteTensor': 'uint8',
#     'torch.cuda.CharTensor': 'int8',
#     'torch.cuda.ShortTensor': 'int16',
#     'torch.cuda.IntTensor': 'int32',
#     'torch.cuda.LongTensor': 'int64',
# }

# The name of the method on an object which should return a `Viz` depicting that object.
VIZ_FN = '__view__'

# ======================================================================================================================
# Viz function tools.
# -------------------
# Functions and classes which might be used by a developer writing a new viz function for their object.
# ======================================================================================================================


# An enum which includes every color a Viz can take.
# TODO: determine what color options should be available
class Color(Enum):
    PRIMARY = 'primary'
    SECONDARY = 'secondary'
    ERROR = 'error'
    INVISIBLE = 'invisible'


# TODO: this is a bad way to stop cyclic generation of vizzes
_CURRENT = []


def get_viz(o: Any) -> 'Viz':
    """Gets the Viz associated with ``o``.

    If ``o`` is already a Viz, it is returned unchanged. If ``o`` has an ``xn()`` method, its value is returned.
    Otherwise, a default visualization for ``o``, depending on its type, is returned.

    Args:
        o: An object to be visualized.

    Returns:
        A Viz which describes how to render ``o``.
    """
    global _CURRENT
    if o in _CURRENT:
        # TODO: deal with this better
        return Token('<cyclic ref>')
    _CURRENT.append(o)
    if isinstance(o, Viz):
        viz = o
    elif hasattr(o, VIZ_FN):
        viz = getattr(o, VIZ_FN)()
    # TODO: come up with a better method for dispatching default vizzes, like stubs
    elif isinstance(o, list):
        viz = Sequence(
            o,
            start_motif='List[{}] ['.format(len(o)),
            end_motif=']',
            summary='List[{}]'.format(len(o)))
    elif isinstance(o, set):
        viz = Sequence(
            o,
            start_motif='Set[{}] {{'.format(len(o)),
            end_motif='}',
            summary='Set[{}]'.format(len(o)))
    elif isinstance(o, tuple):
        viz = Sequence(
            o,
            start_motif='Tuple[{}] ('.format(len(o)),
            end_motif=')',
            summary='Tuple[{}]'.format(len(o)))
    elif isinstance(o, dict):
        viz = KeyValues(
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
        viz = Sequence([
            Sequence(
                args,
                start_motif='Positional Args [',
                end_motif=']',
                summary='Args',
                expansion_mode=ExpansionMode.COMPACT),
            KeyValues(
                kwargs,
                start_motif='Keyword Args {',
                end_motif='}',
                summary='Kwargs',
                expansion_mode=ExpansionMode.COMPACT),
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
        viz = KeyValues(
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
                KeyValues(
                    functions,
                    start_motif='Functions {',
                    end_motif='}',
                    summary='Functions',
                    expansion_mode=ExpansionMode.COMPACT))
        if len(staticfields) > 0:
            contents.append(
                KeyValues(
                    staticfields,
                    start_motif='Fields {',
                    end_motif='}',
                    summary='Fields',
                    expansion_mode=ExpansionMode.COMPACT))
        viz = Sequence(
            contents,
            start_motif='Class[{}] ('.format(o.__name__),
            end_motif=')',
            summary='Class[{}]'.format(o.__name__),
            orientation='vertical')
    elif isinstance(o, (str, int, float, bool)) or o is None:
        viz = Token(o if not isinstance(o, str) else '"{}"'.format(o))
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
        viz = KeyValues(
            contents,
            item_separator='=',
            start_motif='Instance[{}] {{'.format(type(o).__name__),
            end_motif='}',
            summary='Instance[{}]'.format(type(o).__name__))
    _CURRENT.pop()
    return viz


# ======================================================================================================================
# Viz classes.
# -----------------
# These objects subclass Viz and will be instantiated directly by developers writing visualizations for their objects.
# ======================================================================================================================


class Viz:
    """Interface for new Viz objects.

    Each Primitive and Layout should be a subclass of ``Viz``. The subclasses should also implement `compile_full()`,
    which creates a full ``VizModel``, `compile_compact()`, which creates a compact VizModel, and `__str__()`,
    which is used to generate the text for
    its summary model.
    """

    def __init__(self, summary: Optional[str],
                 expansion_mode: Optional[ExpansionMode]) -> None:
        """Constructor.

        Args:
            summary: An optional name to assign to this Viz, which will be shown in its summary expansion mode.
            expansion_mode: The expansion state this Viz should take if none is specifically given in the watch
                expression.
        """
        self._summary: Optional[str] = summary
        self.default_expansion_mode: Optional[ExpansionMode] = expansion_mode

    def compile_full(self) -> Tuple[VizModel, Iterable['Viz']]:
        """Creates a VizModel which describes this Viz and can be sent to a client for rendering.

        Returns:
            A VizModel describing the properties of this Viz in its entirety.
            A list of all Viz objects referenced in the VizModel.
        """
        raise NotImplementedError

    def compile_compact(self) -> Tuple[VizModel, Iterable['Viz']]:
        """Creates a compact VizModel which describes this Viz and can be sent to a client for rendering.

        Returns:
            A VizModel describing a glimpse of the properties of this Viz.
            A list of all Viz objects referenced in the VizModel.
        """
        raise NotImplementedError

    def compile_summary(self) -> 'TextPrimitiveModel':
        """Creates a limited-size VizModel giving a hint as to the Viz's properties.

        Returns:
            A TextPrimitiveModel whose text is the name of this Viz if given in the constructor, or otherwise this
                Viz's string representation.
        """
        return Token(str(self) if self._summary is None else self._summary
                     ).compile_summary()

    def __str__(self) -> str:
        """Returns a string which describes the basic properties of the Viz.

        For example, "list[5]" or "tensor[float]".

        Returns:
            A brief string representation of the Viz.
        """
        raise NotImplementedError


class Text(Viz):
    """
    A Viz which renders a contiguous block of text.
    """

    def __init__(self,
                 text: str,
                 color: Optional[Color] = None,
                 variant: Optional[str] = None) -> None:
        """
        Args:
            text: The text which should be rendered.
            color: The color of the text.
            variant: The variant of the text; one of either "plain" or "token".
        """
        super(Text, self).__init__(None, ExpansionMode.FULL)
        self._text: str = text
        self._color: Color = color
        self._variant: str = variant

    def compile_full(self) -> Tuple['TextPrimitiveModel', Iterable[Viz]]:
        return TextPrimitiveModel(
            self._text,
            str(self._color.value) if self._color is not None else self._color,
            self._variant), []

    def compile_compact(self) -> Tuple['TextPrimitiveModel', Iterable[Viz]]:
        return TextPrimitiveModel(
            self._text,
            str(self._color.value) if self._color is not None else self._color,
            self._variant), []

    def compile_summary(self) -> 'TextPrimitiveModel':
        return TextPrimitiveModel(
            self._text,
            str(self._color.value) if self._color is not None else self._color,
            self._variant)

    def __str__(self) -> str:
        return self._text


class Image(Viz):
    """
    A Viz which renders an image as read from a file.
    """

    def __init__(self,
                 file_path: str,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        """
        Args:
            file_path: The local path to the image file.
        """
        super(Image, self).__init__(None, expansion_mode)
        self._file_path: str = os.path.abspath(file_path)

    def compile_full(self) -> Tuple['ImagePrimitiveModel', Iterable[Viz]]:
        return ImagePrimitiveModel(self._file_path), []

    def compile_compact(self) -> Tuple['ImagePrimitiveModel', Iterable[Viz]]:
        return ImagePrimitiveModel(self._file_path), []

    def compile_summary(self):
        return ImagePrimitiveModel(self._file_path)

    def __str__(self):
        return 'Image'


class Token(Text):
    """
    A Viz which renders a string representation of any object.
    """

    def __init__(self, o: Any) -> None:
        """
        Args:
            o: The object whose string representation should be rendered.
        """
        super(Token, self).__init__(str(o), variant='token')


class Flow(Viz):
    """
    A Viz which renders other Vizzes as a series of inline elements.
    """

    COMPACT_LEN = 3

    def __init__(self,
                 elements: List[Any],
                 summary: Optional[str] = None,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        """
        Args:
            elements: A sequence of objects which should be visualized.
            summary: An optional string which will be shown when the ``Flow`` is in its summary expansion mode.
            expansion_mode: An optional expansion mode which the ``Flow`` should adopt by default.
        """
        super(Flow, self).__init__(summary, expansion_mode)
        self._elements = [get_viz(o) for o in elements]

    def compile_full(self) -> Tuple['FlowLayoutModel', Iterable[Viz]]:
        return FlowLayoutModel(self._elements), self._elements

    def compile_compact(self) -> Tuple['FlowLayoutModel', Iterable[Viz]]:
        return FlowLayoutModel(self._elements[:self.COMPACT_LEN]
                               ), self._elements[:self.COMPACT_LEN]

    def __str__(self) -> str:
        return '[ ... ]'


class DagLayout(Viz):
    def __init__(self,
                 flow_direction: Optional[str] = None,
                 align_children: Optional[bool] = None,
                 summary: Optional[str] = None,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        super(DagLayout, self).__init__(summary, expansion_mode)
        self._flow_direction = flow_direction
        self._align_children = align_children
        self._nodes: List['DagLayoutNode'] = []
        self._edges: List['DagLayoutEdge'] = []
        self._alignments: List[List['DagLayoutNode']] = []

    def compile_full(self) -> Tuple['DagLayoutModel', Iterable[Viz]]:
        return (
            DagLayoutModel(self._nodes, self._edges, self._alignments,
                           self._flow_direction, self._align_children),
            [node.viz for node in self._nodes],
        )

    def compile_compact(self) -> Tuple['DagLayoutModel', Iterable[Viz]]:
        # TODO: come up with a compact representation
        return (
            DagLayoutModel(self._nodes, self._edges, self._alignments,
                           self._flow_direction, self._align_children),
            [node.viz for node in self._nodes],
        )

    def create_node(self,
                    o: Any,
                    flow_direction: Optional[str] = None,
                    align_children: Optional[bool] = None,
                    is_expanded: Optional[bool] = None,
                    is_interactive: Optional[bool] = None,
                    is_visible: Optional[bool] = None) -> 'DagLayoutNode':
        node = DagLayoutNode(
            str(len(self._nodes)), get_viz(o), flow_direction, align_children,
            is_expanded, is_interactive, is_visible)
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

    def __str__(self) -> str:
        return 'graph'


class DagLayoutNode:
    def __init__(self, node_id: str, viz: 'Viz', flow_direction: Optional[str],
                 align_children: Optional[bool], is_expanded: Optional[bool],
                 is_interactive: Optional[bool],
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
        return {
            'vizId': self.viz,
            'children': [item.get_id() for item in self.elements],
            'flowDirection': self.flow_direction,
            'isExpanded': self.is_expanded,
            'isInteractive': self.is_interactive,
            'isVisible': self.is_visible,
            'alignChildren': self.align_children,
            'ports': self.ports,
        }

    # TODO: this interface is strange. make it clear what should be used by devs and what's for internal use
    def create_port(self,
                    port_name: str,
                    side: Optional[str] = None,
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
        if descendant in self.elements:
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
        return {
            'startId': self.start.get_id(),
            'endId': self.end.get_id(),
            'startPort': self.start_port,
            'endPort': self.end_port,
        }


class Grid(Viz):
    """
   A Viz which renders other Vizzes in a flexibly-sized grid.
   """

    # How many key-value pairs to show in the compact form of this Viz.
    COMPACT_COLS = 5
    COMPACT_ROWS = 5

    def __init__(self,
                 elements: List[Tuple[Any, int, int, int, int]],
                 summary: Optional[str] = None,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        """
        Args:
            elements: The contents of the grid as a list of tuples. Each tuple is of the form
                ``(obj, col, row, width, height)``,
                where ``obj`` is the object to be visualized, ``col`` is its horizontal position in the grid,
                ``row`` is its vertical position, ``width`` is the number of columns it should span, and ``height``
                is the number of rows it should span.
            summary: An optional string which will be shown when the ``Grid`` is in its summary expansion mode.
            expansion_mode: An optional expansion mode which the ``Grid`` should adopt by default.
        """
        super(Grid, self).__init__(summary, expansion_mode)
        self._num_cols = max(
            x + w for _, x, _, w, _ in elements) if len(elements) > 0 else 1
        self._num_rows = max(
            y + h for _, _, y, _, h in elements) if len(elements) > 0 else 1
        self._elements: List[Tuple[Viz, int, int, int, int]] = [
            (get_viz(o), x, y, w, h) for o, x, y, w, h in elements
        ]
        self._right_ellipsis = Text('. . .')
        self._bottom_ellipsis = Text('. . .')

    def __add__(self, other: Tuple[Any, int, int, int, int]) -> 'Grid':
        elem, x, y, w, h = other
        self._elements.append((get_viz(elem), x, y, w, h))
        self._num_cols = max(self._num_cols, x + w)
        self._num_rows = max(self._num_rows, y + h)
        return self

    def compile_full(self) -> Tuple['GridLayoutModel', Iterable[Viz]]:
        return (GridLayoutModel(self._elements),
                [o for o, _, _, _, _ in self._elements])

    def compile_compact(self) -> Tuple['GridLayoutModel', Iterable[Viz]]:
        visible_elements = []
        extends_right = self._num_cols > self.COMPACT_COLS
        extends_below = self._num_rows > self.COMPACT_ROWS
        for o, x, y, w, h in self._elements:
            if (x < self.COMPACT_COLS - 1
                    or not extends_right) and (y < self.COMPACT_ROWS - 1
                                               or not extends_below):
                visible_elements.append((o, x, y, min(w,
                                                      self.COMPACT_COLS - x),
                                         min(h, self.COMPACT_ROWS - y)))
        if extends_right:
            visible_elements.append(
                (self._right_ellipsis, self.COMPACT_COLS,
                 min(self.COMPACT_ROWS, self._num_rows) // 2, 1, 1))
        if extends_below:
            visible_elements.append(
                (self._bottom_ellipsis,
                 min(self.COMPACT_COLS, self._num_cols) // 2,
                 self.COMPACT_ROWS, min(self.COMPACT_COLS, self._num_cols), 1))
        return (GridLayoutModel(visible_elements),
                [o for o, _, _, _, _ in visible_elements])

    def __str__(self) -> str:
        return 'grid[{}, {}]'.format(self._num_cols, self._num_rows)


class Sequence(Grid):
    """
    A Viz which renders other Vizzes as blocks arranged in a fixed order.
    """

    def __init__(self,
                 elements: Optional[Iterable[Any]] = None,
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 orientation: str = 'horizontal',
                 summary: Optional[str] = None,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        """
        Args:
            elements: A sequence of objects which should be visualized.
            orientation: How to arrange the elements of this Viz. Should be either "horizontal" or "vertical".
            summary: An optional string which will be shown when the ``Sequence`` is in its summary expansion
                mode.
            expansion_mode: An optional expansion mode which the ``Sequence`` should adopt by default.
        """
        self._orientation = orientation
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
            super(Sequence, self).__init__(grid_elements, summary,
                                           expansion_mode)
        elif orientation == 'vertical':
            grid_elements = [(elem, 1, i + 1, 1, 1)
                             for i, elem in enumerate(elements)]
            if start_motif:
                grid_elements.append((Text(start_motif), 0, 0, 2, 1))
            if end_motif:
                grid_elements.append((Text(end_motif), 0, len(elements) + 1, 2,
                                      1))
            super(Sequence, self).__init__(grid_elements, summary,
                                           expansion_mode)
        else:
            raise ValueError(
                'Provided orientation "{}" not recognized.'.format(
                    orientation))

    def __add__(self, other: Any) -> 'Sequence':
        if self._orientation == 'horizontal':
            self._elements.append((get_viz(other), len(self._elements), 0, 1,
                                   1))
            self._num_cols += 1
        elif self._orientation == 'vertical':
            self._elements.append((get_viz(other), 0, len(self._elements), 1,
                                   1))
            self._num_rows += 1
        return self

    def __str__(self) -> str:
        return '[ ... ]'


class KeyValues(Grid):
    """
    A Viz which renders other Vizzes as key-value pairs.
    """

    def __init__(self,
                 key_value_mapping: Dict[Any, Any],
                 item_separator: str = ':',
                 start_motif: Optional[str] = None,
                 end_motif: Optional[str] = None,
                 summary: Optional[str] = None,
                 expansion_mode: Optional[ExpansionMode] = None) -> None:
        """Constructor.

        Args:
            key_value_mapping: A mapping of objects which should be visualized as key-value pairs
            summary: An optional string which will be shown when the ``KeyValues`` is in its summary expansion
                mode.
            expansion_mode: An optional expansion mode which the ``KeyValues`` should adopt by default.
        """
        keys = list(key_value_mapping.keys())
        elements = [(key, 1, i + 1, 1, 1) for i, key in enumerate(keys)] + [
            (Text(item_separator), 2, i + 1, 1, 1) for i in range(len(keys))
        ] + [(key_value_mapping[key], 3, i + 1, 1, 1)
             for i, key in enumerate(keys)]
        if start_motif is not None:
            elements.append((Text(start_motif), 0, 0, 4, 1))
        if end_motif is not None:
            elements.append((Text(end_motif), 0, len(key_value_mapping) + 1, 4,
                             1))
        super(KeyValues, self).__init__(elements, summary, expansion_mode)

    def __str__(self) -> str:
        return '{ ... }'


class TextPrimitiveModel(VizModel):
    def __init__(self, text: str, color: Optional[str],
                 variant: Optional[str]) -> None:
        super(TextPrimitiveModel, self).__init__('TextPrimitive', {
            'text': text,
            'color': color,
            'variant': variant,
        })


class ImagePrimitiveModel(VizModel):
    def __init__(self, file_path: str) -> None:
        super(ImagePrimitiveModel, self).__init__('ImagePrimitive', {
            'filePath': file_path,
        })


class DagLayoutModel(VizModel):
    def __init__(self, nodes: List['DagLayoutNode'],
                 edges: List['DagLayoutEdge'],
                 alignments: List[List['DagLayoutNode']],
                 flow_direction: Optional[str],
                 align_children: Optional[str]) -> None:
        super(DagLayoutModel, self).__init__(
            'DagLayout', {
                'nodes': {node.get_id(): node.to_dict()
                          for node in nodes},
                'edges': {edge.get_id(): edge.to_dict()
                          for edge in edges},
                'alignments': [[item.get_id() for item in alignment]
                               for alignment in alignments],
                'flowDirection':
                flow_direction,
                'alignChildren':
                align_children,
            })


class GridLayoutModel(VizModel):
    def __init__(self, elements: List[Tuple['Viz', int, int, int, int]]):
        super(GridLayoutModel, self).__init__('GridLayout', {
            'elements': elements,
        })


class FlowLayoutModel(VizModel):
    def __init__(self, elements: List['Viz']):
        super(FlowLayoutModel, self).__init__('FlowLayout', {
            'elements': elements,
        })
