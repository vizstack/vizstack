"""
This file defines all functions and objects which can be used by developers to create visualizations for their objects.
"""

from typing import Sequence, Any, Mapping, Iterable, Optional, List, Tuple, Union
from enum import Enum
import types
import inspect
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
VIZ_FN = 'xn'

# ======================================================================================================================
# Viz function tools.
# -------------------
# Functions and classes which might be used by a developer writing a new viz function for their object.
# ======================================================================================================================


# An enum which includes every color a Viz can take.
# TODO: determine what color options should be available
class Color(Enum):
    EMPHASIS = 'emphasis'
    PRIMARY = 'primary'
    SECONDARY = 'secondary'
    ERROR = 'error'
    INVISIBLE = 'invisible'
    DEFAULT = None


# TODO: this is a bad way to stop cyclic generation of vizzes
_CURRENT = []


def get_viz(o: Any) -> 'Viz':
    """Gets the `Viz` object associated with `o`.

    If `o` is already a Viz, it is returned unchanged. If `o` has a visualization function, its value is returned.
    Otherwise, a default visualization for `o`, depending on its type, is returned.

    Args:
        o: An object to be visualized.

    Returns:
        A Viz object describing how to render `o`.
    """
    global _CURRENT
    if o in _CURRENT:
        # TODO: deal with this better
        return TokenPrimitive('<cyclic ref>')
    _CURRENT.append(o)
    if isinstance(o, Viz):
        viz = o
    elif hasattr(o, VIZ_FN):
        viz = getattr(o, VIZ_FN)()
    # TODO: come up with a better method for dispatching default vizzes, like stubs
    elif isinstance(o, list) or isinstance(o, set) or isinstance(o, tuple):
        viz = SequenceLayout(o)
    elif isinstance(o, dict):
        viz = KeyValueLayout(o)
    elif isinstance(o, (types.FunctionType, types.MethodType, type(all.__call__))):
        args = []
        kwargs = dict()
        for param_name, param in inspect.signature(o).parameters.items():
            if param.default is inspect._empty:
                args.append(param_name)
            else:
                kwargs[param_name] = param.default
        viz = SequenceLayout([
            TokenPrimitive('Function: {}'.format(o.__name__), color=Color.INVISIBLE),
            TokenPrimitive('Positional Arguments', color=Color.INVISIBLE),
            args,
            TokenPrimitive('Keyword Arguments', color=Color.INVISIBLE),
            kwargs,
            ], orientation='vertical')
    elif inspect.ismodule(o):
        attributes = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(o)):
            # There are some functions, like torch.Tensor.data, which exist just to throw errors. Testing these
            # fields will throw the errors. We should consume them and keep moving if so.
            try:
                value = getattr(o, attr)
                if not inspect.ismodule(value):  # Prevent recursing through many modules for no reason
                    attributes[attr] = getattr(o, attr)
            except Exception:
                continue
        viz = SequenceLayout([TokenPrimitive('Module: {}'.format(o.__name__), color=Color.INVISIBLE), attributes],
                             orientation='vertical')
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
        contents = [TokenPrimitive('Class: {}'.format(o.__name__), color=Color.INVISIBLE)]
        if len(functions) > 0:
            contents.extend([TokenPrimitive('Functions', color=Color.INVISIBLE), functions])
        if len(staticfields) > 0:
            contents.extend([TokenPrimitive('Fields', color=Color.INVISIBLE), staticfields])
        viz = SequenceLayout(contents, orientation='vertical')
    elif isinstance(o, (str, int, float, bool)) or o is None:
        viz = TokenPrimitive(o)
    else:
        instance_class = type(o)
        instance_class_attrs = dir(instance_class)
        contents = dict()
        for attr in filter(lambda a: not a.startswith('__'), dir(o)):
            value: Any = getattr(o, attr)
            try:
                if not isinstance(value, (types.FunctionType, types.MethodType, type(all.__call__))) and (
                        attr not in instance_class_attrs or getattr(instance_class, attr, None) != value):
                    contents[attr] = value
            except Exception:
                # If some unexpected error occurs (as any object can override `getattr()` like Pytorch does,
                # and raise any error), just skip over instead of crashing
                continue
        viz = SequenceLayout([
            TokenPrimitive('Object: {}'.format(type(o).__name__), color=Color.INVISIBLE),
            contents
        ], orientation='vertical')
    _CURRENT.pop()
    return viz


