import wrapt
import inspect
from typing import Callable, Any, Optional, List, Tuple, Union, Set, Dict
from collections import deque, defaultdict
from xnode.view import DagLayout, Text
import visual_debugger


# Data structures
class _FunctionCall:
    """A record of a single function execution."""

    def __init__(
            self,
            fn_name: str,
            args: List['_GraphData'],
            arg_names: List[str],
            kwargs: List['_GraphData'],
            kwarg_names: List[str],
    ):
        super(_FunctionCall, self).__init__()
        self.container: Optional[_FunctionCall] = None
        self.contents: List[_FunctionCall] = []
        self.outputs: List[_GraphData] = []

        self.fn_name: str = fn_name
        self.args = args
        self.arg_names = arg_names
        self.kwargs = kwargs
        self.kwarg_names = kwarg_names
        self.state_inputs = []

    def set_contents(self) -> None:
        contents: List[_FunctionCall] = list()
        ops_checked: Set[_FunctionCall] = {self}
        inputs: Set[_GraphData] = set(self.args + self.kwargs)
        seen_data = set()
        # print(inputs)
        data_to_check: deque[_GraphData] = deque(self.outputs)
        # print(self.fn_name)
        while len(data_to_check) > 0:
            data: _GraphData = data_to_check.popleft()
            if data in inputs:
                continue
            creator_op: _FunctionCall = data.creator_op
            # print('created by {}'.format(creator_op.fn_name if creator_op is not None else None))
            if creator_op is not None and creator_op not in ops_checked:
                outermost_parent: _FunctionCall = creator_op.get_outermost_parent()
                contents.append(outermost_parent)
                data_to_check.extend(creator_op.args + creator_op.kwargs)
                ops_checked.add(creator_op)
        # Update newly contained objects after iterating through the graph to prevent the new container from containing
        # itself (consider ops op1, op2, which share container c1. We are adding a new container c2. If we update the
        # container of op1 during iteration, then c1's container becomes c2. When we check op2, its outermost container
        # is now c2, meaning c2's container would become c2).
        for item in contents:
            item.container = self
        self.contents = contents

    def get_outermost_parent(self) -> '_FunctionCall':
        """Returns the first `Nestable` with no container, found by iterating through this `Nestable`'s container
        hierarchy.

        The "outermost parent" of a `Nestable` n is the first `Nestable` with no container found in the hierarchy of
        n. This could be n itself, if n has no container.

        Returns:
            (Nestable): This instance's outermost parent.
        """
        return self if self.container is None else self.container.get_outermost_parent()

    def is_ancestor(self, other_fn: '_FunctionCall'):
        return other_fn in self.contents or any([child.is_ancestor(other_fn) for child in self.contents])

    def __view__(self):
        # TODO
        return Text(self.fn_name)


