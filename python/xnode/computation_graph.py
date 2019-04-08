"""
Allows users to track their computation graph for visualization. Data is "tracked" by wrapping it in a `GraphData`
object, which acts as a passthrough wrapper that records the op that created the data and the values of the data that
should be visualized. Function calls are "tracked" by `_FunctionCall` objects, which record the function that was called
and the arguments it was given. Finally, containers are "tracked" with `GraphContainer` objects, which record their
contents.

See get_viz.md for underlying principles and concepts.
"""
import wrapt
import inspect
from collections import deque, defaultdict
from contextlib import contextmanager
from xnode.viz import VIZ_FN, DagLayout, Token, Viz, DagLayoutNode
from typing import Callable, List, Tuple, Any, Optional, Union, Set, Iterable, Dict
# TODO: state outputs need a special placement
# TODO: figure out where data nodes should go
# TODO: re-document
# TODO: naming (op is a bad name that we don't use anymore)


# ======================================================================================================================
# `_FunctionCall`.
# -----------
# ======================================================================================================================


class _FunctionCall:
    """A record of a single function execution."""

    def __init__(
            self, fn_name: str, args: List[Tuple[str, Union[List['GraphData'], 'GraphData']]],
            kwargs: List[Tuple[str, Union[List['GraphData'], 'GraphData']]]
    ):
        """Constructor.

        Args:
            fn_name: The name of the function, as should be shown in visualizations.
            args: A sequence of positional arguments that were passed to the function at execution. Each element of
                the sequence is a two-tuple, where the first element is the string name of the argument and the
                second is either the `GraphData` object associated with the input or a sequence of `GraphData`
                objects if the input was a sequence.
            kwargs (dict): A dictionary of keyword arguments passed to the function at execution.
        """
        super(_FunctionCall, self).__init__()
        self.container: Optional[_FunctionCall] = None
        self.contents: Optional[List[_FunctionCall]] = None
        self.outputs: List[GraphData] = []
        self.state_inputs: List[Tuple[str, Union[List['GraphData'], 'GraphData']]] = []

        self.fn_name: str = fn_name
        self.args: List[Tuple[str, Union[List['GraphData'], 'GraphData']]] = args
        self.kwargs: List[Tuple[str, Union[List['GraphData'], 'GraphData']]] = kwargs

    @staticmethod
    def _create_input_list(input_tuples: List[Tuple[str, Union[List['GraphData'], 'GraphData']]]
                          ) -> List['GraphData']:
        tracked_args: List[GraphData] = []
        tracked_args.extend(
            [arg[1] for arg in input_tuples if len(arg) > 1 and not isinstance(arg[1], list)]
        )
        for input_tuple in input_tuples:
            if len(input_tuple) > 1 and isinstance(input_tuple[1], list):
                tracked_args.extend(
                    [arg_item for arg_item in input_tuple[1] if arg_item is not None]
                )
        return tracked_args

    def set_contents(self) -> None:
        """Creates an abstractive container enveloping all ops between the container's proposed outputs and inputs.

        Builds the DAG backwards from the outputs in a breadth-first search, stopping beams at any encountered
        `GraphData` which is in the set of inputs. Whenever a new `_FunctionCall` is found during search,
        its outermost parent
        is added to the new container (see the definition of "outermost parent" in `Nestable.get_outermost_parent()`.
        After
        search terminates, all of the new container's contents have their `container` field updated to point to the new
        container.

        Args:
            outputs (list): `GraphData` objects which serve as the outputs of the new abstractive container.
            inputs (set): `GraphData` objects which serve as the inputs of the new abstractive container.
        """
        contents: List[_FunctionCall] = list()
        ops_checked: Set[_FunctionCall] = {self}
        inputs: Set[GraphData] = set(self.get_args())
        # print(inputs)
        data_to_check: deque[GraphData] = deque(self.outputs)
        # print(self.fn_name)
        while len(data_to_check) > 0:
            data: GraphData = data_to_check.popleft()
            # print(data.obj)
            # print(data)
            if data in inputs:
                continue
            creator_op: _FunctionCall = data.creator_op
            # print('created by {}'.format(creator_op.fn_name if creator_op is not None else None))
            if creator_op is not None and creator_op not in ops_checked:
                outermost_parent: _FunctionCall = creator_op.get_outermost_parent()
                contents.append(outermost_parent)
                data_to_check.extend(creator_op.get_all_inputs())
                ops_checked.add(creator_op)
        # Update newly contained objects after iterating through the graph to prevent the new container from containing
        # itself (consider ops op1, op2, which share container c1. We are adding a new container c2. If we update the
        # container of op1 during iteration, then c1's container becomes c2. When we check op2, its outermost container
        # is now c2, meaning c2's container would become c2).
        for item in contents:
            item.container = self
        self.contents = contents

    def get_args(self) -> List['GraphData']:
        return self._create_input_list(self.args + self.kwargs)

    def get_state_inputs(self) -> List['GraphData']:
        return self._create_input_list(self.state_inputs)

    def get_all_inputs(self) -> List['GraphData']:
        """Return a list of all recorded positional and keyword arguments that are wrapped in `GraphData`.

        This is used to build the DAG, collecting all `GraphData` inputs so that their ancestors can be iterated over
        and added to the graph.

        Returns:
            (list): All positional and keyword argument values that are tracked in `GraphData`.
        """
        return self.get_args() + self.get_state_inputs()

    def get_outermost_parent(self) -> '_FunctionCall':
        """Returns the first `Nestable` with no container, found by iterating through this `Nestable`'s container
        hierarchy.

        The "outermost parent" of a `Nestable` n is the first `Nestable` with no container found in the hierarchy of
        n. This could be n itself, if n has no container.

        Returns:
            (Nestable): This instance's outermost parent.
        """
        return self if self.container is None else self.container.get_outermost_parent()

    def __view__(self) -> Viz:
        return Token(self.fn_name)


