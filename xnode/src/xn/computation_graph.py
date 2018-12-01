"""
Allows users to track their computation graph for visualization. Data is "tracked" by wrapping it in a `GraphData`
object, which acts as a passthrough wrapper that records the op that created the data and the values of the data that
should be visualized. Function calls are "tracked" by `FunctionCall` objects, which record the function that was called
and the arguments it was given. Finally, containers are "tracked" with `GraphContainer` objects, which record their
contents.

See get_viz.md for underlying principles and concepts.
"""
import wrapt
import inspect
from collections import deque
from xn.viz import VIZ_FN, get_viz, DagLayout, TokenPrimitive
from typing import Callable, List, Tuple, Any, Mapping, Optional, Union


# TODO: TrackedField


class FunctionCall:
    """A record of a single function execution."""
    def __init__(self,
                 fn_name: str,
                 args: List[Tuple[str, Union[List['GraphData'], 'GraphData']]],
                 kwargs: List[Tuple[str, Union[List['GraphData'], 'GraphData']]]):
        """Constructor.

        Args:
            fn_name (str): The name of the function, as should be shown in visualizations.
            args (tuple): A sequence of positional arguments that were passed to the function at execution.
            kwargs (dict): A dictionary of keyword arguments passed to the function at execution.
        """
        super(FunctionCall, self).__init__()
        self.container: Optional[FunctionCall] = None
        self.contents = None
        self.outputs = []

        self.fn_name: str = fn_name
        self.args = args
        self.kwargs = kwargs

    def get_tracked_args(self):
        """Return a list of all recorded positional and keyword arguments that are wrapped in `GraphData`.

        This is used to build the DAG, collecting all `GraphData` inputs so that their ancestors can be iterated over
        and added to the graph.

        Returns:
            (list): All positional and keyword argument values that are tracked in `GraphData`.
        """
        tracked_args = []
        for arg_list in [self.args, self.kwargs]:
            tracked_args.extend([arg[1] for arg in arg_list if len(arg) > 1 and not isinstance(arg[1], list)])
            for arg in arg_list:
                if len(arg) > 1 and isinstance(arg[1], list):
                    tracked_args.extend([arg_item for arg_item in arg[1] if arg_item is not None])
        return tracked_args

    def get_outermost_parent(self):
        """Returns the first `Nestable` with no container, found by iterating through this `Nestable`'s container
        hierarchy.

        The "outermost parent" of a `Nestable` n is the first `Nestable` with no container found in the hierarchy of
        n. This could be n itself, if n has no container.

        Returns:
            (Nestable): This instance's outermost parent.
        """
        return self if self.container is None else self.container.get_outermost_parent()

    def xn(self):
        return TokenPrimitive(self.fn_name)


