from typing import Sequence, Any, Mapping, Iterable, Optional, List, Dict, Tuple, Union
from enum import Enum
from xn.constants import VizModel, ExpansionState

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

# ======================================================================================================================
# Public constants.
# -----------------
# Fields which other modules can use to properly interact with this module.
# ======================================================================================================================

# The name of the function which is called and produces an object's visualization.
VIZ_FN = 'xn'

# ======================================================================================================================
# Viz utils.
# ----------
# Functions and classes which are helpful for creating new Viz classes.
# ======================================================================================================================


# An enum which includes every color a Viz can take.
class Color(Enum):
    PRIMARY = 1
    SECONDARY = 2
    BACKGROUND = 3


def get_viz(o: Any) -> '_Viz':
    """Gets the _Viz object associated with `o`.

    If `o` is already a _Viz, it is returned unchanged. If `o` has a visualization function, its value is returned.
    Otherwise, a default visualization for `o`, depending on its type, is returned.

    Args:
        o: An object to be visualized.

    Returns:
        A _Viz object describing how to render `o`.
    """
    if isinstance(o, _Viz):
        return o
    if hasattr(o, VIZ_FN):
        return getattr(o, VIZ_FN)()
    elif isinstance(o, list):
        return SequenceLayout(o)
    else:
        # TODO: use a better generic get_viz
        return TokenPrimitive(o)


class _Viz:
    """Interface for new Viz objects.

    Each Viz should be a subclass of _Viz, and must pass an optional name and a default expansion state to the
    constructor. The subclasses should also implement `compile_full()`, which creates a full VizModel,
    `compile_compact()`, which creates a compact VizModel, and `__str__()`, which is used to generate the text for
    its summary model.
    """

    def __init__(self, name: Optional[str], expansion_state: ExpansionState) -> None:
        """Constructor.

        Args:
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is specifically given in the watch
                expression.
        """
        self._name: Optional[str] = name
        self.default_expansion_state: ExpansionState = expansion_state

    def compile_full(self) -> Tuple[VizModel, Iterable['_Viz']]:
        """Creates a VizModel which describes this _Viz and can be sent to a client for rendering.

        Returns:
            A VizModel describing the properties of this _Viz in its entirety.
            A list of all _Viz objects referenced in the VizModel.
        """
        raise NotImplementedError

    def compile_compact(self) -> Tuple[VizModel, Iterable['_Viz']]:
        """Creates a compact VizModel which describes this _Viz and can be sent to a client for rendering.

        Returns:
            A VizModel describing a glimpse of the properties of this _Viz.
            A list of all _Viz objects referenced in the VizModel.
        """
        raise NotImplementedError

    def compile_summary(self) -> 'TokenPrimitiveModel':
        """Creates a limited-size VizModel giving a hint as to the _Viz's properties.

        Returns:
            A TokenPrimitiveModel whose text is the name of this _Viz if given in the constructor, or otherwise this
                _Viz's string representation.
        """
        return TokenPrimitive(str(self) if self._name is None else self._name).compile_summary()

    def __str__(self) -> str:
        """Returns a string which describes the basic properties of the _Viz.

        For example, "list[5]" or "tensor[float]".

        Returns:
            A brief string representation of the _Viz.
        """
        raise NotImplementedError


# ======================================================================================================================
# Viz classes.
# -----------------
# These objects subclass _Viz and will be instantiated directly by developers writing visualizations for their objects.
# ======================================================================================================================


class TokenPrimitive(_Viz):
    """
    A Viz which is a single, contiguous block of text content.
    """

    def __init__(self, val: Any, color: Color = Color.PRIMARY) -> None:
        """Constructor.

        Args:
            val: The text to include on the token, or an object whose string representation should be written on the
                token.
            color: The background color of the token.
        """
        super(TokenPrimitive, self).__init__(None, ExpansionState.FULL)
        # TODO: smarter strings
        self._text: str = str(val)
        self._color: Color = color

    def compile_full(self) -> Tuple['TokenPrimitiveModel', Iterable[_Viz]]:
        return TokenPrimitiveModel(self._text), []

    def compile_compact(self) -> Tuple['TokenPrimitiveModel', Iterable[_Viz]]:
        return TokenPrimitiveModel(self._text), []

    def compile_summary(self) -> 'TokenPrimitiveModel':
        return TokenPrimitiveModel(self._text)

    def __str__(self) -> str:
        return self._text