# ======================================================================================================================
# Graph data.
# -----------
# ======================================================================================================================


class GraphData:
    """A record of a tracked function input or output."""

    def __init__(self, obj, creator_op=None, creator_pos=-1):
        """Constructor. Stores the properties of the tracked object which should be visualized in the graph.

        `GraphData` is a "dumb" container, simply recording internally an object which was input or output to a
        `GraphOp` or tracked via `_track_data()`. `obj` should be immutable; if it changes, then the graph will be
        rendered incorrectly.

        Args:
            obj (object): The immutable object wrapped by the `GraphData`.
            creator_op (_FunctionCall): The `GraphOp` which created the wrapped object.
            creator_pos (int): The position of the object in the `creator_op`'s output tuple.
        """
        self.obj = obj
        self.creator_op = creator_op
        self.creator_pos = creator_pos

    def __view__(self):
        layout: DagLayout = DagLayout()
        graphdata_to_node = {self: layout.create_node(self.obj)}
        if self.creator_op is None:
            return layout

        op_to_node: Dict[_FunctionCall, DagLayoutNode] = {
            self.creator_op: layout.create_node(self.creator_op)
        }
        from_data_edges: Dict[GraphData, List[Tuple[_FunctionCall, str]]] = defaultdict(list)
        to_data_edges: Dict[GraphData, List[Tuple[_FunctionCall, str]]] = defaultdict(list)
        op_to_secret_container_node: Dict[_FunctionCall, DagLayoutNode] = dict()
        layout.create_edge(op_to_node[self.creator_op], graphdata_to_node[self])
        ops_to_add: List[_FunctionCall] = [self.creator_op]
        while len(ops_to_add) > 0:
            # Iterate over ops, assuming node has already been created
            op = ops_to_add.pop()

            # add to secret container
            op_to_secret_container_node[op] = layout.create_node(
                None, flow_direction='east', is_visible=False
            )
            op_to_secret_container_node[op].add_child(op_to_node[op])

            # create container
            if op.container is not None:
                if op.container not in op_to_node:
                    op_to_node[op.container] = layout.create_node(op.container)
                    op_to_node[op.container].add_child(op_to_secret_container_node[op])
                    ops_to_add.append(op.container)
                else:
                    op_to_node[op.container].add_child(op_to_secret_container_node[op])

            container_node = op_to_secret_container_node[op].get_container()

            # create output nodes and add edges to them
            for i, output_graphdata in enumerate(op.outputs):
                port_name: str = '{}_out'.format(i)
                op_to_node[op].create_port(port_name, 'south')
                if output_graphdata not in graphdata_to_node:
                    graphdata_to_node[output_graphdata] = layout.create_node(output_graphdata.obj)
                    if container_node is not None:
                        container_node.add_child(
                            graphdata_to_node[output_graphdata]
                        )
                # layout.create_edge(op_node, graphdata_to_node[output_graphdata])
                to_data_edges[output_graphdata].append((op, port_name))

            # TODO: when input slicing is re-added, fix this
            for i in range(len(op.args) + len(op.kwargs)):
                op_to_node[op].create_port('{}_in'.format(i), 'north')

            # create arg input nodes and edges to them
            for input_graphdata in op.get_args():
                if input_graphdata not in graphdata_to_node:
                    graphdata_to_node[input_graphdata] = layout.create_node(input_graphdata.obj)
                    if container_node is not None:
                        container_node.add_child(
                            graphdata_to_node[input_graphdata]
                        )
                    if input_graphdata.creator_op is not None and input_graphdata.creator_op not in op_to_node:
                        op_to_node[input_graphdata.creator_op] = layout.create_node(input_graphdata.creator_op)
                        ops_to_add.append(input_graphdata.creator_op)
                # layout.create_edge(graphdata_to_node[input_graphdata], op_node)
                from_data_edges[input_graphdata].append((op, '{}_in'.format(input_graphdata.creator_pos)))

            # add state inputs
            # for input_graphdata in op.get_state_inputs():
                # for now, always create a new node and put it in a new container with the op
                # if (
                #         input_graphdata in graphdata_to_node and
                #         op_to_secret_container_node[op].is_ancestor(graphdata_to_node[input_graphdata].get_container())
                # ):
                #     graphdata_to_node[input_graphdata].get_container().remove_child(graphdata_to_node[input_graphdata])
                #     op_to_secret_container_node[op].add_child(graphdata_to_node[input_graphdata])
                # else:
                #     graphdata_to_node[input_graphdata] = layout.create_node(input_graphdata.obj)
                #     # layout.create_edge(graphdata_node, op_node)
                #     from_data_edges.append((input_graphdata, op))
                #     op_to_secret_container_node[op].add_child(graphdata_to_node[input_graphdata])
                # n = layout.create_node(input_graphdata.obj)
                # layout.create_edge(n, op_to_node[op])
                # op_to_secret_container_node[op].add_child(n)

        # promote data nodes up to a minimum acceptable height
        all_graphdata = set(to_data_edges.keys()).union(from_data_edges.keys())
        for graphdata in all_graphdata:
            c = graphdata_to_node[graphdata].get_container()
            if c is not None and c.is_visible is False:
                continue
            ops: List[_FunctionCall] = [t[0] for t in to_data_edges[graphdata] + from_data_edges[graphdata]]
            for op in ops:
                while c is not None and not (c.is_ancestor(op_to_node[op]) and c.is_visible is not False):
                    c.remove_child(graphdata_to_node[graphdata])
                    c = c.get_container()
                    if c is not None:
                        c.add_child(graphdata_to_node[graphdata])

        # for (graphdata, op) in from_data_edges:
        #     c = graphdata_to_node[graphdata].get_container()
        #     if c is not None and c.is_visible is False:
        #         continue
        #     while c is not None and not (c.is_ancestor(op_to_node[op]) and c.is_visible is not False):
        #         c.remove_child(graphdata_to_node[graphdata])
        #         c = c.get_container()
        #         if c is not None:
        #             c.add_child(graphdata_to_node[graphdata])

        for graphdata, edges in from_data_edges.items():
            segments = get_edge_routes(graphdata_to_node[graphdata], edges, op_to_node)
            for start_node, start_port, end_node, end_port in segments:
                layout.create_edge(start_node, end_node, start_port, end_port)

        for graphdata, edges in to_data_edges.items():
            segments = get_edge_routes(graphdata_to_node[graphdata], edges, op_to_node)
            for end_node, end_port, start_node, start_port in segments:
                layout.create_edge(start_node, end_node, start_port, end_port)
        # kept_edges = []
        # for i, (op1, graphdata1) in enumerate(to_data_edges):
        #     found_child = False
        #     for (op2, graphdata2) in to_data_edges:
        #         if graphdata1 is graphdata2 and op1 is not op2 and op_to_node[op1].is_ancestor(op_to_node[op2]):
        #             found_child = True
        #             break
        #     if not found_child:
        #         kept_edges.append((op_to_node[op1], graphdata_to_node[graphdata1]))
        # for i, (graphdata1, op1) in enumerate(from_data_edges):
        #     found_child = False
        #     for (graphdata2, op2) in from_data_edges:
        #         if graphdata1 is graphdata2 and op1 is not op2 and op_to_node[op1].is_ancestor(op_to_node[op2]):
        #             found_child = True
        #             break
        #     if not found_child:
        #         kept_edges.append((graphdata_to_node[graphdata1], op_to_node[op1]))
        # for start, end in kept_edges:
        #     layout.create_edge(start, end)
        return layout


