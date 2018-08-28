import json
from collections import defaultdict
import types
import inspect
from torch import _TensorBase
from graphtracker import GraphData, GraphContainer, GraphOp, get_graphdata, has_graphdata


class VisualizationType:
    """Encapsulates the visualization-relevant properties of a specific object type.

    The `VisualizationEngine` outputs data schemas for different types of objects (string, number, dict, etc). Each of
    these schemas is different, as different objects need to send different data. Rather than constructing each schema
    according to some monolithic switch condition, each object's unique properties/functions are encapsulated in a
    `VisualizationType` object. For instance,

        `BOOL = VisualizationType(type_name='bool', test_fn=lambda x: type(x) is bool, is_primitive=True)`

    encapsulates the unique properties/functions for the `boolean` type. This construction ultimately allows objects of
    different types to be treated in a generic manner in code.
    """
    def __init__(self, type_name, test_fn, data_fn, str_fn=str, is_primitive=False):
        """Constructor. Fields should not be changed after instantiation, and only one instance of a `VisualizationType`
        should exist for each object type.

        Args:
            type_name (str): The string name of the object type, as understood by the client.
            test_fn (fn): A function (obj) => bool, which returns true if `obj` is of the type handled by this
                `VisualizationType` instance.
            data_fn (fn): A function (`VisualizationEngine`, obj) => (object, set), which takes an engine
                (typically passed from within an engine as `self`) and a symbol object and creates the data object.
                Assumed that `test_fn(obj) == True`.
            str_fn (fn): A function (obj) => str, which translates the given symbol object to a human-readable string.
                Assumed that `test_fn(obj) == True`.
            is_primitive (bool): True if this `VisualizationType` is primitive.
        """
        self.type_name = type_name
        self.test_fn = test_fn
        self.data_fn = data_fn
        self.str_fn = str_fn
        self.is_primitive = is_primitive
        assert is_primitive or self.data_fn is not None, 'Non-primitive types must define a data_fn.'