# ======================================================================================================================
# Viz classes.
# -----------------
# These objects subclass Viz and will be instantiated directly by developers writing visualizations for their objects.
# ======================================================================================================================

class Viz:
    """Interface for new Viz objects.

    Each Viz should be a subclass of Viz, and must pass an optional name and a default expansion state to the
    constructor. The subclasses should also implement `compile_full()`, which creates a full VizModel,
    `compile_compact()`, which creates a compact VizModel, and `__str__()`, which is used to generate the text for
    its summary model.
    """

    def __init__(self, name: Optional[str], expansion_state: ExpansionMode) -> None:
        """Constructor.

        Args:
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is specifically given in the watch
                expression.
        """
        self._name: Optional[str] = name
        self.default_expansion_state: ExpansionMode = expansion_state

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

    def compile_summary(self) -> 'TokenPrimitiveModel':
        """Creates a limited-size VizModel giving a hint as to the Viz's properties.

        Returns:
            A TokenPrimitiveModel whose text is the name of this Viz if given in the constructor, or otherwise this
                Viz's string representation.
        """
        return TokenPrimitive(str(self) if self._name is None else self._name).compile_summary()

    def __str__(self) -> str:
        """Returns a string which describes the basic properties of the Viz.

        For example, "list[5]" or "tensor[float]".

        Returns:
            A brief string representation of the Viz.
        """
        raise NotImplementedError


class TokenPrimitive(Viz):
    """
    A Viz which is a single, contiguous block of text content.
    """

    def __init__(self, val: Any, color: Color = Color.DEFAULT) -> None:
        """Constructor.

        Args:
            val: The text to include on the token, or an object whose string representation should be written on the
                token.
            color: The background color of the token.
        """
        super(TokenPrimitive, self).__init__(None, ExpansionMode.FULL)
        # TODO: smarter strings
        self._text: str = str(val)
        self._color: Color = color

    def compile_full(self) -> Tuple['TokenPrimitiveModel', Iterable[Viz]]:
        return TokenPrimitiveModel(self._text, self._color.value), []

    def compile_compact(self) -> Tuple['TokenPrimitiveModel', Iterable[Viz]]:
        return TokenPrimitiveModel(self._text, self._color.value), []

    def compile_summary(self) -> 'TokenPrimitiveModel':
        return TokenPrimitiveModel(self._text, self._color.value)

    def __str__(self) -> str:
        return self._text


class DagLayout(Viz):

    def __init__(
            self, name: Optional[str] = None,
            expansion_state: ExpansionMode = ExpansionMode.NONE
    ) -> None:
        super(DagLayout, self).__init__(name, expansion_state)
        self._nodes: List['_DagLayoutNode'] = []
        self._edges: List['_DagLayoutEdge'] = []
        self._containers: List['_DagLayoutContainer'] = []
        self._alignments: List[List[Union['_DagLayoutNode', '_DagLayoutContainer']]] = []

    def compile_full(self) -> Tuple['DagLayoutModel', Iterable[Viz]]:
        return (
            DagLayoutModel(self._nodes, self._containers, self._edges, self._alignments),
            [node.viz for node in self._nodes],
        )

    def compile_compact(self) -> Tuple['DagLayoutModel', Iterable[Viz]]:
        # TODO: come up with a compact representation
        return (
            DagLayoutModel(self._nodes, self._containers, self._edges, self._alignments),
            [node.viz for node in self._nodes],
        )

    def create_node(self, o: Any) -> '_DagLayoutNode':
        node = _DagLayoutNode(str(len(self._nodes) + len(self._containers)), get_viz(o))
        self._nodes.append(node)
        return node

    def create_container(
            self,
            flow_direction: Optional[str] = None,
            is_expanded: Optional[bool] = None,
            is_interactive: Optional[bool] = None,
            is_visible: Optional[bool] = None,
            is_topological: Optional[bool] = None
    ) -> '_DagLayoutContainer':
        container = _DagLayoutContainer(
            str(len(self._nodes) + len(self._containers)), flow_direction, is_expanded,
            is_interactive, is_visible, is_topological
        )
        self._containers.append(container)
        return container

    def create_edge(
            self, start: Union['_DagLayoutNode', '_DagLayoutContainer'],
            end: Union['_DagLayoutNode', '_DagLayoutContainer']
    ) -> '_DagLayoutEdge':
        edge = _DagLayoutEdge(str(len(self._edges)), start, end)
        self._edges.append(edge)
        return edge

    def align_elements(self, elements: List[Union['_DagLayoutNode', '_DagLayoutContainer']]) -> None:
        self._alignments.append(elements)

    def __str__(self) -> str:
        return 'graph'


