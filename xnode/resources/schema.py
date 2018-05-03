import json
import types
import inspect

# TODO clean all this up; it's just copy-pasted from viz/engine.py

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
        refs = dict()
        return {
            self.VIEWER_KEY: {
                'contents': obj,
            },
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs),
        }, refs

    def _generate_data_dict(self, obj):
        """Data generation function for dicts."""
        contents = dict()
        refs = dict()
        for key, value in obj.items():
            contents[self._sanitize_for_data_object(key, refs)] = self._sanitize_for_data_object(value, refs)
        return {
            self.VIEWER_KEY: {
                'contents': contents,
                'length': len(obj),
            },
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs),
        }, refs

    def _generate_data_sequence(self, obj):
        """Data generation function for sequential objects (list, tuple, set)."""
        contents = list()
        refs = dict()
        for item in obj:
            contents.append(self._sanitize_for_data_object(item, refs))
        return {
            self.VIEWER_KEY: {
                'contents': contents,
                'length': len(obj),
            },
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs),
        }, refs

    def _generate_data_function(self, obj):
        """Data generation function for functions."""
        refs = dict()
        viewer_data = {
            'filename': self._sanitize_for_data_object(obj.__code__.co_filename, refs),
            'lineno': self._sanitize_for_data_object(obj.__code__.co_firstlineno, refs),
        }
        argnames = obj.__code__.co_varnames
        default_arg_values = obj.__defaults__
        viewer_data['args'] = argnames[:-len(default_arg_values)]
        viewer_data['kwargs'] = {
            self._sanitize_for_data_object(argname, refs): self._sanitize_for_data_object(value, refs)
            for argname, value in zip(argnames[-len(default_arg_values)], default_arg_values)
            }
        return {
            self.VIEWER_KEY: viewer_data,
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs)
        }, refs

    def _generate_data_module(self, obj):
        """Data generation function for modules."""
        refs = dict()
        contents = self._get_data_object_attributes(obj, refs, exclude_fns=False)
        return {
            self.VIEWER_KEY: {
                'contents': contents,
            },
            self.ATTRIBUTES_KEY: contents,
        }, refs

    def _generate_data_class(self, obj):
        """Data generation function for classes."""
        contents = {
            'staticfields': dict(),
            'functions': dict(),
        }
        refs = dict()
        for attr in dir(obj):
            value = getattr(obj, attr)
            if self.FUNCTION.test_fn(value):
                contents['functions'][self._sanitize_for_data_object(attr, refs)] = \
                    self._sanitize_for_data_object(value, refs)
            else:
                contents['staticfields'][self._sanitize_for_data_object(attr, refs)] = \
                    self._sanitize_for_data_object(value, refs)
        return {
            self.VIEWER_KEY: {
                'contents': contents,
            },
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs, exclude_fns=False)
        }, refs

    def _generate_data_instance(self, obj):
        """Data generation function for object instances which do not fall into other categories."""
        instance_class = type(obj)
        instance_class_attrs = dir(instance_class)
        contents = dict()
        refs = dict()
        for attr in dir(obj):
            value = getattr(obj, attr)
            if not self.FUNCTION.test_fn(value) and (
                            attr not in instance_class_attrs or getattr(instance_class, attr, None) != value):
                contents[self._sanitize_for_data_object(attr, refs)] = \
                    self._sanitize_for_data_object(getattr(obj, attr), refs)
        return {
            self.VIEWER_KEY: {
                'contents': contents,
            },
            self.ATTRIBUTES_KEY: self._get_data_object_attributes(obj, refs)
        }, refs

    # `VisualizationType` objects.
    # ----------------------------
    NUMBER   = VisualizationType('number', test_fn=lambda obj: issubclass(type(obj), (float, int)),
                                 data_fn=_generate_data_primitive, is_primitive=True)
    STRING   = VisualizationType('string', test_fn=lambda obj: issubclass(type(obj), str),
                                 data_fn=_generate_data_primitive, is_primitive=True)
    BOOL     = VisualizationType('bool', test_fn=lambda obj: issubclass(type(obj), bool),
                                 data_fn=_generate_data_primitive, is_primitive=True)
    DICT     = VisualizationType('dict', test_fn=lambda obj: issubclass(type(obj), dict),
                                 data_fn=_generate_data_dict)
    LIST     = VisualizationType('list', test_fn=lambda obj: issubclass(type(obj), list),
                                 data_fn=_generate_data_sequence)
    SET      = VisualizationType('set', test_fn=lambda obj: issubclass(type(obj), set),
                                 data_fn=_generate_data_sequence)
    TUPLE    = VisualizationType('tuple', test_fn=lambda obj: issubclass(type(obj), tuple),
                                 data_fn=_generate_data_sequence)
    FUNCTION = VisualizationType('fn', test_fn=lambda obj: type(obj) in (types.FunctionType, types.MethodType,
                                                                         types.BuiltinFunctionType,
                                                                         types.BuiltinFunctionType,
                                                                         type(all.__call__)),
                                 data_fn=_generate_data_function)
    MODULE   = VisualizationType('module', test_fn=inspect.ismodule,
                                 data_fn=_generate_data_module)
    CLASS    = VisualizationType('class', test_fn=inspect.isclass,
                                 data_fn=_generate_data_class)
    INSTANCE = VisualizationType('obj', test_fn=lambda obj: True,
                                 data_fn=_generate_data_instance)

    # A list of all `VisualizationType` objects, in the order in which type should be tested. For example, the
    # INSTANCE should be last, as it returns `True` on any object and is the most general type. `BOOL` should be
    # before `NUMBER`, as bool is a subclass of number.
    TYPES = [BOOL, NUMBER, STRING, DICT, LIST, SET, TUPLE, FUNCTION, MODULE, CLASS, INSTANCE]

    # Utility functions for data generation.
    # --------------------------------------

    def _get_data_object_attributes(self, obj, refs, exclude_fns=True):
        """Creates the dict containing a symbol's attributes to be sent in the symbol's data object.

        Each symbol is a single Python object, which has attributes beyond those used for visualization.
        For completeness, the debugger surfaces these key-value pairs of these attributes. Those
        pairs are generated here and escaped for safe communication with the client.

        Args:
            obj (object): Python object whose attributes dict should be generated.
            refs (set): A set to save new symbol ID reference strings created during generation.
            exclude_fns (bool): Exclude functions (both instance and static) if `True`.

        Returns:

        """
        attributes = dict()
        for attr in dir(obj):
            if exclude_fns and self.FUNCTION.test_fn(getattr(obj, attr)): continue
            attributes[self._sanitize_for_data_object(attr, refs)] = self._sanitize_for_data_object(getattr(obj, attr), refs)
        return attributes

    def _is_primitive(self, obj):
        """Returns `True` if `obj` is primitive, as defined by the engine's `VisualizationType` objects."""
        for type_info in self.TYPES:
            if type_info.test_fn(obj):
                return type_info.is_primitive
        return False

    def _escape_str(self, s):
        # TODO: We need to have a system for escaping strings, to ensure that strings starting with REF_PREFIX are not
        # considered references mistakenly.
        """Reformats a string to eliminate ambiguity between strings and symbol ID references."""
        return s

    def _sanitize_for_data_object(self, key_or_value, refs):
        """Takes in a Python object and returns a version which is safe to use in a data object.

        _sanitize_for_data_object translates any key or value which needs to be in a symbol's data object into a JSON-safe version.
        Everything put into a symbol's data object must be data-fied first. For primitives, this does nothing but
        escapes strings so that they are not confused with symbol references. For non-primitive objects, a symbol ID
        reference string which refers to the input object is returned.

        Non-primitive objects are added to the cache, so that the returned symbol ID is associated with that object
        for future use.

        Args:
            key_or_value (object): An object to make safe for inclusion in the data object.
            refs (dict): A set to save new symbol ID reference strings created during generation.

        Returns:
            (str or int or float): Serializable-safe representation of obj, possibly as a symbol ID reference.
        """
        if self._is_primitive(key_or_value):
            return self._escape_str(key_or_value) if self.STRING.test_fn(key_or_value) else key_or_value
        else:
            symbol_id = self._get_symbol_id(key_or_value)
            refs[symbol_id] = key_or_value
            return self.REF_PREFIX + symbol_id

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

    # Key for a symbol data object's viewer dict (key-value pairs used by data viewers to render the object).
    # This dict follows the schema outlined in VIZ-SCHEMA.js.
    VIEWER_KEY = 'viewer'

    # Key for a symbol data object's attributes dict (key-value pairs to show in client's variable list. These
    # attributes often encompass more information than will be displayed in a viewer.
    # This dict follows the schema outlined in VIZ-SCHEMA.js.
    ATTRIBUTES_KEY = 'attributes'

    # ==================================================================================================================
    # Utility functions for public methods.
    # ==================================================================================================================

    def _get_symbol_id(self, obj):
        """Returns the symbol ID (a string unique for the object's lifetime) of a given object.

        As currently implemented, IDs are only guaranteed to be unique within a single snapshot of the namespace. At the
        next breakpoint, an object may have died and a new object reclaimed the ID (really implemented as just a base
        memory address).

        Args:
            obj (object): A Python object to be identified.

        Returns:
            (str): symbol ID.
        """
        return str(id(obj))

    def _get_type_info(self, obj):
        for type_info in self.TYPES:
            if type_info.test_fn(obj):
                return type_info

    def _load_symbol_data(self, obj):
        symbol_type_info = self._get_type_info(obj)
        data, refs = symbol_type_info.data_fn(self, obj)
        refs[self._get_symbol_id(obj)] = obj
        return data, refs

    # ==================================================================================================================
    # Public functions.
    # -----------------
    # The functions which generate visualization-ready content about objects in the Python program. Typically,
    # a user will first acquire the "shell" of a symbol, its lightweight representation that encapsulates its basic
    # properties. If interested in visualizing the symbol fully, the user will then request its data, a dictionary
    # which exposes more data-heavy properties of the object needed for visualization, as well as debugging-useful
    # attributes of the Python object itself.
    # ==================================================================================================================

    def get_schema(self, obj):
        data, refs = self._load_symbol_data(obj)
        shells = {ref_id: self.get_symbol_shell(ref) for ref_id, ref in refs.items()}
        return self.to_json({'data': data, 'shells': shells}), refs

    def get_symbol_shell(self, obj):
        symbol_type_info = self._get_type_info(obj)
        return {
            'type': symbol_type_info.type_name,
            'str': symbol_type_info.str_fn(obj),
            'name': None,
            'data': None,
        }

    def get_symbol_data(self, obj):
        return self._load_symbol_data(obj)

    def to_json(self, obj):
        """Converts a visualization dict to its corresponding JSON string.

        `obj` can be any output of the engine's exposed calls -- in particular, it can be either a symbol's shell or a
        symbol's data object. There is currently no difference in behavior, but for some more complex types (like
        Tensors) it may be required.

        See comment on generate for explanation of decomposition. to_json is a method of `VisualizationEngine` so that
        it can exploit the internal cache for object referencing if need be, as well as understand the engine's
        string escaping protocol. It should be called on the same engine where the dict was created.

        Args:
            obj (object): A Python object output by the `VisualizationEngine`.

        Returns:
            (str): The JSON representation of the input object.
        """
        return json.dumps(obj)
