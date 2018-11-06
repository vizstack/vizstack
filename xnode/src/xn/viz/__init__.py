from typing import Union, Sequence, Any, Mapping, Iterable, List, Dict, ClassVar, Optional, MutableSequence, \
    MutableSet, MutableMapping, NewType
from enum import Enum
from copy import copy
from xn.constants import VizId, VizModel, SnapshotId, JsonType, VizSpec, VizTableSlice

# TODO: potentially use these remnants of the old viz engine
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


class Color(Enum):
    PRIMARY = 1
    SECONDARY = 2
    BACKGROUND = 3


class ViewMode(Enum):
    # No specified view, use Xnode defaults
    NONE = 0
    FULL = 1
    COMPACT = 2
    SUMMARY = 3


# TODO: maybe move this to a different module, so there's a module of just the Viz objects?
class VisualizationEngine:
    """A stateful object which creates symbol shells for Python objects, which can be used by clients to render
    visualizations."""

    class _CacheEntry:
        def __init__(self,
                     viz_spec: VizSpec,
                     full_viz_model: VizModel,
                     compact_viz_model: VizModel,
                     full_viz_refs: List[VizId],
                     compact_viz_refs: List[VizId],
                     default_view: ViewMode):
            self.viz_spec: VizSpec = viz_spec
            self.full_viz_model: VizModel = full_viz_model
            self.compact_viz_model: VizModel = compact_viz_model
            self.full_viz_refs: List[VizId] = full_viz_refs
            # must be subset of full refs
            self.compact_viz_refs: List[VizId] = compact_viz_refs
            self.default_view: ViewMode = default_view

    def __init__(self) -> None:
        """Constructor."""
        # A dict which maps symbol IDs to their represented Python objects, empty shells, and data objects. See the
        # "Symbol cache" section for specifics.
        self._cache: MutableMapping[VizId, VisualizationEngine._CacheEntry] = dict()
        # The snapshot ID which should be embedded in all symbol IDs created in the next call to `take_snapshot()`.
        self._next_snapshot_id: SnapshotId = SnapshotId(0)

    @staticmethod
    def _get_viz_id(obj: '_Viz',
                    snapshot_id: SnapshotId) -> VizId:
        return VizId('@id:{}!{}!'.format(str(id(obj)), snapshot_id))

    @staticmethod
    def _replace_viz_with_viz_ids(o: Union[JsonType, '_Viz'],
                                  snapshot_id: SnapshotId) -> Union[JsonType, VizId]:
        if isinstance(o, dict):
            return {
                key: VisualizationEngine._replace_viz_with_viz_ids(value, snapshot_id) for key, value in o.items()
            }
        elif isinstance(o, list):
            return [VisualizationEngine._replace_viz_with_viz_ids(elem, snapshot_id) for elem in o]
        elif isinstance(o, _Viz):
            return VisualizationEngine._get_viz_id(o, snapshot_id)
        else:
            return o

    # ==================================================================================================================
    # Utility functions for public methods.
    # ==================================================================================================================

    def _cache_slice(self,
                     obj: Any,
                     file_path: str,
                     line_number: int,
                     snapshot_id: SnapshotId) -> VizId:
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
        obj_viz_id: Optional[VizId] = None
        to_cache: MutableSequence[_Viz] = [_get_viz(obj)]
        added: MutableSet[VizId] = set()
        while len(to_cache) > 0:
            viz_obj: _Viz = to_cache.pop()
            viz_id: VizId = VisualizationEngine._get_viz_id(viz_obj, snapshot_id)
            if obj_viz_id is None:
                obj_viz_id: VizId = viz_id
            added.add(viz_id)
            full_viz, full_refs = viz_obj.compile_full()
            full_viz['contents']: VizModel = VisualizationEngine._replace_viz_with_viz_ids(
                full_viz['contents'],
                snapshot_id
            )
            compact_viz, compact_refs = viz_obj.compile_compact()
            compact_viz['contents']: VizModel = VisualizationEngine._replace_viz_with_viz_ids(
                compact_viz['contents'],
                snapshot_id
            )
            summary_viz = viz_obj.compile_summary()
            summary_viz['contents']: VizModel = VisualizationEngine._replace_viz_with_viz_ids(
                summary_viz['contents'],
                snapshot_id
            )
            self._cache[viz_id]: VisualizationEngine._CacheEntry = VisualizationEngine._CacheEntry(
                VizSpec(
                    file_path,
                    line_number,
                    summary_viz,
                    None,
                    None
                ),
                full_viz,
                compact_viz,
                [VisualizationEngine._get_viz_id(ref, snapshot_id) for ref in full_refs],
                [VisualizationEngine._get_viz_id(ref, snapshot_id) for ref in compact_refs],
                viz_obj.default_view,
            )
            to_cache += full_refs
        return obj_viz_id

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
                      file_path: str,
                      line_number: int,
                      name: Optional[str]=None) -> VizId:
        # TODO: use or remove name
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
        return self._cache_slice(obj, file_path, line_number, self._next_snapshot_id)

    def get_snapshot_slice(self,
                           viz_id: VizId) -> VizTableSlice:
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
        # TODO: add mode argument to determine what should be retrieved
        viz_slice: VizTableSlice = dict()
        to_add: MutableSequence[(VizId, ViewMode)] = [(viz_id, ViewMode.NONE)]
        while len(to_add) > 0:
            viz_id, parent_view_mode = to_add.pop()
            if viz_id in viz_slice:
                continue
            viz_slice[viz_id] = copy(self._cache[viz_id].viz_spec)
            view_mode: ViewMode = (self._cache[viz_id].default_view
                                   if self._cache[viz_id].default_view != ViewMode.NONE
                                   else ViewMode.FULL if parent_view_mode == ViewMode.NONE
                                   else ViewMode.COMPACT if parent_view_mode == ViewMode.FULL
                                   else ViewMode.SUMMARY)

            if view_mode == ViewMode.COMPACT:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                to_add += [(viz_id, view_mode) for viz_id in self._cache[viz_id].compact_viz_refs]
            if view_mode == ViewMode.FULL:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                viz_slice[viz_id].fullModel = self._cache[viz_id].full_viz_model
                to_add += [(viz_id, view_mode) for viz_id in self._cache[viz_id].full_viz_refs]
        return viz_slice


