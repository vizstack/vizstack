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
from collections import deque
from xnode.viz import VIZ_FN, DagLayout, TokenPrimitive, Viz, _DagLayoutNode
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
        inputs: Set[GraphData] = set(self.get_all_inputs())
        data_to_check: deque[GraphData] = deque(self.outputs)
        while len(data_to_check) > 0:
            data: GraphData = data_to_check.popleft()
            if data in inputs:
                continue
            creator_op: _FunctionCall = data.creator_op
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

    def xn(self) -> Viz:
        return TokenPrimitive(self.fn_name)


def _make_tracked_arg_list(args: Iterable[Any], arg_names: List[str]
                          ) -> List[Tuple[str, Union[List['GraphData'], 'GraphData']]]:
    # len(args) == len(arg_names)
    arg_list: List[Tuple[str, Union[List['GraphData'], 'GraphData']]] = []
    for arg_name, arg in zip(arg_names, args):
        if hasattr(arg, '__iter__'):
            arg_list.append((arg_name, [_track_data(obj).xnode_graphdata for obj in arg]))
        else:
            arg_list.append((arg_name, _track_data(arg).xnode_graphdata))
    return arg_list


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

    def xn(self):
        layout: DagLayout = DagLayout()
        graphdata_to_node = {self: layout.create_node(self.obj)}
        if self.creator_op is None:
            return layout

        op_to_node: Dict[_FunctionCall, _DagLayoutNode] = {
            self.creator_op: layout.create_node(self.creator_op)
        }
        op_to_secret_container_node: Dict[_FunctionCall, _DagLayoutNode] = dict()
        layout.create_edge(op_to_node[self.creator_op], graphdata_to_node[self])
        ops: List[_FunctionCall] = [self.creator_op]
        while len(ops) > 0:
            op = ops.pop()
            op_node = op_to_node[op]

            # add to secret container
            op_to_secret_container_node[op] = layout.create_node(
                None, flow_direction='right', is_visible=False
            )
            op_to_secret_container_node[op].add_child(op_to_node[op])

            # create container ancestry
            container_op = op.container
            child = op_to_secret_container_node[op]
            while container_op is not None:
                if container_op not in op_to_node:
                    op_to_node[container_op] = layout.create_node(container_op)
                    op_to_node[container_op].add_child(child)
                    # if not graphdatum_added_to_container:
                    #     op_to_node[container_op].add_child(graphdata_to_node[])
                    child = op_to_node[container_op]
                    container_op = container_op.container
                else:
                    op_to_node[container_op].add_child(child)
                    break

            for output_graphdata in op.outputs:
                c = graphdata_to_node[output_graphdata].get_container()
                while c is not None and not c.is_ancestor(op_to_node[op]):
                    c.remove_child(graphdata_to_node[output_graphdata])
                    c = c.get_container()
                    if c is not None:
                        c.add_child(graphdata_to_node[output_graphdata])

            # add input data nodes
            for input_graphdata in op.get_args():
                # Only create a new data node if one does not exist, or if the data is a leaf
                if input_graphdata not in graphdata_to_node or input_graphdata.creator_op is None:
                    graphdata_to_node[input_graphdata] = layout.create_node(input_graphdata.obj)
                    # call get_container() twice to keep it out of the secret container
                    op_to_secret_container_node[op].get_container().add_child(
                        graphdata_to_node[input_graphdata]
                    )

                c = graphdata_to_node[input_graphdata].get_container()
                while c is not None and not c.is_ancestor(op_to_node[op]):
                    c.remove_child(graphdata_to_node[input_graphdata])
                    c = c.get_container()
                    if c is not None:
                        c.add_child(graphdata_to_node[input_graphdata])

                layout.create_edge(graphdata_to_node[input_graphdata], op_node)
                if input_graphdata.creator_op is not None and input_graphdata.creator_op not in op_to_node:
                    creator_op_node = layout.create_node(input_graphdata.creator_op)
                    layout.create_edge(creator_op_node, graphdata_to_node[input_graphdata])
                    op_to_node[input_graphdata.creator_op] = creator_op_node
                    ops.append(input_graphdata.creator_op)

            # add state inputs
            for input_graphdata in op.get_state_inputs():
                # for now, always create a new node and put it in a new container with the op
                graphdata_node = layout.create_node(input_graphdata.obj)
                layout.create_edge(graphdata_node, op_node)
                op_to_secret_container_node[op].add_child(graphdata_node)

        return layout


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