class _DagLayoutNode:

    def __init__(self, node_id: str, viz: 'Viz') -> None:
        self.node_id = node_id
        self.viz = viz
        self.container: Optional['_DagLayoutContainer'] = None

    def get_id(self) -> str:
        return self.node_id

    def to_dict(self) -> Mapping[str, Any]:
        return {
            'vizId': self.viz,
        }

    def get_container(self) -> '_DagLayoutContainer':
        return self.container


class _DagLayoutEdge:

    def __init__(
            self, edge_id: str, start: Union['_DagLayoutNode', '_DagLayoutContainer'],
            end: Union['_DagLayoutNode', '_DagLayoutContainer'], start_side: Optional[str] = None, end_side: Optional[
                str] = None
    ) -> None:
        self.edge_id = edge_id
        self.start = start
        self.end = end
        self.start_side = start_side
        self.end_side = end_side

    def get_id(self) -> str:
        return self.edge_id

    def to_dict(self) -> Mapping[str, Any]:
        return {
            'startId': self.start.get_id(),
            'endId': self.end.get_id(),
            'startSide': self.start_side,
            'endSide': self.end_side,
        }


class _DagLayoutContainer:

    def __init__(
            self, container_id: str, flow_direction: Optional[str], is_expanded: Optional[bool],
            is_interactive: Optional[bool], is_visible: Optional[bool],
            is_topological: Optional[bool]
    ) -> None:
        self.container_id = container_id
        self.flow_direction = flow_direction
        self.is_expanded = is_expanded
        self.is_interactive = is_interactive
        self.is_visible = is_visible
        self.is_topological = is_topological
        self.elements: List[Union['_DagLayoutNode', '_DagLayoutContainer']] = []
        self.container: Optional['_DagLayoutContainer'] = None

    def get_id(self) -> str:
        return self.container_id

    def to_dict(self) -> Mapping[str, Any]:
        return {
            'elements': [item.get_id() for item in self.elements],
            'flowDirection': self.flow_direction,
            'isExpanded': self.is_expanded,
            'isInteractive': self.is_interactive,
            'isVisible': self.is_visible,
            'isTopological': self.is_topological,
        }

    # TODO: this interface is strange. make it clear what should be used by devs and what's for internal use
    def add_child(self, child: Union['_DagLayoutNode', '_DagLayoutContainer']) -> None:
        assert child.container is None
        child.container = self
        self.elements.append(child)

    def remove_child(self, child: Union['_DagLayoutNode', '_DagLayoutContainer']) -> None:
        assert child in self.elements
        assert child.container == self
        child.container = None
        self.elements.remove(child)

    def is_ancestor(self, descendant: Union['_DagLayoutNode', '_DagLayoutContainer']) -> bool:
        if len(self.elements) == 0:
            return False
        if descendant in self.elements:
            return True
        return any([isinstance(child, _DagLayoutContainer) and child.is_ancestor(descendant) for child in self.elements])

    def get_container(self) -> Optional['_DagLayoutContainer']:
        return self.container


