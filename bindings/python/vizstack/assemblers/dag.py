from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Union, cast
from typing_extensions import Literal, TypedDict
from vizstack.schema import JsonType, View, Fragment
from collections import defaultdict


FlowDirection = Literal['north', 'south', 'east', 'west', None]
Side = Literal['north', 'south', 'east', 'west', None]

Port = TypedDict('Port', {
    'side': Side,
    'order': Optional[int],
}, total=False)

NodeAlignment = TypedDict('NodeAlignment', {
    'axis': Literal['x', 'y'],
    'justify': Literal['north', 'south', 'east', 'west', 'center', None],
    'nodes': List[str],
}, total=False)

Node = TypedDict('Node', {
    'flowDirection': FlowDirection,
    'isExpanded': Optional[bool],
    'alignChildren': Optional[bool],
    'isInteractive': Optional[bool],
    'isVisible': Optional[bool],
    'parent': Optional[str],
    'children': Optional[List[str]],
    'ports': Dict[str, Port],
}, total=False)

Endpoint = TypedDict('Endpoint', {
    'id': str,
    'port': Optional[str],
    'label': Optional[str],
    'isPersistent': Optional[bool],
}, total=False)

Edge = TypedDict('Edge', {
    'source': Endpoint,
    'target': Endpoint,
    'label': Optional[str],
}, total=False)


class Dag(FragmentAssembler):
    # When calling `DagLayout.node()`, the user can specify an optional `item` argument, which populates that node with
    # that item. We need a sentinel value to indicate that the user has not specified an `item` argument; we cannot use
    # `None`, since that is a possible item. Instead, we instantiate an object to be the default value of `item`.
    _DEFAULT_ITEM = object()
    # `DagLayout.node()` also takes a `parent` argument. Recall that `node()` can be called any number of times,
    # and will update only those parameters specified in each call. We need to distinguish between `parent=None`,
    # which indicates that the node should have no parent, and `parent=_DEFAULT_PARENT`, indicating that the user did
    # not specify a parent in this call to `node()`.
    _DEFAULT_PARENT = object()

    def __init__(self,
                 flow_direction: FlowDirection = None,
                 align_children: Optional[bool] = None) -> None:
        """

        Args:
            flow_direction: The direction of the top-level flow; one of ('north' | 'south' | 'east' | 'west').
            align_children: Whether the top-level nodes should be aligned on the flow axis.
        """
        super(Dag, self).__init__()
        self._flow_direction = flow_direction
        self._align_children = align_children
        self._nodes: Dict[str, Node] = defaultdict(lambda: {})
        self._items: Dict[str, Any] = dict()
        self._edges: List[Edge] = []
        self._alignments: List[NodeAlignment] = []

    def node(self, node_id: str,
             flow_direction: FlowDirection = None, align_children: Optional[bool] = None,
             is_expanded: Optional[bool] = None, is_interactive: Optional[bool] = None,
             is_visible: Optional[bool] = None, parent=_DEFAULT_PARENT,
             align_with: Optional[Union[NodeAlignment, List[NodeAlignment]]] = None,
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
                self._nodes[node_id][key] = var  # type: ignore
        if parent is not Dag._DEFAULT_PARENT:
            self._nodes[node_id]['parent'] = parent
        elif 'parent' not in self._nodes[node_id]:
            self._nodes[node_id]['parent'] = None

        self._nodes[node_id]['children'] = []
        if align_with is not None:
            if not isinstance(align_with, list):
                align_with = [align_with]
            for alignment in align_with:
                self._alignments.append({
                    **alignment,
                    'nodes': [node_id] + alignment.nodes,
                })
        if item is not Dag._DEFAULT_ITEM:
            self.item(item, node_id)
        if ports is not None:
            for port in ports:
                self.port(*port)
        return self

    def port(self, node_id: str, port_name: str, side: Side = None, order: Optional[int] = None):
        if 'ports' not in self._nodes[node_id]:
            self._nodes[node_id]['ports'] = {}
        self._nodes[node_id]['ports'][port_name] = {}
        if side is not None:
            self._nodes[node_id]['ports'][port_name]['side'] = side
        if order is not None:
            self._nodes[node_id]['ports'][port_name]['order'] = order
        return self

    def edge(self,
        source: Union[str, Endpoint],
        target: Union[str, Endpoint],
        label: Optional[str] = None,
    ):
        edge: Edge = {
            'source': { 'id': source } if isinstance(source, str) else source,
            'target': { 'id': target } if isinstance(target, str) else target,
        }
        if label is not Node:
            edge['label'] = label
        self._edges.append(edge)
        return self

    def item(self, item: Any, node_id: str):
        self._items[node_id] = item
        return self

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        for node_id in self._nodes:
            # All nodes must have an item
            assert node_id in self._items, 'No item was provided for node "{}".'.format(node_id)
            # All node parents must exist
            assert self._nodes[node_id]['parent'] is None or self._nodes[node_id][
                'parent'] in self._nodes, 'Parent node "{}" not found for child "{}".'.format(
                self._nodes[node_id]['parent'], node_id)
        for edge in self._edges:
            sourceId = edge['source']['id'] 
            targetId = edge['target']['id']
            # All edges must connect real nodes
            assert sourceId in self._nodes, 'An edge starts at non-existent node "{}".'.format(sourceId)
            assert targetId in self._nodes, 'An edge ends at non-existent node "{}".'.format(targetId)
            # All edge ports must exist
            if 'port' in edge['source']:
                sourcePort = edge['source']['port']
                assert sourcePort in self._nodes[sourceId][
                    'ports'], 'An edge starts at non-existent port "{}" on node "{}".'.format(sourcePort, sourceId)
            if 'port' in edge['target']:
                targetPort = edge['target']['port']
                assert targetPort in self._nodes[targetId][
                    'ports'], 'An edge ends at non-existent port "{}" on node "{}".'.format(targetPort, targetId)
        return {
            'type': 'DagLayout',
            'contents': {
                'nodes':
                    {node_id: {
                    **{key: value for key, value in node.items() if value is not None and key is not 'parent'},
                    'fragmentId': get_id(self._items[node_id], 'n{}'.format(node_id)),
                    'children': [_node_id for _node_id in self._nodes if self._nodes[_node_id]['parent'] == node_id]}
                     for node_id, node in self._nodes.items()},
                'edges':
                    {'e{}'.format(i): edge
                     for i, edge in enumerate(self._edges)},
                'alignments': self._alignments,
                'flowDirection':
                    self._flow_direction,
                'alignChildren':
                    self._align_children,
            },
            'meta': self._meta,
        }, [self._items[node_id] for node_id in self._nodes]