class TrackedFunction(wrapt.ObjectProxy):
    """Wraps a callable object, creating a `FunctionCall` whenever called and creating a `GraphData` for each output."""
    def __init__(self,
                 obj: Callable) -> None:
        """Constructor.

        Args:
            obj (callable): A callable object, such as a function, whose executions should be recorded in the
                computation graph.
        """
        super(TrackedFunction, self).__init__(obj)
        # wrapt requires all wrapper properties to start with _self_

        # built-in functions don't have signatures, so we make them up
        # TODO: this is custom tailored for PyTorch, and we should generalize it in the future
        try:
            if hasattr(obj, 'forward'):
                # `getfullargspec` will work on PyTorch modules, but won't get arg names. Need to get from `forward`
                # directly.
                fn_spec = inspect.getfullargspec(obj.forward)
            else:
                fn_spec = inspect.getfullargspec(obj)
            arg_names = fn_spec.args
            varargs = fn_spec.varargs
        except TypeError:
            arg_names = []
            varargs: str = 'args'

        self._self_arg_names: List[str] = arg_names
        self._self_varargs: str = varargs
        # Pytorch modules don't have a `__name__` field
        try:
            self._self_op_name = obj.__name__
        except AttributeError:
            self._self_op_name = obj.__class__.__name__

    def __call__(self, *args, **kwargs):
        """Executes the wrapped function and creates a `FunctionCall` recording the execution.

        A single `FunctionCall` is created to record the function's execution. The wrapped function should not in its
        internals create any additional `FunctionCall` objects; functions which create more `FunctionCall` objects should be
        wrapped with `AbstractContainerGenerator` instead.

        Args:
            args: A sequence of positional arguments to pass to the wrapped function.
            kwargs (dict): Keyword arguments to pass to the wrapped function.

        Returns:
            The outputs of the wrapped function, each wrapped in a `GraphData` instance.
        """
        # TODO: should we dive into sequences and look for nested GraphData? If not, torch.cat doesn't really work
        # (since it takes as argument a list), but could be made to work with a wrapper that takes in any number of
        # inputs and collects them into a list before calling cat. If we do, how do we know when to stop diving,
        # and what do we do about output_props?
        ret = self.__wrapped__(*args, **kwargs)
        multiple_returns = isinstance(ret, tuple) and len(ret) > 1
        arg_names: List[str] = (
                self._self_arg_names[(len(self._self_arg_names) - len(args)):] +
                [self._self_varargs for _ in range(len(args) - len(self._self_arg_names))]
        )

        kwarg_keys = list(kwargs.keys())
        op = FunctionCall(self._self_op_name, _make_arg_list(args, arg_names),
                          _make_arg_list([kwargs[k] for k in kwarg_keys], kwarg_keys))
        # TODO handle passthrough returns
        if multiple_returns:
            ret_tracked = tuple(
                [_track_data(r,
                             creator_op=op,
                             creator_pos=i)
                 for i, r in enumerate(ret)])
        else:
            ret_tracked = _track_data(ret,
                                        creator_op=op,
                                        creator_pos=0)
        op.outputs = (x.xnode_graphdata for x in ret_tracked) if isinstance(ret_tracked, tuple) else (
            ret_tracked.xnode_graphdata,)
        _get_internal_calls(op)
        return ret_tracked


def _make_arg_list(args, arg_names) -> List[Tuple[str, Union[List['GraphData'], 'GraphData']]]:
    # len(args) == len(arg_names)
    arg_list = []
    for arg_name, arg in zip(arg_names, args):
        if hasattr(arg, '__iter__'):
            arg_list.append((arg_name, [_track_data(obj).xnode_graphdata for obj in arg]))
        else:
            arg_list.append((arg_name, _track_data(arg).xnode_graphdata))
    return arg_list


def _get_internal_calls(op) -> None:
    """Creates an abstractive container enveloping all ops between the container's proposed outputs and inputs.

    Builds the DAG backwards from the outputs in a breadth-first search, stopping beams at any encountered
    `GraphData` which is in the set of inputs. Whenever a new `FunctionCall` is found during search,
    its outermost parent
    is added to the new container (see the definition of "outermost parent" in `Nestable.get_outermost_parent()`.
    After
    search terminates, all of the new container's contents have their `container` field updated to point to the new
    container.

    Args:
        outputs (list): `GraphData` objects which serve as the outputs of the new abstractive container.
        inputs (set): `GraphData` objects which serve as the inputs of the new abstractive container.
    """
    contents = list()
    ops_checked = {op}
    inputs = set(op.get_tracked_args())
    data_to_check = deque(op.outputs)
    while len(data_to_check) > 0:
        data = data_to_check.popleft()
        if data in inputs:
            continue
        creator_op = data.creator_op
        if creator_op is not None and creator_op not in ops_checked:
            outermost_parent = creator_op.get_outermost_parent()
            contents.append(outermost_parent)
            data_to_check.extend(creator_op.get_tracked_args())
            ops_checked.add(creator_op)
    # Update newly contained objects after iterating through the graph to prevent the new container from containing
    # itself (consider ops op1, op2, which share container c1. We are adding a new container c2. If we update the
    # container of op1 during iteration, then c1's container becomes c2. When we check op2, its outermost container
    # is now c2, meaning c2's container would become c2).
    for item in contents:
        item.container = op
    op.contents = contents