class SequenceLayout(_Viz):
    """
    A Viz which is a series of other Vizzes shown in fixed order.
    """

    # How many items are shown in the compact form of this Viz.
    COMPACT_LEN = 2

    def __init__(
            self,
            elements: Sequence[Any],
            orientation: Optional[str] = None,
            name: Optional[str] = None,
            expansion_state: ExpansionState = ExpansionState.DEFAULT
    ) -> None:
        """Constructor.

        Args:
            elements: An iterable of objects whose Vizzes should be shown in sequence.
            orientation: How to arrange the elements of this Viz. Should be either "horizontal" or "vertical".
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is given in the watch expression.
        """
        super(SequenceLayout, self).__init__(name, expansion_state)
        self._orientation: Optional[str] = orientation
        self._elements: List[_Viz] = [get_viz(elem) for elem in elements]

    def compile_full(self) -> Tuple['SequenceLayoutModel', Iterable[_Viz]]:
        return SequenceLayoutModel(self._elements, self._orientation), self._elements

    def compile_compact(self) -> Tuple['SequenceLayoutModel', Iterable[_Viz]]:
        return (
            SequenceLayoutModel(self._elements[:SequenceLayout.COMPACT_LEN], self._orientation),
            self._elements[:SequenceLayout.COMPACT_LEN]
        )

    def __str__(self) -> str:
        return 'seq[{}]'.format(len(self._elements))


class KeyValueLayout(_Viz):
    """
    A Viz which shows pairs of other Vizzes as key-value pairs.
    """

    # How many key-value pairs to show in the compact form of this Viz.
    COMPACT_LEN = 3

    def __init__(
            self,
            key_value_mapping: Mapping[Any, Any],
            name: Optional[str] = None,
            expansion_state: ExpansionState = ExpansionState.DEFAULT
    ) -> None:
        """Constructor.

        Args:
            key_value_mapping: A mapping of objects whose Vizzes should be shown as key-value pairs.
            name: An optional name to assign to this Viz, which will be shown in its summary state.
            expansion_state: The expansion state this Viz should take if none is given in the watch expression.
        """
        super(KeyValueLayout, self).__init__(name, expansion_state)
        self._key_value_mapping: Dict[_Viz, _Viz] = {
            get_viz(key): get_viz(value)
            for key, value in key_value_mapping.items()
        }

    def compile_full(self) -> Tuple['KeyValueLayoutModel', Iterable[_Viz]]:
        return KeyValueLayoutModel(self._key_value_mapping), \
               list(self._key_value_mapping.keys()) + list(self._key_value_mapping.values())

    def compile_compact(self) -> Tuple['KeyValueLayoutModel', Iterable[_Viz]]:
        items = list(self._key_value_mapping.items())[:KeyValueLayout.COMPACT_LEN]
        return (
            KeyValueLayoutModel({key: value
                                 for key, value in items}),
            [key for key, _ in items] + [value for _, value in items]
        )

    def __str__(self) -> str:
        return 'dict[{}]'.format(len(self._key_value_mapping))