class _GraphData:
    """A record of a tracked function input or output."""

    def __init__(self, obj, creator_op=None, creator_pos=-1, state_input=False, align_with=None):
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
        self.state_input = state_input
        self.align_with = [data for data in align_with] if align_with is not None else None

    def __view__(self):
        g = DagLayout(flow_direction='south')
        g.node(str(self), item=self.obj)

        if self.creator_op is None:
            return g

        to_data_edges: Dict[_GraphData, List[Tuple[_FunctionCall, str]]] = defaultdict(list)
        from_data_edges: Dict[_GraphData, List[Tuple[_FunctionCall, str]]] = defaultdict(list)

        ops_to_add: List[_FunctionCall] = [self.creator_op]
        added_ops: Set[_FunctionCall] = set()
        while len(ops_to_add) > 0:
            op = ops_to_add.pop()
            added_ops.add(op)
            g.node(str(op), item=op, parent=str(op) + '_secret', flow_direction='south')
            g.node(str(op) + '_secret', item=None, flow_direction='east', is_visible=False)
            if op.container is not None:
                g.node(str(op) + '_secret', parent=str(op.container))
                if op.container not in added_ops:
                    ops_to_add.append(op.container)

            for i, data in enumerate(op.outputs):
                port_name = '{}_out'.format(i)
                g.port(str(op), port_name, 'south')
                g.node(str(data), item=data.obj, parent=str(op.container) if op.container is not None else None)
                to_data_edges[data].append((op, port_name))

            for i, data in enumerate(op.args + op.kwargs):
                port_name = '{}_in'.format(i)
                g.port(str(op), port_name, 'west' if data.state_input else 'north')
                g.node(str(data), item=data.obj)#, parent=str(op.container) if op.container is not None else None)
                if data.creator_op is not None and data.creator_op not in added_ops:
                    ops_to_add.append(data.creator_op)
                from_data_edges[data].append((op, port_name))

            # add state inputs

        # promote data nodes to minimum acceptable height
        # Note: this doesn't do LCA. It will promote upward from its creator op
        for data in set(from_data_edges.keys()):
            container = data.creator_op.container if data.creator_op is not None else -1
            for op, _ in from_data_edges[data]:
                if container is not None and (container == -1 or op.container is None or op.container.is_ancestor(container)):
                    container = op.container
            if container == -1:
                container = None
            if data.state_input:
                g.node(str(data), parent=str(container) + '_secret' if container is not None else None)
            else:
                g.node(str(data), parent=str(container) if container is not None else None)

        # create edges
        for data in from_data_edges:
            segments = route_edges(str(data), from_data_edges[data])
            for start, end, start_port, end_port in segments:
                g.edge(start, end, start_port=start_port, end_port=end_port)

        for data in to_data_edges:
            segments = route_edges(str(data), to_data_edges[data])
            for end, start, end_port, start_port in segments:
                g.edge(start, end, start_port=start_port, end_port=end_port)

        return g


def route_edges(data_node_id: str, edges: List[Tuple[_FunctionCall, str]]) -> List[Tuple[str, str, Optional[str], Optional[str]]]:
    segments = []
    for op, port_name in edges:
        parent = None
        for other_op, other_port_name in edges:
            if op is other_op:
                continue
            if other_op.is_ancestor(op) and (parent is None or parent[0].is_ancestor(other_op)):
                parent = (other_op, other_port_name)
        segments.append((str(parent[0]), str(op), parent[1], port_name) if parent is not None else (data_node_id, str(op), None, port_name))
    return list(set(segments))


# Trackers
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


def _track_data(obj, creator_op=None, creator_pos=-1, force=False, state_input=False, align_with: Optional[List[_GraphData]] = None) -> Any:
    try:
        has_graphdata = hasattr(obj, '__xnode_graphdata')
    except Exception:
        # PyTorch variables throw a NotImplementedError if you do a `getattr` on a non-existent attribute,
        # which breaks hasattr.
        # Other classes, like Namespace, throw an exception if you `getattr` on any attribute.
        has_graphdata = False

    if not has_graphdata or force:
        graphdata = _GraphData(obj, creator_op, creator_pos, state_input, align_with)
        if not obj.__class__.__name__.startswith('__XNODE_GENERATED__'):
            new_class_dict = _track_magic_methods(obj.__class__)
            try:
                obj.__class__ = type(
                    '__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                    new_class_dict
                )
            except TypeError as e:
                # The object might be an int or other primitive, which cannot be directly assigned with `type()`.
                class WrapperClass(type(obj)):
                    pass

                obj = WrapperClass(obj)
                obj.__class__ = type(
                    '__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                    new_class_dict
                )
        obj.__xnode_graphdata = graphdata
    return obj


_CALL_STACK = []