def get_edge_routes(data_node: DagLayoutNode,
                    ops: List[Tuple[_FunctionCall, str]],
                    op_to_node: Dict[_FunctionCall, DagLayoutNode]
                    ) -> List[Tuple[DagLayoutNode, str, DagLayoutNode, str]]:
    segments: List[Tuple[DagLayoutNode, str, DagLayoutNode, str]] = []
    for op, port_name in ops:
        node = op_to_node[op]
        parent: Optional[Tuple[DagLayoutNode, str]] = None
        for other_op, other_port_name in ops:
            other_node = op_to_node[other_op]
            if other_node is node:
                continue
            if other_node.is_ancestor(node) and (parent is None or parent[0].is_ancestor(other_node)):
                parent = (other_node, other_port_name)
        segments.append((parent[0], parent[1], node, port_name)
                        if parent is not None else (data_node, None, node, port_name))
    return segments


def _gen_magic_method(obj_class, fn_name):
    """Returns a magic method that, when called, executes `obj_class.fn_name()` and tracks the call.

    Args:
        obj_class (class): Class whose magic method should be executed when the generated function is called.
        fn_name (str): The name of the magic method that should be executed when the generated function is called.

    Returns:
        (fn): A function which, when executed, calls a magic method and tracks the call.
    """
    magic_method = getattr(obj_class, fn_name)

    def wrapped_magic_method(self, x):
        return _TrackedFunction(magic_method)(self, x)

    return wrapped_magic_method


