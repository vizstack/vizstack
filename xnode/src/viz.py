import inspect
import types
from collections import defaultdict
from copy import copy
from typing import Callable, Mapping, Any, Sequence, Tuple, MutableMapping, MutableSequence, Optional, Container, \
    MutableSet, Set, ClassVar, NamedTuple, NewType, Union

from torch import Tensor

from constants import SymbolId, SnapshotId, SymbolSlice, SymbolData, SymbolShell
from graphtracker import GraphData, GraphContainer, GraphOp, get_graphdata, has_graphdata

# TODO: clarify terminology (what is a symbol? shell? filled shell? empty shell? data object?)
# ======================================================================================================================
# Symbol data object creation.
# ----------------------------
# Defines a `_VisualizationType` for each object type that has a unique representation in `SYMBOL-TABLE-SCHEMA.md`,
# encapsulating that type's symbol schema representation. These `_VisualizationType` objects can be used by classes
# such as `VisualizationEngine` to create new symbol shells for any given Python objects.
# ======================================================================================================================

# Python object types for which `viz._PRIMITIVE.test_fn(obj)` is `True`
_PrimitiveType = NewType('_PrimitiveType', Union[str, float, int, bool, None])

# Mapping of referenced symbol IDs to corresponding objects created in data generation functions
_RefsDict = NewType('_RefsDict', MutableMapping[SymbolId, Any])


class _VisualizationType(NamedTuple):
    """Encapsulates the visualization-relevant properties of a specific object type.

    The `VisualizationEngine` outputs data schemas for different types of objects (string, number, dict, etc). Each of
    these schemas is different, as different objects need to send different data. Rather than constructing each schema
    according to some monolithic switch condition, each object's unique properties/functions are encapsulated in a
    `_VisualizationType` object. For instance,

        `BOOL = _VisualizationType(type_name='bool', test_fn=lambda x: type(x) is bool)`

    encapsulates the unique properties/functions for the `boolean` type. This construction ultimately allows objects of
    different types to be treated in a generic manner in code.
    """
    # The string name of the object type, as understood by the client.
    type_name: str
    # Returns true if `obj` is of the type handled by this `_VisualizationType` instance.
    test_fn: Callable[[Any], bool]
    # Takes a Python object and a snapshot ID and creates the data object for that object, using that snapshot ID in
    # all referenced symbol IDs. Assumed that `test_fn(obj) == True`.
    data_fn: Callable[[Any, SnapshotId], Tuple[SymbolData, _RefsDict]]
    # Translates the given symbol object to a human-readable string. Assumed that `test_fn(obj) == True`.
    str_fn: Callable[[Any], str] = str

# Data generation functions.
# --------------------------
# These type-specific functions generate a data object and a dict mapping every symbol ID referenced therein to its
# corresponding Python object.