# ======================================================================================================================
# Graph data.
# -----------
# A `GraphData` object records a single immutable function input or output in the computation graph. `GraphData` can
# be used as if they were their wrapped object.
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
            creator_op (FunctionCall): The `GraphOp` which created the wrapped object.
            creator_pos (int): The position of the object in the `creator_op`'s output tuple.
        """
        self.obj = obj
        self.creator_op = creator_op
        self.creator_pos = creator_pos

    def xn(self):
        layout = DagLayout()
        graphdata = [self]
        creator_op_nodes = dict()
        container_nodes = dict()
        while len(graphdata) > 0:
            graphdatum = graphdata.pop()
            graphdatum_node = layout.create_node(graphdatum.obj)
            if graphdatum.creator_op is not None:
                if graphdatum.creator_op not in creator_op_nodes:
                    creator_op_nodes[graphdatum.creator_op] = layout.create_node(graphdatum.creator_op)
                    child = creator_op_nodes[graphdatum.creator_op]
                    container = graphdatum.creator_op.container
                    while container is not None:
                        # if no node yet, create, add child, and continue
                        # if node, add child and break
                        if container not in container_nodes:
                            container_nodes[container] = layout.create_container()
                            container_nodes[container].add_child(child)
                            child = container_nodes[container]
                            container = container.container
                        else:
                            container_nodes[container].add_child(child)
                            break
                layout.create_edge(creator_op_nodes[graphdatum.creator_op], graphdatum_node)
                graphdata += graphdatum.creator_op.get_tracked_args()
        return layout


def gen_magic_method(obj_class, fn_name):
    """Returns a magic method that, when called, executes `obj_class.fn_name()` and tracks the call.

    Args:
        obj_class (class): Class whose magic method should be executed when the generated function is called.
        fn_name (str): The name of the magic method that should be executed when the generated function is called.

    Returns:
        (fn): A function which, when executed, calls a magic method and tracks the call.
    """
    magic_method = getattr(obj_class, fn_name)

    def wrapped_magic_method(self, x):
        return TrackedFunction(magic_method)(self, x)
    return wrapped_magic_method


# List of all arithmetic magic methods from https://rszalski.github.io/magicmethods/#appendix2
MAGIC_METHODS = ['__add__', '__sub__', '__mul__', '__div__', '__floordiv__', '__truediv__', '__mod__', '__divmod__',
                 '__pow__', '__lshift__', '__rshift__', '__and__', '__or__', '__xor__']
MAGIC_METHODS += ['__r' + fn_name.lstrip('__') for fn_name in MAGIC_METHODS]
# TODO: in-place assignment magic methods?


def track_magic_methods(obj_class):
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
    for fn_name in MAGIC_METHODS:
        try:
            methods[fn_name] = gen_magic_method(obj_class, fn_name)
        except AttributeError:
            pass
    return methods


# ======================================================================================================================
# Public API.
# -----------------
# The canonical ways of creating `GraphData`, `FunctionCall`, and `GraphContainer` instances. Instances should not be
# directly created, and should be created only using the following methods.
# ======================================================================================================================

def _track_data(obj, creator_op=None, creator_pos=-1) -> Any:
    """Creates a `GraphData` object which records the properties of `obj` and allows it to be shown in the graph.

    Any object which is not the output of a tracked function (see `TrackedFunction`) is not, by default, shown in the
    computation graph. Leaf data nodes can be added to the graph via `_track_data()`.

    `_track_data()` adds a new field `xnode_graphdata` to `obj`, which maps to new the `GraphData` object. The class
    of `obj` is also changed so that its arithmetic magic methods are tracked in the graph.

    Args:
        obj (object): Python object to add to the graph.
        creator_op (FunctionCall or None): The `GraphOp` object recording the function call which outputted `obj`. If
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
            new_class_dict = track_magic_methods(obj.__class__)
            new_class_dict[VIZ_FN] = getattr(graphdata, VIZ_FN)
            try:
                obj.__class__ = type('__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                                     new_class_dict)
            except TypeError:
                # The object might be an int or other primitive, which cannot be directly assigned with `type()`.
                class WrapperClass(type(obj)):
                    pass

                obj = WrapperClass(obj)
                obj.__class__ = type('__XNODE_GENERATED__{}'.format(obj.__class__.__name__), (obj.__class__,),
                                     new_class_dict)
        obj.xnode_graphdata = graphdata
    return obj