# List of all arithmetic magic methods from https://rszalski.github.io/magicmethods/#appendix2
_MAGIC_METHODS = [
    '__add__', '__sub__', '__mul__', '__div__', '__floordiv__', '__truediv__', '__mod__',
    '__divmod__', '__pow__', '__lshift__', '__rshift__', '__and__', '__or__', '__xor__'
]
_MAGIC_METHODS += ['__r' + fn_name.lstrip('__') for fn_name in _MAGIC_METHODS]

# TODO: in-place assignment magic methods?


def _track_magic_methods(obj_class):
    """Produces all of the magic methods that should be added to the class of a tracked data structure.

    When a data structure is tracked and added to the computation graph, we would like to track any elementary
    arithmetic operations performed on it as well. These operations do not exist as functions that can be easily
    tracked; instead, they exist as "magic methods" of the object's class (`_add__`, `__mul__`, etc). Those methods
    must be overwritten and replaced with versions that can be tracked; this function produces a mapping of magic
    method names to tracked versions, that can be used with the `type()` function to replace the original methods.

    Args:
        obj_class (class): The original class of the object whose magic methods should be overwritten.

    Returns:
        (dict): A mapping of magic method name to tracked magic method function.
    """
    methods = {}
    for fn_name in _MAGIC_METHODS:
        try:
            methods[fn_name] = _gen_magic_method(obj_class, fn_name)
        except AttributeError:
            pass
    return methods


def _track_data(obj, creator_op=None, creator_pos=-1, force=False) -> Any:
    """Creates a `GraphData` object which records the properties of `obj` and allows it to be shown in the graph.

    Any object which is not the output of a tracked function (see `_TrackedFunction`) is not, by default, shown in the
    computation graph. Leaf data nodes can be added to the graph via `_track_data()`.

    `_track_data()` adds a new field `xnode_graphdata` to `obj`, which maps to new the `GraphData` object. The class
    of `obj` is also changed so that its arithmetic magic methods are tracked in the graph.

    Args:
        obj (object): Python object to add to the graph.
        creator_op (_FunctionCall or None): The `GraphOp` object recording the function call which outputted `obj`. If
            `obj` is a leaf, `creator_op = None`.

    Returns:
        (object): `obj`, with an additional field `xnode_graphdata` and its class changed to modify its magic methods.
    """
    try:
        has_graphdata = hasattr(obj, 'xnode_graphdata')
    except Exception:
        # PyTorch variables throw a NotImplementedError if you do a `getattr` on a non-existent attribute,
        # which breaks hasattr.
        # Other classes, like Namespace, throw an exception if you `getattr` on any attribute.
        has_graphdata = False

    if not has_graphdata or force:
        graphdata = GraphData(obj, creator_op, creator_pos)
        if not obj.__class__.__name__.startswith('__XNODE_GENERATED__'):
            new_class_dict = _track_magic_methods(obj.__class__)
            # new_class_dict[VIZ_FN] = getattr(graphdata, VIZ_FN)
            try:
                obj.__class__ = type(
                    '__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                    new_class_dict
                )
            except TypeError:
                # The object might be an int or other primitive, which cannot be directly assigned with `type()`.
                class WrapperClass(type(obj)):
                    pass

                obj = WrapperClass(obj)
                obj.__class__ = type(
                    '__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                    new_class_dict
                )
        obj.xnode_graphdata = graphdata
    return obj