def _generate_data_primitive(obj: _PrimitiveType,
                             snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for primitives."""
    refs: _RefsDict = dict()
    return {
               'contents': obj,
           }, refs


def _generate_data_tensor(obj: Tensor,
                          snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for tensors."""
    refs: _RefsDict = dict()
    return {
               # This is deliberately not sanitized to prevent the lists from being turned into references.
               'contents': obj.cpu().numpy().tolist(),
               'size': list(obj.size()),
               'type': TENSOR_TYPES[obj.type()],
               'maxmag': obj.abs().max(),
           }, refs


def _generate_data_graphdata(obj: Any,
                             snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for graph data nodes."""
    refs: _RefsDict = dict()
    # We consider both `GraphData` instances and objects which have associated `GraphData` instances to be
    # graphdata for schema purposes, so we need to figure out which one `obj` is
    try:
        graphdata_obj: GraphData = get_graphdata(obj)
    except AttributeError:
        graphdata_obj: GraphData = obj
    return {
               'creatorop': _sanitize_for_data_object(graphdata_obj.creator_op, refs, snapshot_id)
               if graphdata_obj.creator_op else None,
               'creatorpos': graphdata_obj.creator_pos,
               'kvpairs': {
                   key: _sanitize_for_data_object(value, refs, snapshot_id)
                   for key, value in graphdata_obj.get_visualization_dict().items()
                   }
           }, refs


def _generate_data_graphcontainer(obj: GraphContainer,
                                  snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for graph containers."""
    refs: _RefsDict = dict()
    return {
               'contents': [_sanitize_for_data_object(op, refs, snapshot_id) for op in obj.contents],
               'container': _sanitize_for_data_object(obj.container, refs, snapshot_id) if obj.container else None,
               'temporalstep': obj.temporal_step,
               'height': obj.height,
               'functionname': obj.fn_name,
           }, refs


def _generate_data_graphop(obj: GraphOp,
                           snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for graph op nodes."""
    refs: _RefsDict = dict()
    return {
               'function': _sanitize_for_data_object(obj.fn, refs, snapshot_id),
               'args': [[arg[0],
                         _sanitize_for_data_object(arg[1], refs, snapshot_id) if not isinstance(arg[1], list) else
                         [_sanitize_for_data_object(arg_item, refs, snapshot_id) for arg_item in arg[1]]] if len(
                   arg) > 1 else
                        [_sanitize_for_data_object(arg[0], refs, snapshot_id)]
                        for arg in obj.args],
               'kwargs': [[arg[0],
                           _sanitize_for_data_object(arg[1], refs, snapshot_id) if not isinstance(arg[1], list) else
                           [_sanitize_for_data_object(arg_item, refs, snapshot_id) for arg_item in arg[1]]] if len(
                   arg) > 1 else
                          [_sanitize_for_data_object(arg[0], refs, snapshot_id)]
                          for arg in obj.kwargs],
               'container': _sanitize_for_data_object(obj.container, refs, snapshot_id) if obj.container else None,
               'functionname': obj.fn_name,
               'outputs': [_sanitize_for_data_object(output, refs, snapshot_id) for output in obj.outputs],
           }, refs


def _generate_data_dict(obj: Mapping,
                        snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for dicts."""
    contents: MutableMapping[str, Any] = dict()
    refs: _RefsDict = dict()
    for key, value in obj.items():
        contents[_sanitize_for_data_object(key, refs, snapshot_id)]: SymbolId = \
            _sanitize_for_data_object(value, refs, snapshot_id)
    return {
               'contents': contents,
               'length': len(obj),
           }, refs


def _generate_data_sequence(obj: Sequence,
                            snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for sequential objects (list, tuple, set)."""
    contents: MutableSequence[SymbolId] = list()
    refs: _RefsDict = dict()
    for item in obj:
        contents.append(_sanitize_for_data_object(item, refs, snapshot_id))
    return {
               'contents': contents,
               'length': len(obj),
           }, refs


def _generate_data_function(obj: Callable,
                            snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for functions."""
    refs: _RefsDict = dict()
    args: MutableSequence[str] = []
    kwargs: MutableMapping[str, SymbolId] = dict()
    for param_name, param in inspect.signature(obj).parameters.items():
        if param.default is inspect._empty:
            args.append(param_name)
        else:
            kwargs[param_name]: SymbolId = _sanitize_for_data_object(param.default, refs, snapshot_id)
    return {'args': args, 'kwargs': kwargs}, refs


# TODO: figure out how to specify that `obj` is a module
def _generate_data_module(obj: Any,
                          snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for modules."""
    refs: _RefsDict = dict()
    contents: Mapping[str, SymbolId] = _get_data_object_attributes(obj, refs, snapshot_id, exclude_fns=False)
    return {
               'contents': contents,
           }, refs


# TODO: figure out how to specify that `obj` is a class
def _generate_data_class(obj: Any,
                         snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for classes."""
    contents: Mapping[str, MutableMapping[str, SymbolId]] = {
        'staticfields': dict(),
        'functions': dict(),
    }
    refs: _RefsDict = dict()
    for attr in dir(obj):
        try:
            value: Any = getattr(obj, attr)
            if _FUNCTION.test_fn(value):
                contents['functions'][attr]: SymbolId = _sanitize_for_data_object(value, refs, snapshot_id)
            else:
                contents['staticfields'][attr]: SymbolId = _sanitize_for_data_object(value, refs, snapshot_id)
        except AttributeError:
            continue
    return SymbolData(contents), refs


def _generate_data_object(obj: Any,
                          snapshot_id: SnapshotId) -> (SymbolData, _RefsDict):
    """Data generation function for object instances which do not fall into other categories."""
    instance_class: str = type(obj)
    instance_class_attrs: Mapping[str, Any] = dir(instance_class)
    contents: MutableMapping[str, SymbolId] = dict()
    refs: _RefsDict = dict()
    for attr in dir(obj):
        try:
            value: Any = getattr(obj, attr)
            if not _FUNCTION.test_fn(value) and (
                            attr not in instance_class_attrs or getattr(instance_class, attr, None) != value):
                contents[attr]: SymbolId = _sanitize_for_data_object(getattr(obj, attr), refs, snapshot_id)
        # TODO: when does this occur?
        except TypeError:
            contents[attr]: SymbolId = _sanitize_for_data_object(getattr(obj, attr), refs, snapshot_id)
        except Exception:
            # If some unexpected error occurs (as any object can override `getattr()` like Pytorch does,
            # and raise any error), just skip over instead of crashing
            continue
    return {
               'contents': contents,
               'builtin': inspect.isbuiltin(obj),
           }, refs


# `_VisualizationType` objects.
# ----------------------------
# Instances of `_VisualizationType` which each contain all the information needed to generate a symbol shell for a
# particular object type.

_NUMBER: _VisualizationType = \
    _VisualizationType('number', test_fn=lambda obj: isinstance(obj, (float, int)),
                       data_fn=_generate_data_primitive)
_STRING: _VisualizationType = \
    _VisualizationType('string', test_fn=lambda obj: isinstance(obj, str),
                       data_fn=_generate_data_primitive,
                       str_fn=lambda obj: '"{}"'.format(obj))
_BOOL: _VisualizationType = \
    _VisualizationType('bool', test_fn=lambda obj: isinstance(obj, bool),
                       data_fn=_generate_data_primitive)
_NONE: _VisualizationType = \
    _VisualizationType('none', test_fn=lambda obj: obj is None,
                       data_fn=_generate_data_primitive)
_TENSOR: _VisualizationType = \
    _VisualizationType('tensor', test_fn=lambda obj: isinstance(obj, Tensor),
                       str_fn=lambda obj: 'tensor <{}>{}'.format(TENSOR_TYPES[obj.type()], list(obj.size())),
                       data_fn=_generate_data_tensor)
_GRAPH_DATA: _VisualizationType = \
    _VisualizationType('graphdata',
                       test_fn=lambda obj: isinstance(obj, GraphData) or has_graphdata(obj),
                       # Exclude 'graphdata' in `_get_type_info` to prevent infinite recursion
                       str_fn=lambda obj: _get_type_info(obj, ['graphdata']).str_fn(obj),
                       data_fn=_generate_data_graphdata)
_GRAPH_CONTAINER: _VisualizationType = \
    _VisualizationType('graphcontainer', test_fn=lambda obj: isinstance(obj, GraphContainer),
                       str_fn=lambda obj: 'graphcontainer[{}]'.format(len(obj.contents)),
                       data_fn=_generate_data_graphcontainer)
_GRAPH_OP: _VisualizationType = \
    _VisualizationType('graphop', test_fn=lambda obj: isinstance(obj, GraphOp),
                       str_fn=lambda obj: 'graphop <{}>'.format(obj.fn_name),
                       data_fn=_generate_data_graphop)
_DICT: _VisualizationType = \
    _VisualizationType('dict', test_fn=lambda obj: isinstance(obj, dict),
                       str_fn=lambda obj: 'dict[{}]'.format(len(obj)),
                       data_fn=_generate_data_dict)
_LIST: _VisualizationType = \
    _VisualizationType('list', test_fn=lambda obj: isinstance(obj, list),
                       str_fn=lambda obj: 'list[{}]'.format(len(obj)),
                       data_fn=_generate_data_sequence)
_SET: _VisualizationType = \
    _VisualizationType('set', test_fn=lambda obj: isinstance(obj, set),
                       str_fn=lambda obj: 'set[{}]'.format(len(obj)),
                       data_fn=_generate_data_sequence)
_TUPLE: _VisualizationType = \
    _VisualizationType('tuple', test_fn=lambda obj: isinstance(obj, tuple),
                       str_fn=lambda obj: 'tuple[{}]'.format(len(obj)),
                       data_fn=_generate_data_sequence)
_FUNCTION: _VisualizationType = \
    _VisualizationType('fn', test_fn=lambda obj: isinstance(obj, (types.FunctionType, types.MethodType,
                                                                  type(all.__call__))),
                       str_fn=lambda obj: 'function {}{}'.format(obj.__name__, str(inspect.signature(obj))),
                       data_fn=_generate_data_function)
_MODULE: _VisualizationType = \
    _VisualizationType('module', test_fn=inspect.ismodule,
                       str_fn=lambda obj: 'module <{}>'.format(obj.__name__),
                       data_fn=_generate_data_module)
_CLASS: _VisualizationType = \
    _VisualizationType('class', test_fn=inspect.isclass,
                       str_fn=lambda obj: 'class <{}>'.format(obj.__name__),
                       data_fn=_generate_data_class)
_OBJECT: _VisualizationType = \
    _VisualizationType('object', test_fn=lambda obj: True,
                       # TODO: this is information leakage from `graphtracker`. When we refactor it, clean this up
                       str_fn=lambda obj: 'object <{}>'.format(obj.__class__.__name__
                                                               .replace('__XNODE_GENERATED__', '')),
                       data_fn=_generate_data_object)

# A list of all `_VisualizationType` objects, in the order in which type should be tested. For example, the
# `_INSTANCE` should be last, as it returns `True` on any object and is the most general type. `_BOOL` should be
# before `_NUMBER`, as bool is a subclass of number. `_GRAPH_DATA` should be first, as it can wrap any type and
# will otherwise be mistaken for those types.
TYPES: Sequence[_VisualizationType] = [_GRAPH_DATA, _GRAPH_CONTAINER, _GRAPH_OP, _NONE, _BOOL, _NUMBER, _STRING,
                                       _TENSOR, _DICT, _LIST, _SET, _TUPLE, _MODULE, _FUNCTION, _CLASS, _OBJECT]

# We convey the data type of a tensor in a generic way to remove dependency on the tensor's implementation. We
# need a way to look up the Python object's type to get the data type string the client will understand.
TENSOR_TYPES: Mapping[str, str] = {
    'torch.HalfTensor': 'float16',
    'torch.FloatTensor': 'float32',
    'torch.DoubleTensor': 'float64',
    'torch.ByteTensor': 'uint8',
    'torch.CharTensor': 'int8',
    'torch.ShortTensor': 'int16',
    'torch.IntTensor': 'int32',
    'torch.LongTensor': 'int64',
    'torch.cuda.HalfTensor': 'float16',
    'torch.cuda.FloatTensor': 'float32',
    'torch.cuda.DoubleTensor': 'float64',
    'torch.cuda.ByteTensor': 'uint8',
    'torch.cuda.CharTensor': 'int8',
    'torch.cuda.ShortTensor': 'int16',
    'torch.cuda.IntTensor': 'int32',
    'torch.cuda.LongTensor': 'int64',
}


# Utility functions for data generation.
# --------------------------------------

def _get_data_object_attributes(obj: Any,
                                refs: _RefsDict,
                                snapshot_id: SnapshotId,
                                exclude_fns: bool=True) -> Mapping[str, SymbolId]:
    """Creates the dict containing a symbol's attributes to be sent with the symbol's data object.

    Each symbol is a single Python object, which has attributes beyond those used for visualization.
    For completeness, the key-value pairs of these attributes can be surfaced to clients. Those pairs are generated
    here and escaped for safe communication with the client.

    Args:
        obj: Python object whose attributes dict should be generated.
        refs: A set to save new symbol ID reference strings created during generation. TODO
        exclude_fns: Exclude functions (both instance and static) if `True`.

    Returns:
        A mapping of attribute names to their values, escaped with symbol IDs where necessary.
    """
    attributes: MutableMapping[str, SymbolId] = dict()
    for attr in dir(obj):
        # There are some functions, like torch.Tensor.data, which exist just to throw errors. Testing these
        # fields will throw the errors. We should consume them and keep moving if so.
        try:
            if exclude_fns and _FUNCTION.test_fn(getattr(obj, attr)):
                continue
        except Exception:
            continue
        attributes[attr]: SymbolId = _sanitize_for_data_object(getattr(obj, attr), refs, snapshot_id)
    return attributes


def _sanitize_for_data_object(obj: Any,
                              refs: _RefsDict,
                              snapshot_id: SnapshotId) -> SymbolId:
    """Takes in a Python object and returns a string ID for it that is safe to send to clients.

    `_sanitize_for_data_object()` translates any key or value which needs to be in a symbol's data object into a
    symbol ID string, which can be sent to the client along with a shell for the key or value. Only objects
    which should be "inspectable" as separate entities from their parent should be sanitized; for example,
    the contents of a sent list must all be sanitized, as each can be inspected, but the name of a `graphop`
    argument should not be sanitized, since it is not an object clients should be able to inspect.

    A new key-value pair `symbol_id: obj` is added to `refs`; downstream users, like `VisualizationEngine`,
    can then cache these referenced objects or create shells for them.

    Args:
        obj: An object to make safe for inclusion in the data object.
        refs: A mapping of symbol ID strings to the Python objects they represent.
        snapshot_id: The unique ID of the snapshot of `obj` currently being taken.

    Returns:
        A symbol ID reference to `obj`.
    """
    symbol_id: SymbolId = _get_symbol_id(obj, snapshot_id)
    refs[symbol_id]: Any = obj
    return symbol_id


def _get_type_info(obj: Any,
                   exclude_types: Optional[Container[str]]=None) -> _VisualizationType:
    """Returns the `_VisualizationType` object which describes the type of `obj`.

    Args:
        obj: An object of unknown visualization type.
        exclude_types: A list of visualization type names that may not be returned.

    Returns:
        The `_VisualizationType` object associated with the object's type.
    """
    for type_info in TYPES:
        if (exclude_types is None or type_info.type_name not in exclude_types) and type_info.test_fn(obj):
            return type_info


# ======================================================================================================================
# Symbol ID utilities.
# --------------------
# These functions create and manipulate the string IDs used to identify particular Python objects at particular
# points in the program's execution. Each ID embeds two pieces of information: an ID which is unique to the object
# throughout its lifetime, and a snapshot ID which is shared only by all other symbol IDs created during the same
# point in the program.
# ======================================================================================================================

# Prefix to append to strings to identify them as symbol ID references. It is not obvious whether a string in a
# filled shell's data object is a symbol ID string or text that should be rendered by the client, so some escaping must
# be done to remove ambiguity.
REF_PREFIX: str = '@id:'


def _get_snapshot_id(symbol_id: SymbolId) -> SnapshotId:
    """Determines the snapshot ID at which a given symbol ID was created.

    Args:
        symbol_id: A symbol ID, created by `_get_symbol_id()`.

    Returns:
        The snapshot ID embedded in the symbol ID.
    """
    return SnapshotId(int(symbol_id.split('!')[1]))


def _get_symbol_id(obj: Any,
                   snapshot_id: SnapshotId) -> SymbolId:
    """Returns the symbol ID (a string unique for the object's lifetime) of a given object.

    Caches the object, so it will not be garbage collected until the `VisualizationEngine` is destroyed. Thus,
    the symbol ID remains unique until the engine itself dies.

    Args:
        obj: A Python object to be identified.

    Returns:
        A unique symbol ID.
    """
    symbol_id: SymbolId = SymbolId('{}{}!{}!'.format(REF_PREFIX, id(obj), snapshot_id))
    return symbol_id


class VisualizationEngine:
    """A stateful object which creates symbol shells for Python objects, which can be used by clients to render
    visualizations.
    """

    def __init__(self) -> None:
        """Constructor."""
        # A dict which maps symbol IDs to their represented Python objects, empty shells, and data objects. See the
        # "Symbol cache" section for specifics.
        self._cache: MutableMapping[SymbolId, MutableMapping[str, Any]] = defaultdict(dict)
        # The snapshot ID which should be embedded in all symbol IDs created in the next call to `take_snapshot()`.
        self._next_snapshot_id: SnapshotId = 0

    # ==================================================================================================================
    # Symbol cache.
    # -------------
    # The `VisualizationEngine` cache is of the form {symbol_id -> {key -> value}}. Each `symbol_id` is mapped to a dict
    # of stored information, the keys for which are defined below.
    # ==================================================================================================================

    # Key for this symbol's Python object pointer, so that the object can manipulated and indexed when requested and
    # will not be garbage collected.
    OBJ: ClassVar[str] = 'obj'

    # Key for this symbol's completed data object, so that it does not need to be recomputed each time it is
    # requested. Since symbol IDs now represent snapshots at a single moment in time, there is no risk that the
    # underlying object has been changed after cachcing and might need a new data object.
    DATA: ClassVar[str] = 'data'

    # Key for a set of symbol ID strings which includes exactly those symbol IDs that appear in the symbol's data
    # object.
    REFS: ClassVar[str] = 'refs'

    # Key for the symbol's empty shell, a dict which includes the symbol's name, type, and string representation.
    SHELL: ClassVar[str] = 'shell'

    # ==================================================================================================================
    # Utility functions for public methods.
    # ==================================================================================================================

    def _cache_slice(self,
                     obj: Any,
                     name: Optional[str],
                     snapshot_id: SnapshotId) -> SymbolId:
        """Creates and caches empty shells and data objects for `obj`, every object referenced by `obj`, every object
        referenced by those objects, and so on until no new objects can be added.

        Will not cache builtins, as this leads to a seemingly never-ending execution time. Since builtins cannot
        change, it is fine to generate data objects for them at the time they are requested in `get_snapshot_slice()`.

        Args:
            obj: Any Python object whose visualization info should be cached.
            name: A name assigned to `obj` in the Python namespace, if one exists.
            snapshot_id: The snapshot ID which will be used to create symbol IDs for `obj` and all its references.

        Returns:
            The symbol ID for `obj`.
        """
        to_cache: MutableSequence[Any] = [obj]
        added: MutableSet[SymbolId] = set()
        while len(to_cache) > 0:
            cache_obj: Any = to_cache.pop()
            symbol_id: SymbolId = _get_symbol_id(cache_obj, snapshot_id)
            added.add(symbol_id)
            self._cache[symbol_id][self.OBJ] = cache_obj

            symbol_type_info: _VisualizationType = _get_type_info(cache_obj)
            self._cache[symbol_id][self.SHELL]: SymbolShell = SymbolShell(
                type=symbol_type_info.type_name,
                str=symbol_type_info.str_fn(cache_obj),
                name=name,
                data=None,
                attributes=None
            )
            # Ensure that only the original object receives the given name
            name: None = None

            data, refs = symbol_type_info.data_fn(cache_obj, snapshot_id)
            if not symbol_type_info == _OBJECT or not data['builtin'] or id(obj) == id(cache_obj):
                self._cache[symbol_id][self.DATA]: SymbolData = data
                self._cache[symbol_id][self.REFS]: Set[SymbolId] = set(refs.keys())
                for referenced_symbol_id, referenced_obj in refs.items():
                    if referenced_symbol_id not in added:
                        to_cache.append(referenced_obj)

        return _get_symbol_id(obj, snapshot_id)

    # ==================================================================================================================
    # Public functions.
    # -----------------
    # Functions which create and return visualization-ready content about objects in the Python program. First,
    # a user calls `take_snapshot()`, creating a "snapshot" of a Python object's state at the time of calling. The
    # caller is given a symbol ID, which can then be passed at any time to `get_snapshot_slice()`. This will return a
    # filled shell representing the state of the Python object at the time the snapshot was taken, as well as empty
    # shells and symbol IDs for every Python object it referenced. Any symbol ID returned by `get_snapshot_slice()`
    # can be passed again to `get_snapshot_slice()`, surfacing the state of other objects when the snapshot was taken.
    # ==================================================================================================================

    def take_snapshot(self,
                      obj: Any,
                      name: Optional[str]=None) -> SymbolId:
        """Creates a filled shell describing `obj` and every object that it directly or indirectly references in
        their current states.

        The returned symbol ID can be passed to `get_snapshot_slice()` to return this filled shell, as well as
        provide other symbol IDs that can be passed to `get_snapshot_slice()`.

        Args:
            obj: Any Python object.
            name: The name assigned to `obj` in the current namespace, or `None` if it is not
                referenced in the namespace.

        Returns:
            The symbol ID of `obj` at the current point in the program's execution.
        """
        self._next_snapshot_id += 1
        return self._cache_slice(obj, name, self._next_snapshot_id)

    def get_snapshot_slice(self,
                           symbol_id: SymbolId) -> SymbolSlice:
        """Returns a filled shell for the symbol with ID `symbol_id`, as well as the empty shells and symbol IDs of
        every symbol referenced in the shell's data object.

        This function does not create any new information (except for builtins; see `_cache_slice()`); instead,
        it reads information that was cached in a previous call to `take_snapshot()`.

        Args:
            symbol_id: The symbol ID of an object, as returned by `take_snapshot()` or surfaced in a previous
                call to `get_snapshot_slice()`.

        Returns:
            A mapping of symbol IDs to shells; the shell for `symbol_id` will be filled, while all others
                will be empty.
        """
        symbol_slice: SymbolSlice = {
            symbol_id: copy(self._cache[symbol_id][self.SHELL])
        }
        if self.DATA not in self._cache[symbol_id]:
            # the object was a builtin, so no data was generated in `take_snapshot()`
            self._cache_slice(self._cache[symbol_id][self.OBJ], None, _get_snapshot_id(symbol_id))

        symbol_slice[symbol_id].data = self._cache[symbol_id][self.DATA]

        for referenced_symbol_id in self._cache[symbol_id][self.REFS]:
            if referenced_symbol_id != symbol_id:
                symbol_slice[referenced_symbol_id]: SymbolShell = copy(self._cache[referenced_symbol_id][self.SHELL])
        return symbol_slice