class GridLayout(Viz):
    """
   A Viz which shows other Vizzes laid out in a grid of rows and columns.
   """

    # How many key-value pairs to show in the compact form of this Viz.
    COMPACT_COLS = 3
    COMPACT_ROWS = 3

    def __init__(
            self,
            geometries: List[Tuple[Any, int, int, int, int]],
            name: Optional[str] = None,
            expansion_state: ExpansionMode = ExpansionMode.NONE
    ) -> None:
        """Constructor.

        Args:
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is given in the watch expression.
        """
        super(GridLayout, self).__init__(name, expansion_state)
        self._num_cols = max(x + w for _, x, _, w, _ in geometries) if len(geometries) > 0 else 1
        self._num_rows = max(y + h for _, _, y, _, h in geometries) if len(geometries) > 0 else 1
        self._geometries: List[Tuple[Viz, int, int, int, int]] = [(get_viz(o), x, y, w, h)
                                                                  for o, x, y, w, h in geometries]

    def compile_full(self) -> Tuple['GridLayoutModel', Iterable[Viz]]:
        return (
            GridLayoutModel(self._geometries),
            [o for o, _, _, _, _ in self._geometries]
        )

    def compile_compact(self) -> Tuple['GridLayoutModel', Iterable[Viz]]:
        visible_geometries = [(o, x, y, min(w, self.COMPACT_COLS - x), min(h, self.COMPACT_ROWS - y))
                              for o, x, y, w, h in self._geometries
                              if x < self.COMPACT_COLS and y < self.COMPACT_ROWS]
        return (
            GridLayoutModel(visible_geometries),
            [o for o, _, _, _, _ in visible_geometries]
        )

    def __str__(self) -> str:
        return 'grid[{}, {}]'.format(self._num_cols, self._num_rows)


class SequenceLayout(GridLayout):
    """
    A Viz which is a series of other Vizzes shown in fixed order.
    """

    def __init__(
            self,
            elements: Sequence[Any],
            orientation: str = 'horizontal',
            name: Optional[str] = None,
            expansion_state: ExpansionMode = ExpansionMode.NONE
    ) -> None:
        """Constructor.

        Args:
            elements: An iterable of objects whose Vizzes should be shown in sequence.
            orientation: How to arrange the elements of this Viz. Should be either "horizontal" or "vertical".
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is given in the watch expression.
        """
        if orientation == 'horizontal':
            super(SequenceLayout, self).__init__([(elem, i, 0, 1, 1) for i, elem in enumerate(elements)],
                                                 name, expansion_state)
        elif orientation == 'vertical':
            super(SequenceLayout, self).__init__([(elem, 0, i, 1, 1) for i, elem in enumerate(elements)],
                                                 name, expansion_state)
        else:
            raise ValueError('Provided orientation "{}" not recognized.'.format(orientation))

    def __str__(self) -> str:
        return '[ ... ]'


class KeyValueLayout(GridLayout):
    """
    A Viz which shows pairs of other Vizzes as key-value pairs.
    """

    def __init__(
            self,
            key_value_mapping: Mapping[Any, Any],
            name: Optional[str] = None,
            expansion_state: ExpansionMode = ExpansionMode.NONE
    ) -> None:
        """Constructor.

        Args:
            key_value_mapping: A mapping of objects whose Vizzes should be shown as key-value pairs.
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is given in the watch expression.
        """
        keys = list(key_value_mapping.keys())
        super(KeyValueLayout, self).__init__([(key, 0, i, 1, 1) for i, key in enumerate(keys)] +
                                             [(TokenPrimitive(':', Color.INVISIBLE), 1, i, 1, 1) for i in range(len(
                                                 keys))] +
                                             [(key_value_mapping[key], 2, i, 1, 1) for i, key in enumerate(keys)],
                                             name, expansion_state)

    def __str__(self) -> str:
        return '{ ... }'


class TokenPrimitiveModel(VizModel):

    def __init__(self, text: str, color: Optional[str]) -> None:
        super(TokenPrimitiveModel, self).__init__('TokenPrimitive', {
            'text': text,
            'color': color,
        })


class DagLayoutModel(VizModel):

    def __init__(
            self, nodes: List['_DagLayoutNode'], containers: List['_DagLayoutContainer'],
            edges: List['_DagLayoutEdge'],
            alignments: List[List[Union['_DagLayoutNode', '_DagLayoutContainer']]]
    ) -> None:
        super(DagLayoutModel, self).__init__(
            'DagLayout', {
                'nodes': {node.get_id(): node.to_dict()
                          for node in nodes},
                'containers': {container.get_id(): container.to_dict()
                               for container in containers},
                'edges': {edge.get_id(): edge.to_dict()
                          for edge in edges},
                'alignments': [[item.get_id() for item in alignment] for alignment in alignments]
            }
        )


class GridLayoutModel(VizModel):

    def __init__(self, geometries: List[Tuple['Viz', int, int, int, int]]):
        super(GridLayoutModel, self).__init__(
            'GridLayout', {
                'geometries': geometries,
            }
        )