# ======================================================================================================================
# Creating a tracked callable.
# ----------------------------
# When a callable is tracked, it needs to be modified so the graph can be extended when it is called. For
# non-function callables, we override `__call__()`, `__getattribute__()`, and `__setattr__()`. When it is called,
# a new `_FunctionCall` object is created to record information about its arguments and the context in which it was
# called. If an attribute of the callable is read during the call, the `_FunctionCall` is updated to indicate that
# that attribute was used. If an attribute of the callable is updated during the call, the `_FunctionCall` is updated
# to indicate that that attribute was modified during the call.
#
# Actual functions cannot be overridden, so we instead wrap them in a `_TrackedFunction` object. This object behaves
# like a regular function, but performs the same `__call__()` behavior as a tracked callable. No override of
# `__getattribute__()` and `__setattr__()` are necessary, since functions cannot have attributes.
# ======================================================================================================================


def _gen_tracked_getattr(fn: Callable):
    g = fn.__getattribute__

    def _tracked_getattr(self, name):
        ret = g(self, name)
        # Have to use __getattribute__ here, not .xnode_current_op, to avoid calling this function infinitely
        if object.__getattribute__(self, 'xnode_current_op') is not None:
            op = object.__getattribute__(self, 'xnode_current_op')
            # if hasattr(ret, 'xnode_graphdata'):
            #     del ret.xnode_graphdata
            ret = _track_data(ret)
            op.state_inputs.append(('self.{}'.format(name), ret.xnode_graphdata))
        return ret

    return _tracked_getattr


def _gen_tracked_setattr(fn: Callable):
    s = fn.__setattr__

    # if inspect.getfullargspec(s).args[0] == 'self':
    #     needs_self = True
    # else:
    #     needs_self = False

    def _tracked_setattr(self, name, value):
        # Have to use __getattribute__ here, not .xnode_current_op, to avoid calling the tracked getattr
        try:
            if name is not 'xnode_current_op' and object.__getattribute__(
                    self, 'xnode_current_op') is not None:
                op = object.__getattribute__(self, 'xnode_current_op')
                value = _track_data(value)
        except AttributeError:
            pass
        s(self, name, value)

    return _tracked_setattr