class DagLayout(_Viz):

    def __init__(
            self, name: Optional[str] = None,
            expansion_state: ExpansionState = ExpansionState.DEFAULT
    ) -> None:
        super(DagLayout, self).__init__(name, expansion_state)
        self._nodes: List['DagLayoutNode'] = []
        self._edges: List['DagLayoutEdge'] = []
        self._containers: List['DagLayoutContainer'] = []
        self._alignments: List[List[Union['DagLayoutNode', 'DagLayoutContainer']]] = []

    def compile_full(self) -> Tuple['DagLayoutModel', Iterable[_Viz]]:
        return (
            DagLayoutModel(self._nodes, self._containers, self._edges, self._alignments),
            [node.viz for node in self._nodes],
        )

    def compile_compact(self) -> Tuple['DagLayoutModel', Iterable[_Viz]]:
        # TODO: come up with a compact representation
        return (
            DagLayoutModel(self._nodes, self._containers, self._edges, self._alignments),
            [node.viz for node in self._nodes],
        )

    def create_node(self, o: Any) -> 'DagLayoutNode':
        node = DagLayoutNode(str(len(self._nodes) + len(self._containers)), get_viz(o))
        self._nodes.append(node)
        return node

    def create_container(
            self,
            flow_direction: Optional[str] = None,
            is_expanded: Optional[bool] = None,
            is_interactive: Optional[bool] = None,
            is_visible: Optional[bool] = None,
            is_topological: Optional[bool] = None
    ) -> 'DagLayoutContainer':
        container = DagLayoutContainer(
            str(len(self._nodes) + len(self._containers)), flow_direction, is_expanded,
            is_interactive, is_visible, is_topological
        )
        self._containers.append(container)
        return container

    def create_edge(
            self, start: Union['DagLayoutNode', 'DagLayoutContainer'],
            end: Union['DagLayoutNode', 'DagLayoutContainer']
    ) -> 'DagLayoutEdge':
        edge = DagLayoutEdge(str(len(self._edges)), start, end)
        self._edges.append(edge)
        return edge

    def align_elements(self, elements: List[Union['DagLayoutNode', 'DagLayoutContainer']]) -> None:
        self._alignments.append(elements)

    def __str__(self) -> str:
        return 'graph'


class DagLayoutNode:

    def __init__(self, node_id: str, viz: '_Viz') -> None:
        self.node_id = node_id
        self.viz = viz
        self.container: Optional['DagLayoutContainer'] = None

    def get_id(self) -> str:
        return self.node_id

    def to_dict(self) -> Mapping[str, Any]:
        return {
            'vizId': self.viz,
        }

    def get_container(self) -> 'DagLayoutContainer':
        return self.container


class DagLayoutEdge:

    def __init__(
            self, edge_id: str, start: Union['DagLayoutNode', 'DagLayoutContainer'],
            end: Union['DagLayoutNode', 'DagLayoutContainer'], start_side: Optional[str] = None, end_side: Optional[
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


class DagLayoutContainer:

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
        self.elements: List[Union['DagLayoutNode', 'DagLayoutContainer']] = []
        self.container: Optional['DagLayoutContainer'] = None

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
    def add_child(self, child: Union['DagLayoutNode', 'DagLayoutContainer']) -> None:
        assert child.container is None
        child.container = self
        self.elements.append(child)

    def remove_child(self, child: Union['DagLayoutNode', 'DagLayoutContainer']) -> None:
        assert child in self.elements
        assert child.container == self
        child.container = None
        self.elements.remove(child)

    def is_ancestor(self, descendant: Union['DagLayoutNode', 'DagLayoutContainer']) -> bool:
        if len(self.elements) == 0:
            return False
        if descendant in self.elements:
            return True
        return any([isinstance(child, DagLayoutContainer) and child.is_ancestor(descendant) for child in self.elements])

    def get_container(self) -> Optional['DagLayoutContainer']:
        return self.container


# ======================================================================================================================
# VizModels.
# ----------
# The serializable models, each a subclass of VizModel, which describe the different Viz types.
# ======================================================================================================================


class TokenPrimitiveModel(VizModel):

    def __init__(self, text: str) -> None:
        super(TokenPrimitiveModel, self).__init__('TokenPrimitive', {
            'text': text,
        })


class SequenceLayoutModel(VizModel):

    def __init__(self, elements: List['_Viz'], orientation: str) -> None:
        super(SequenceLayoutModel,
              self).__init__('SequenceLayout', {
                  'elements': elements,
                  'orientation': orientation,
              })


class KeyValueLayoutModel(VizModel):

    def __init__(self, elements: Dict['_Viz', '_Viz']) -> None:
        super(KeyValueLayoutModel, self).__init__('KeyValueLayout', {
            'elements': elements,
        })


class DagLayoutModel(VizModel):

    def __init__(
            self, nodes: List['DagLayoutNode'], containers: List['DagLayoutContainer'],
            edges: List['DagLayoutEdge'],
            alignments: List[List[Union['DagLayoutNode', 'DagLayoutContainer']]]
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