class VisualizationEngine:
    """Encapsulates the translation of Python variable symbols into visualization schema. It is stateful, so it may
    implement caching in the future to improve performance.
    """
    def __init__(self):
        """Constructor. Initializes symbol cache to store and efficient serve generated data schemas and references.
        See "Symbol cache keys" section for more details.
        """
        self.cache = defaultdict(dict)

    # ==================================================================================================================
    # Symbol cache.
    # -------------
    # The `VisualizationEngine` cache is of the form {symbol_id -> {key -> value}}. Each `symbol_id` is mapped to a dict
    # of stored information, the keys for which are defined below.
    # ==================================================================================================================

    # Key for this symbol's Python object handle, so that the object can manipulated and indexed when requested and
    # will not be garbage collected.
    OBJ = 'obj'

    # ==================================================================================================================
    # Schema generation.
    # ------------------
    # Create the `VisualizationType` objects to represent each symbol type and write the logic which translates
    # Python objects into visualization schema dicts.
    # ==================================================================================================================

    # Data generation functions.
    # --------------------------
    # These type-specific functions generate the `data, refs` for a symbol object.

    def _generate_data_primitive(self, obj):
        """Data generation function for primitives."""
        refs = set()
        return {
            'contents': obj,
        }, refs

    def _generate_data_tensor(self, obj):
        """Data generation function for tensors."""
        refs = set()
        return {
            # This is deliberately not sanitized to prevent the lists from being turned into references.
            'contents': obj.cpu().numpy().tolist(),
            'size': list(obj.size()),
            'type': self.TENSOR_TYPES[obj.type()],
            'maxmag': obj.abs().max(),
        }, refs

    def _generate_data_graphdata(self, obj):
        """Data generation function for graph data nodes."""
        refs = set()
        # We consider both `GraphData` instances and objects which have associated `GraphData` instances to be
        # graphdata for schema purposes, so we need to figure out which one `obj` is
        try:
            graphdata_obj = get_graphdata(obj)
        except AttributeError:
            # TODO: check when this gets thrown, why, and if this is the appropriate response
            graphdata_obj = obj
        return {
            'creatorop':
                self._sanitize_for_data_object(graphdata_obj.creator_op, refs) if graphdata_obj.creator_op else None,
            'creatorpos': graphdata_obj.creator_pos,
            'kvpairs': {
                key: self._sanitize_for_data_object(value, refs)
                for key, value in graphdata_obj.get_visualization_dict().items()
            }
        }, refs

    def _generate_data_graphcontainer(self, obj):
        """Data generation function for graph containers."""
        refs = set()
        return {
            'contents': [self._sanitize_for_data_object(op, refs) for op in obj.contents],
            'container': self._sanitize_for_data_object(obj.container, refs) if obj.container else None,
            'temporalstep': obj.temporal_step,
            'height': obj.height,
            'functionname': obj.fn_name,
        }, refs

    def _generate_data_graphop(self, obj):
        """Data generation function for graph op nodes."""
        refs = set()
        d = {
            'function': self._sanitize_for_data_object(obj.fn, refs),
            'args': [[arg[0],
                      self._sanitize_for_data_object(arg[1], refs) if not isinstance(arg[1], list) else
                      [self._sanitize_for_data_object(arg_item, refs) for arg_item in arg[1]]] if len(arg) > 1 else
                     [self._sanitize_for_data_object(arg[0], refs)]
                     for arg in obj.args],
            'kwargs': [[arg[0],
                        self._sanitize_for_data_object(arg[1], refs) if not isinstance(arg[1], list) else
                        [self._sanitize_for_data_object(arg_item, refs) for arg_item in arg[1]]] if len(arg) > 1 else
                       [self._sanitize_for_data_object(arg[0], refs)]
                       for arg in obj.kwargs],
            'container': self._sanitize_for_data_object(obj.container, refs) if obj.container else None,
            'functionname': obj.fn_name,
            'outputs': [self._sanitize_for_data_object(output, refs) for output in obj.outputs],
        }
        return d, refs

    def _generate_data_dict(self, obj):
        """Data generation function for dicts."""
        contents = dict()
        refs = set()
        for key, value in obj.items():
            contents[self._sanitize_for_data_object(key, refs)] = self._sanitize_for_data_object(value, refs)
        return {
            'contents': contents,
            'length': len(obj),
        }, refs

    def _generate_data_sequence(self, obj):
        """Data generation function for sequential objects (list, tuple, set)."""
        contents = list()
        refs = set()
        for item in obj:
            contents.append(self._sanitize_for_data_object(item, refs))
        return {
            'contents': contents,
            'length': len(obj),
        }, refs

    def _generate_data_function(self, obj):
        """Data generation function for functions."""
        refs = set()
        viewer_data = {
            'filename': obj.__code__.co_filename,
            'lineno': obj.__code__.co_firstlineno,
        }
        argnames = obj.__code__.co_varnames
        default_arg_values = obj.__defaults__
        if default_arg_values is not None:
            viewer_data['args'] = argnames[:-len(default_arg_values)]
            viewer_data['kwargs'] = {
                argname: self._sanitize_for_data_object(value, refs)
                for argname, value in zip(argnames[-len(default_arg_values)], default_arg_values)
            }
        else:
            viewer_data['args'] = []
            viewer_data['kwargs'] = {}
        return viewer_data, refs

    def _generate_data_module(self, obj):
        """Data generation function for modules."""
        refs = set()
        contents = self._get_data_object_attributes(obj, refs, exclude_fns=False)
        return {
            'contents': contents,
        }, refs

    def _generate_data_class(self, obj):
        """Data generation function for classes."""
        contents = {
            'staticfields': dict(),
            'functions': dict(),
        }
        refs = set()
        for attr in dir(obj):
            try:
                value = getattr(obj, attr)
                if self.FUNCTION.test_fn(value):
                    contents['functions'][attr] = self._sanitize_for_data_object(value, refs)
                else:
                    contents['staticfields'][attr] = self._sanitize_for_data_object(value, refs)
            except AttributeError:
                continue
        return {
            'contents': contents,
        }, refs

    def _generate_data_instance(self, obj):
        """Data generation function for object instances which do not fall into other categories."""
        instance_class = type(obj)
        instance_class_attrs = dir(instance_class)
        contents = dict()
        refs = set()
        for attr in dir(obj):
            value = getattr(obj, attr)
            try:
                if not self.FUNCTION.test_fn(value) and (
                                attr not in instance_class_attrs or getattr(instance_class, attr, None) != value):
                    contents[attr] = self._sanitize_for_data_object(getattr(obj, attr), refs)
            except TypeError:
                contents[attr] = self._sanitize_for_data_object(getattr(obj, attr), refs)
        return {
            'contents': contents,
        }, refs

    # `VisualizationType` objects.
    # ----------------------------
    NUMBER = VisualizationType('number', test_fn=lambda obj: isinstance(obj, (float, int)),
                               data_fn=_generate_data_primitive, is_primitive=True)
    STRING = VisualizationType('string', test_fn=lambda obj: isinstance(obj, str),
                               data_fn=_generate_data_primitive,
                               str_fn=lambda obj: '"{}"'.format(obj),
                               is_primitive=True)
    BOOL = VisualizationType('bool', test_fn=lambda obj: isinstance(obj, bool),
                             data_fn=_generate_data_primitive, is_primitive=True)
    NONE = VisualizationType('none', test_fn=lambda obj: obj is None,
                             data_fn=_generate_data_primitive, is_primitive=True)
    TENSOR = VisualizationType('tensor', test_fn=lambda obj: isinstance(obj, _TensorBase),
                               str_fn=lambda obj: 'tensor <{}>{}'.format(VisualizationEngine.TENSOR_TYPES
                                                                         [obj.type()], list(obj.size())),
                               data_fn=_generate_data_tensor)
    GRAPH_DATA = VisualizationType('graphdata',
                                   test_fn=lambda obj: isinstance(obj, GraphData) or has_graphdata(obj),
                                   # Exclude 'graphdata' in `_get_type_info` to prevent infinite recursion
                                   str_fn=lambda obj: VisualizationEngine._get_type_info(obj, ['graphdata']).str_fn(obj),
                                   data_fn=_generate_data_graphdata)
    GRAPH_CONTAINER = VisualizationType('graphcontainer', test_fn=lambda obj: isinstance(obj, GraphContainer),
                                        str_fn=lambda obj: 'graphcontainer[{}]'.format(len(obj.contents)),
                                        data_fn=_generate_data_graphcontainer)
    GRAPH_OP = VisualizationType('graphop', test_fn=lambda obj: isinstance(obj, GraphOp),
                                 str_fn=lambda obj: 'graphop <{}>'.format(obj.fn_name),
                                 data_fn=_generate_data_graphop)
    DICT = VisualizationType('dict', test_fn=lambda obj: isinstance(obj, dict),
                             str_fn=lambda obj: 'dict[{}]'.format(len(obj)),
                             data_fn=_generate_data_dict)
    LIST = VisualizationType('list', test_fn=lambda obj: isinstance(obj, list),
                             str_fn=lambda obj: 'list[{}]'.format(len(obj)),
                             data_fn=_generate_data_sequence)
    SET = VisualizationType('set', test_fn=lambda obj: isinstance(obj, set),
                            str_fn=lambda obj: 'set[{}]'.format(len(obj)),
                            data_fn=_generate_data_sequence)
    TUPLE = VisualizationType('tuple', test_fn=lambda obj: isinstance(obj, tuple),
                              str_fn=lambda obj: 'tuple[{}]'.format(len(obj)),
                              data_fn=_generate_data_sequence)
    FUNCTION = VisualizationType('fn', test_fn=lambda obj: isinstance(obj, (types.FunctionType, types.MethodType,
                                                                            types.BuiltinFunctionType,
                                                                            types.BuiltinFunctionType,
                                                                            type(all.__call__))),
                                 str_fn=lambda obj: 'function {}{}'.format(obj.__name__, '()'
                                 if inspect.isbuiltin(obj) else str(inspect.signature(obj))),
                                 data_fn=_generate_data_function)
    MODULE = VisualizationType('module', test_fn=inspect.ismodule,
                               str_fn=lambda obj: 'module <{}>'.format(obj.__name__),
                               data_fn=_generate_data_module)
    CLASS = VisualizationType('class', test_fn=inspect.isclass,
                              str_fn=lambda obj: 'class <{}>'.format(obj.__name__),
                              data_fn=_generate_data_class)
    INSTANCE = VisualizationType('object', test_fn=lambda obj: True,
                                 # TODO: this is information leakage from `graphtracker`. When we likely refactor it,
                                 # clean this up as well.
                                 str_fn=lambda obj: 'object <{}>'.format(obj.__class__.__name__
                                                                  .replace('__XNODE_GENERATED__', '')),
                                 data_fn=_generate_data_instance)

    # A list of all `VisualizationType` objects, in the order in which type should be tested. For example, the
    # INSTANCE should be last, as it returns `True` on any object and is the most general type. `BOOL` should be
    # before `NUMBER`, as bool is a subclass of number. `GRAPH_DATA` should be first, as it can wrap any type and
    # will be mistaken for those types.
    TYPES = [GRAPH_DATA, GRAPH_CONTAINER, GRAPH_OP, NONE, BOOL, NUMBER, STRING, TENSOR, DICT, LIST, SET, TUPLE, MODULE,
             FUNCTION, CLASS, INSTANCE]

    # Utility functions for data generation.
    # --------------------------------------

    def _get_data_object_attributes(self, obj, refs, exclude_fns=True):
        """Creates the dict containing a symbol's attributes to be sent with the symbol's data object.

        Each symbol is a single Python object, which has attributes beyond those used for visualization.
        For completeness, the engine surfaces these key-value pairs of these attributes. Those pairs are generated
        here and escaped for safe communication with the client.

        Args:
            obj (object): Python object whose attributes dict should be generated.
            refs (set): A set to save new symbol ID reference strings created during generation.
            exclude_fns (bool): Exclude functions (both instance and static) if `True`.

        Returns:
            (dict): A mapping of attribute names to their values, escaped with symbol IDs where necessary.
        """
        attributes = dict()
        for attr in dir(obj):
            # There are some functions, like torch.Tensor.data, which exist just to throw errors. Testing these
            # fields will throw the errors. We should consume them and keep moving if so.
            try:
                if exclude_fns and self.FUNCTION.test_fn(getattr(obj, attr)):
                    continue
            except RuntimeError:
                continue
            attributes[attr] = self._sanitize_for_data_object(getattr(obj, attr), refs)
        return attributes

    def _sanitize_for_data_object(self, obj, refs):
        """Takes in a Python object and returns a string ID for it that is safe to send to clients.

        `_sanitize_for_data_object()` translates any key or value which needs to be in a symbol's data object into a
        reference ID string, which can be sent to the client along with a shell for the key or value. Only objects
        which should be "inspectable" as separate entities from their parent should be sanitized; for example,
        the contents of a sent list must all be sanitized, as each can be inspected, but the name of a `graphop`
        argument should not be sanitized, since it is not an object clients should be able to inspect.

        The newly generated reference ID is added to `refs`, to indicate that a shell of its Python object should
        be sent to the client.`obj` is to the local cache, so that the returned symbol ID is associated with that object
        for future use.

        Args:
            obj (object): An object to make safe for inclusion in the data object.
            refs (set): A set to save new symbol ID reference strings created during generation.

        Returns:
            (str): A symbol ID reference to `obj`.
        """
        symbol_id = self.get_symbol_id(obj)
        self.cache[symbol_id][self.OBJ] = obj
        refs.add(symbol_id)
        return symbol_id

    # Schema constants.
    # -----------------
    # Shared knowledge between the `VisualizationEngine`. These strings describe the fields in the data representation
    # that will be consumed by the front-end client. Any changes on either side will need to be reflected in the other.

    # Prefix to append to strings to identify them as symbol ID references. The `VisualizationEngine`
    # must communicate in a way the client can understand, but the Python -> JSON string conversion introduces
    # sources of potential confusion. It is not clear whether a string in a schema's 'data' field is a symbol ID
    # reference or an actual string object, so some escaping must be done to remove ambiguity.
    # TODO: Come up with a better system for this that can't be tricked
    REF_PREFIX = '@id:'

    # We convey the data type of a tensor in a generic way to remove dependency on the tensor's implementation. We
    # need a way to look up the Python object's type to get the data type string the client will understand.
    TENSOR_TYPES = {
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

    # ==================================================================================================================
    # Utility functions for public methods.
    # ==================================================================================================================

    @staticmethod
    def _get_type_info(obj, exclude_types=None):
        """Returns the `VisualizationType` object associated with a given object.

        Args:
            obj (object): An object of unknown visualization type.
            exclude_types (list or None): A list of visualization type names that may not be returned.

        Returns:
            (VisualizationType): the `VisualizationType` object associated with the object's type.
        """
        for type_info in VisualizationEngine.TYPES:
            if (exclude_types is None or type_info.type_name not in exclude_types) and type_info.test_fn(obj):
                return type_info

    # ==================================================================================================================
    # Public functions.
    # -----------------
    # The functions which generate visualization-ready content about objects in the Python program. Typically,
    # a user will first request the "id" of a symbol, its permanent unique identifier. Then, the user can request
    # the "shell" of a symbol, giving a lightweight representation of its basic properties. The information needed to
    # fully visualize a symbol can be returned as a "data object", a dict describing the finer details of the object.
    # ==================================================================================================================

    def get_symbol_id(self, obj):
        """Returns the symbol ID (a string unique for the object's lifetime) of a given object.

        Caches the object, so it will not be garbage collected until the `VisualizationEngine` is destroyed. Thus,
        the symbol ID remains unique until the engine itself dies.

        Args:
            obj (object): A Python object to be identified.

        Returns:
            (str): A unique symbol ID.
        """
        symbol_id = self.REF_PREFIX + str(id(obj))
        self.cache[symbol_id][self.OBJ] = obj
        return symbol_id

    def is_symbol_id(self, s):
        """Checks if a supplied object is a symbol ID string.

        Clients may need to know if an entry in a data object is a symbol ID; this method provides that information
        without requiring the client to know anything about the form of a symbol ID.

        Args:
            s (object): Any object.

        Returns:
            (bool): Whether `s` is a symbol ID string.
        """
        return isinstance(s, str) and s.startswith(self.REF_PREFIX)

    def get_symbol_shell(self, symbol_id, name=None):
        """Returns a lightweight representation of a given symbol's properties.

        Clients will need the symbol ID of the object, returned by `get_symbol_id()`, to request the symbol's shell;
        this ensures that the symbol's Python object has already been cached by the `VisualizationEngine`.

        Args:
            symbol_id (str): The symbol ID of the object for which a shell should be generated.
            name (str): An optional variable name that is associated with the object.

        Returns:
            (dict): The symbol's shell representation.
        """
        # requires get_symbol_id call
        symbol_obj = self.cache[symbol_id][self.OBJ]
        symbol_type_info = self._get_type_info(symbol_obj)
        return {
            'type':       symbol_type_info.type_name,
            'str':        symbol_type_info.str_fn(symbol_obj),
            'name':       name,
            'data':       None,
            'attributes': None
        }

    def get_symbol_data(self, symbol_id):
        """Returns a symbol's data object, its Python object attributes, and referenced shells, all ready for
        serialization.

        The data object encapsulates all potentially useful information for visualizing a symbol. For a dict, this would
        be its contents; for a class, this might be its static fields and functions. Regardless, the data object
        should be serializable, such that it can be sent to clients, who can decide how to process the given
        information.

        This function requires `get_symbol_id()` to have been called on the requested symbol.

        Args:
            symbol_id (str): The requested symbol's ID, as defined by `get_symbol_id()`.

        Returns:
            (dict): A serializable representation of the given symbol.
            (dict): A serializable mapping of attribute names to their values in the symbol's Python object.
            (dict): A dict mapping symbol IDs (particularly, those found in the data object and attributes) to shells.
        """
        symbol_obj = self.cache[symbol_id][self.OBJ]
        symbol_type_info = self._get_type_info(symbol_obj)

        data, refs = symbol_type_info.data_fn(self, symbol_obj)
        shells = dict()
        for ref in refs:
            shells[ref] = self.get_symbol_shell(ref)
        return data, self._get_data_object_attributes(symbol_obj, refs), shells


