from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Union
from typing_extensions import Literal, TypedDict
from vizstack.schema import JsonType, View, Fragment
from collections import defaultdict


FlowDirection = Literal['north', 'south', 'east', 'west', None]
Side = Literal['north', 'south', 'east', 'west']

Port = TypedDict('Port', {
    'side': Side,
    'order': Optional[int],
})

Node = TypedDict('Node', {
    'flowDirection': FlowDirection,
    'isExpanded': Optional[bool],
    'alignChildren': Optional[bool],
    'isInteractive': Optional[bool],
    'isVisible': Optional[bool],
    'parent': Optional[str],
    'ports': Dict[str, Port],
})

Edge = TypedDict('Edge', {
    'startId': str,
    'endId': str,
    'startPort': Optional[str],
    'endPort': Optional[str],
})


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
        self._nodes: Dict[str, Node] = defaultdict(dict)
        self._items: Dict[str, Any] = dict()
        self._edges: List[Edge] = []
        self._alignments: List[List[str]] = []

    def node(self, node_id: str,
             flow_direction: FlowDirection = None, align_children: Optional[bool] = None,
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
        if parent is not Dag._DEFAULT_PARENT:
            self._nodes[node_id]['parent'] = parent
        elif 'parent' not in self._nodes[node_id]:
            self._nodes[node_id]['parent'] = None

        self._nodes[node_id]['children'] = []
        if align_with is not None:
            self._alignments.append([node_id] + align_with)
        if item is not Dag._DEFAULT_ITEM:
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
            'contents': FragmentAssembler._filter_none({
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
            }, ['flowDirection', 'alignChildren']),
            'meta': self._meta,
        }, [self._items[node_id] for node_id in self._nodes]
