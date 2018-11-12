from copy import copy
from typing import List, MutableMapping, Union, Any, Optional, MutableSequence, MutableSet

from xn.constants import VizSpec, VizModel, VizId, ExpansionState, SnapshotId, JsonType, VizTableSlice, VizContents
from xn.viz import _Viz, _get_viz


# TODO: docs
# TODO: types
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
                     default_view: ExpansionState):
            self.viz_spec: VizSpec = viz_spec
            self.full_viz_model: VizModel = full_viz_model
            self.compact_viz_model: VizModel = compact_viz_model
            self.full_viz_refs: List[VizId] = full_viz_refs
            # must be subset of full refs
            self.compact_viz_refs: List[VizId] = compact_viz_refs
            self.default_view: ExpansionState = default_view

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
            full_viz.contents: VizContents = VisualizationEngine._replace_viz_with_viz_ids(
                full_viz.contents,
                snapshot_id
            )
            compact_viz, compact_refs = viz_obj.compile_compact()
            compact_viz.contents: VizContents = VisualizationEngine._replace_viz_with_viz_ids(
                compact_viz.contents,
                snapshot_id
            )
            summary_viz = viz_obj.compile_summary()
            summary_viz.contents: VizContents = VisualizationEngine._replace_viz_with_viz_ids(
                summary_viz.contents,
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
                viz_obj.default_expansion_state,
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
                           viz_id: VizId,
                           view_mode: Optional[ExpansionState]=None) -> VizTableSlice:
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
        viz_slice: VizTableSlice = dict()
        to_add: MutableSequence[(VizId, ExpansionState, Optional[ExpansionState])] = [(viz_id, ExpansionState.DEFAULT,
                                                                                       view_mode)]
        while len(to_add) > 0:
            viz_id, parent_view_mode, force_view_mode = to_add.pop()
            if viz_id in viz_slice:
                continue
            viz_slice[viz_id] = copy(self._cache[viz_id].viz_spec)
            view_mode: ExpansionState = (force_view_mode if force_view_mode is not None
                                   else self._cache[viz_id].default_view
                                   if self._cache[viz_id].default_view != ExpansionState.DEFAULT
                                   else ExpansionState.FULL if parent_view_mode == ExpansionState.DEFAULT
                                   else ExpansionState.COMPACT if parent_view_mode == ExpansionState.FULL
                                   else ExpansionState.SUMMARY)

            if view_mode == ExpansionState.COMPACT:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                to_add += [(viz_id, view_mode, None) for viz_id in self._cache[viz_id].compact_viz_refs]
            if view_mode == ExpansionState.FULL:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                viz_slice[viz_id].fullModel = self._cache[viz_id].full_viz_model
                to_add += [(viz_id, view_mode, None) for viz_id in self._cache[viz_id].full_viz_refs]
        return viz_slice