def _track_data(obj, creator_op=None, creator_pos=-1) -> Any:
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

    if not has_graphdata:
        graphdata = GraphData(obj, creator_op, creator_pos)
        if not obj.__class__.__name__.startswith('__XNODE_GENERATED__'):
            new_class_dict = _track_magic_methods(obj.__class__)
            new_class_dict[VIZ_FN] = getattr(graphdata, VIZ_FN)
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
        ret = g(name)
        # Have to use __getattribute__ here, not .xnode_current_op, to avoid calling this function infinitely
        if object.__getattribute__(self, 'xnode_current_op') is not None:
            ret = _track_data(ret)
            op = object.__getattribute__(self, 'xnode_current_op')
            op.state_inputs.append(('self.{}'.format(name), ret.xnode_graphdata))
        return ret

    return _tracked_getattr


def _gen_tracked_setattr(fn: Callable):
    s = fn.__setattr__

    def _tracked_setattr(self, name, value):
        # Have to use __getattribute__ here, not .xnode_current_op, to avoid calling the tracked getattr
        if name is not 'xnode_current_op' and object.__getattribute__(
                self, 'xnode_current_op') is not None:
            op = object.__getattribute__(self, 'xnode_current_op')
            value = _track_data(value, creator_op=op)
        s(name, value)

    return _tracked_setattr


def _gen_tracked_call(fn: Callable):
    c = fn.__call__
    # TODO: this is custom tailored for PyTorch, and we should generalize it in the future
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

    def _tracked_call(self, *args, **kwargs):
        arg_names: List[str] = (
            _arg_names[(len(_arg_names) - len(args)):] +
            [_varargs for _ in range(len(args) - len(_arg_names))]
        )

        kwarg_keys = list(kwargs.keys())
        op = _FunctionCall(
            _op_name, _make_tracked_arg_list(args, arg_names),
            _make_tracked_arg_list([kwargs[k] for k in kwarg_keys], kwarg_keys)
        )
        try:
            self.xnode_current_op = op
            ret = c(*args, **kwargs)
            self.xnode_current_op = None
        except AttributeError:
            ret = c(*args, **kwargs)
        multiple_returns = isinstance(ret, tuple) and len(ret) > 1
        # TODO handle passthrough returns
        if multiple_returns:
            ret_tracked = tuple(
                [_track_data(r, creator_op=op, creator_pos=i) for i, r in enumerate(ret)]
            )
        else:
            ret_tracked = _track_data(ret, creator_op=op, creator_pos=0)
        op.outputs = (x.xnode_graphdata for x in ret_tracked
                     ) if isinstance(ret_tracked, tuple) else (ret_tracked.xnode_graphdata,)
        op.set_contents()
        return ret_tracked

    return _tracked_call


class _TrackedFunction(wrapt.ObjectProxy):
    """Wraps a callable object, creating a `_FunctionCall` whenever called and creating a `GraphData` for each output."""

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


def track_function(fn: Callable) -> Callable:
    new_class_dict = {
        '__call__': _gen_tracked_call(fn),
        '__getattribute__': _gen_tracked_getattr(fn),
        '__setattr__': _gen_tracked_setattr(fn),
    }
    try:
        fn.__class__ = type(fn.__class__.__name__, (fn.__class__,), new_class_dict)
    except TypeError:
        # The object is a function or lambda, which cannot be subclassed
        fn = _TrackedFunction(fn)
    return fn