def _gen_tracked_call(fn: Callable):
    c = fn.__call__
    # TODO: this is custom tailored for PyTorch, and we should generalize it
    try:
        if hasattr(fn, 'forward'):
            # `getfullargspec` will work on PyTorch modules, but won't get arg names. Need to get from `forward`
            # directly.
            fn_spec = inspect.getfullargspec(fn.forward)
        else:
            fn_spec = inspect.getfullargspec(fn)
        _arg_names = fn_spec.args
        _varargs = fn_spec.varargs
    except TypeError:
        _arg_names = []
        _varargs: str = 'args'

    # Pytorch modules don't have a `__name__` field
    try:
        _op_name = fn.__name__
    except AttributeError:
        _op_name = fn.__class__.__name__

    if _arg_names[0] == 'self':
        needs_self = True
    else:
        needs_self = False

    def _tracked_call(self, *args, **kwargs):
        arg_names: List[str] = (
            _arg_names[(len(_arg_names) - len(args)):] +
            [_varargs for _ in range(len(args) - len(_arg_names))]
        )
        tracked_args = []
        for arg in args:
            # TODO: re-add iterable breaking
            # if isinstance(arg, tuple):
            #     tracked_args.append((_track_data(obj) for obj in arg))
            # elif isinstance(arg, list):
            #     tracked_args.append([_track_data(obj) for obj in arg])
            # elif isinstance(arg, set):
            #     tracked_args.append({_track_data(obj) for obj in arg})
            # else:
            tracked_args.append(_track_data(arg))

        kwarg_keys = list(kwargs.keys())
        tracked_kwargs = []
        for key in kwarg_keys:
            arg = kwargs[key]
            # if isinstance(arg, tuple):
            #     tracked_args.append((_track_data(obj) for obj in arg))
            # elif isinstance(arg, list):
            #     tracked_args.append([_track_data(obj) for obj in arg])
            # elif isinstance(arg, set):
            #     tracked_args.append({_track_data(obj) for obj in arg})
            # else:
            tracked_kwargs.append(_track_data(arg))
        op = _FunctionCall(
            _op_name,
            list(zip(arg_names, [arg.xnode_graphdata for arg in tracked_args])),
            list(zip(kwarg_keys, [arg.xnode_graphdata for arg in tracked_kwargs]))
        )
        tracked_kwargs = {
            key: value for key, value in zip(kwarg_keys, tracked_kwargs)
        }
        # This catches cases like tracked addition operators, which cannot have children anyway
        try:
            self.xnode_current_op = op
            ret = c(*tracked_args, **tracked_kwargs) if not needs_self else c(self, *tracked_args, **tracked_kwargs)
            self.xnode_current_op = None
        except AttributeError:
            ret = c(*tracked_args, **tracked_kwargs)
        multiple_returns = isinstance(ret, tuple) and len(ret) > 1
        # TODO handle passthrough returns
        input_graphdata = set(op.get_args())
        if multiple_returns:
            ret_tracked = tuple(
                [_track_data(r, creator_op=op, creator_pos=i,
                             force=hasattr(r, 'xnode_graphdata') and r.xnode_graphdata in input_graphdata)
                 for i, r in enumerate(ret)]
            )
        else:
            ret_tracked = _track_data(ret, creator_op=op, creator_pos=0, force=hasattr(ret, 'xnode_graphdata') and
                                                                               ret.xnode_graphdata in input_graphdata)
        output_graphdata = [x.xnode_graphdata for x in ret_tracked] if isinstance(ret_tracked, tuple) else [
            ret_tracked.xnode_graphdata]
        op.outputs = output_graphdata
        op.set_contents()
        return ret_tracked

    return _tracked_call


class _TrackedFunction(wrapt.ObjectProxy):
    """Wraps a callable, creating a `_FunctionCall` whenever called and creating a `GraphData` for each output."""

    def __init__(self, obj: Callable) -> None:
        """Constructor.

        Args:
            obj (callable): A callable object, such as a function, whose executions should be recorded in the
                computation graph.
        """
        super(_TrackedFunction, self).__init__(obj)
        # wrapt requires all wrapper properties to start with _self_
        self._self_tracked_call = _gen_tracked_call(obj)

    def __call__(self, *args, **kwargs):
        """Executes the wrapped function and creates a `_FunctionCall` recording the execution.

        A single `_FunctionCall` is created to record the function's execution. The wrapped function should not in its
        internals create any additional `_FunctionCall` objects; functions which create more `_FunctionCall` objects should be
        wrapped with `AbstractContainerGenerator` instead.

        Args:
            args: A sequence of positional arguments to pass to the wrapped function.
            kwargs (dict): Keyword arguments to pass to the wrapped function.

        Returns:
            The outputs of the wrapped function, each wrapped in a `GraphData` instance.
        """
        return self._self_tracked_call(self.__wrapped__, *args, **kwargs)


# ======================================================================================================================
# Public API.
# -----------
# Users create a computation graph by tracking callable objects (functions, Pytorch modules, etc.). Whenever those
# objects are called, the graph is extended by a new `_FunctionCall` node and any new `GraphData` nodes for its inputs
# and outputs.
# ======================================================================================================================


def track_callable_class(cls):
    new_class_dict = {
        '__call__': _gen_tracked_call(cls),
        # '__getattribute__': _gen_tracked_getattr(cls),
        # '__setattr__': _gen_tracked_setattr(cls),
    }
    return type(cls.__name__, (cls,), new_class_dict)


def track_callable_instance(fn: Callable) -> Callable:
    new_class_dict = {
        '__call__': _gen_tracked_call(fn),
        # '__getattribute__': _gen_tracked_getattr(fn),
        # '__setattr__': _gen_tracked_setattr(fn),
    }
    try:
        fn.__class__ = type(fn.__class__.__name__, (fn.__class__,), new_class_dict)
    except TypeError:
        # The object is a function or lambda, which cannot be subclassed
        fn = _TrackedFunction(fn)
    return fn


def get_graph(o: Any) -> GraphData:
    return o.xnode_graphdata