def _gen_tracked_call(fn, call_name: Optional[str]=None) -> Callable[[Callable, Any, Any], Any]:
    c = fn.__call__
    try:
        if call_name is not None and hasattr(fn, call_name):
            fn_spec = inspect.getfullargspec(getattr(fn, call_name))
        else:
            fn_spec = inspect.getfullargspec(fn)
        _arg_names = fn_spec.args
        _varargs = fn_spec.varargs
    except TypeError:
        _arg_names = []
        _varargs: str = 'args'

    # Objects don't have a `__name__` field
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

        tracked_args = [_track_data(arg) for arg in args]

        kwarg_keys = list(kwargs.keys())
        tracked_kwargs = [_track_data(kwargs[key]) for key in kwarg_keys]

        op = _FunctionCall(
            _op_name,
            [arg.__xnode_graphdata for arg in tracked_args],
            arg_names,
            [arg.__xnode_graphdata for arg in tracked_kwargs],
            kwarg_keys,
        )
        _CALL_STACK.append(op)

        tracked_kwargs = {
            key: value for key, value in zip(kwarg_keys, tracked_kwargs)
        }
        # This catches cases like tracked addition operators, which cannot have children anyway
        try:
            self.__xnode_current_op = op
            ret = c(*tracked_args, **tracked_kwargs) if not needs_self else c(self, *tracked_args, **tracked_kwargs)
            self.__xnode_current_op = None
        except AttributeError:
            ret = c(*tracked_args, **tracked_kwargs)
        multiple_returns = isinstance(ret, tuple) and len(ret) > 1
        input_graphdata = set(op.args + op.kwargs)
        if multiple_returns:
            ret_tracked = tuple(
                [_track_data(r, creator_op=op, creator_pos=i, force=hasattr(r, '__xnode_graphdata') and r.__xnode_graphdata in input_graphdata)
                 for i, r in enumerate(ret)]
            )
        else:
            ret_tracked = _track_data(ret, creator_op=op, creator_pos=0, force=hasattr(ret, '__xnode_graphdata') and ret.__xnode_graphdata in input_graphdata)
        output_graphdata = [x.__xnode_graphdata for x in ret_tracked] if isinstance(ret_tracked, tuple) else [
            ret_tracked.__xnode_graphdata]
        op.outputs = output_graphdata
        _CALL_STACK.pop()
        if len(_CALL_STACK) > 0:
            _CALL_STACK[-1].contents.append(op)
            op.container = _CALL_STACK[-1]
        # op.set_contents()
        return ret_tracked

    return _tracked_call


def _gen_tracked_getattr(fn: Callable):
    g = fn.__getattribute__

    def _tracked_getattr(self, name):
        if name.startswith('__'):
            ret = g(self, name)
        else:
            ret = g(self, name)
            ret = _track_data(ret)
            # op = object.__getattribute__(self, '__xnode_current_op')
            # op.state_inputs.append(ret.__xnode_graphdata)
            # if hasattr(ret, '__xnode_graphdata'):
            #     ret = _track_data(ret, align_with=[ret.__xnode_graphdata], creator_op=ret.__xnode_graphdata.creator_op, state_input=True, force=True)
            # else:
            #     ret = _track_data(ret, state_input=True)
        # Have to use __getattribute__ here, not .__xnode_current_op, to avoid calling this function infinitely
        # if object.__getattribute__(self, '__xnode_current_op') is not None:
        #     op = object.__getattribute__(self, '__xnode_current_op')
        #     op.state_inputs.append(('self.{}'.format(name), ret.xnode_graphdata))
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
            # if name is not 'xnode_current_op' and object.__getattribute__(
            #         self, 'xnode_current_op') is not None:
            #     op = object.__getattribute__(self, 'xnode_current_op')
            if not name.startswith('__'):
                # TODO: add "set" op here as creator?
                value = _track_data(value)
        except AttributeError:
            pass
        s(self, name, value)

    return _tracked_setattr


class _TrackedFunction(wrapt.ObjectProxy):
    def __init__(self, obj: Callable) -> None:
        super(_TrackedFunction, self).__init__(obj)
        # wrapt requires all wrapper properties to start with _self_
        self._self_tracked_call = _gen_tracked_call(obj)

    def __call__(self, *args, **kwargs):
        return self._self_tracked_call(self.__wrapped__, *args, **kwargs)


# Public API
def track_class(cls, call_name: Optional[str]=None):
    new_class_dict = {
        '__call__': _gen_tracked_call(cls, call_name),
        '__getattribute__': _gen_tracked_getattr(cls),
        '__setattr__': _gen_tracked_setattr(cls),
    }
    return type(cls.__name__, (cls,), new_class_dict)


def track_fn(fn):
    new_class_dict = {
        '__call__': _gen_tracked_call(fn),
    }
    try:
        fn.__class__ = type(fn.__class__.__name__, (fn.__class__,), new_class_dict)
    except TypeError:
        # The object is a function or lambda, which cannot be subclassed
        fn = _TrackedFunction(fn)
    return fn


def get_graph(o: Any) -> _GraphData:
    return o.__xnode_graphdata