def _get_viz(o: Any) -> '_Viz':
    if isinstance(o, _Viz):
        return o
    if hasattr(o, 'xn'):
        return o.xn()
    elif isinstance(o, list):
        return SequenceLayout(o)
    else:
        # TODO: use a better generic viz
        return TokenPrimitive(o)


# TODO: use newtypes for viz models
class _Viz:
    FULL = 0
    COMPACT = 1
    SUMMARY = 2

    def __init__(self,
                 name: Optional[str],
                 default_view: ViewMode):
        self._name = name
        self.default_view = default_view

    def compile_full(self) -> (VizModel, Iterable['_Viz']):
        raise NotImplementedError

    def compile_compact(self) -> (VizModel, Iterable['_Viz']):
        raise NotImplementedError

    def compile_summary(self) -> VizModel:
        return TokenPrimitive(str(self) if self._name is None else self._name).compile_summary()

    def __str__(self) -> str:
        raise NotImplementedError


class TokenPrimitive(_Viz):
    def __init__(self,
                 val: Any,
                 color: Color = Color.PRIMARY,
                 name: Optional[str]=None,
                 default_view: ViewMode=ViewMode.NONE) -> None:
        super(TokenPrimitive, self).__init__(name, default_view)
        # TODO: smarter strings
        self._text: str = str(val)
        self._color: Color = color

    def compile_full(self) -> (VizModel, Iterable[_Viz]):
        return {
           'type': 'TokenPrimitive',
           'contents': {
               'text': self._text
           }
        }, []

    def compile_compact(self) -> (VizModel, Iterable[_Viz]):
        return {
            'type': 'TokenPrimitive',
            'contents': {
                'text': self._text
            }
        }, []

    def compile_summary(self) -> VizModel:
        return {
            'type': 'TokenPrimitive',
            'contents': {
                'text': self._text
            }
        }

    def __str__(self) -> str:
        return self._text


class SequenceLayout(_Viz):
    COMPACT_LEN = 2

    def __init__(self,
                 elements: Sequence[Any],
                 orientation: str="horizontal",
                 name: Optional[str]=None,
                 default_view: ViewMode=ViewMode.NONE) -> None:
        super(SequenceLayout, self).__init__(name, default_view)
        self._orientation: str = orientation
        self._elements: Sequence[_Viz] = [_get_viz(elem) for elem in elements]

    def compile_full(self) -> (VizModel, Iterable[_Viz]):
        return {
            'type': 'SequenceLayout',
            'contents': {
                'orientation': self._orientation,
                'elements': self._elements
            }
        }, self._elements

    def compile_compact(self) -> (VizModel, Iterable[_Viz]):
        return {
            'type': 'SequenceLayout',
            'contents': {
                'orientation': self._orientation,
                'elements': self._elements[:SequenceLayout.COMPACT_LEN]
            }
        }, self._elements[:SequenceLayout.COMPACT_LEN]

    def __str__(self) -> str:
        return 'seq[{}]'.format(len(self._elements))


class KeyValueLayout(_Viz):
    COMPACT_LEN = 3

    def __init__(self,
                 key_value_mapping: Mapping[Any, Any],
                 name: Optional[str]=None,
                 default_view: ViewMode=ViewMode.NONE) -> None:
        super(KeyValueLayout, self).__init__(name, default_view)
        self._key_value_mapping: Mapping[_Viz, _Viz] = {
            _get_viz(key): _get_viz(value) for key, value in key_value_mapping.items()
        }

    def compile_full(self) -> (VizModel, Iterable[_Viz]):
        return {
            'type': 'KeyValueLayout',
            'contents': {
                'elements': self._key_value_mapping
            }
        }, list(self._key_value_mapping.keys()) + list(self._key_value_mapping.values())

    def compile_compact(self) -> (VizModel, Iterable[_Viz]):
        items = self._key_value_mapping.items()[:KeyValueLayout.COMPACT_LEN]
        return {
            'type': 'KeyValueLayout',
            'contents': {
                'elements': {
                    key: value for key, value in items
                }
            }
        }, [key for key, _ in items] + [value for _, value in items]

    def __str__(self) -> str:
        return 'dict[{}]'.format(len(self._key_value_mapping))
