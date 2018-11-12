from copy import copy
from typing import List, MutableMapping, Union, Any, Optional, MutableSequence, MutableSet

from xn.constants import VizSpec, VizModel, VizId, ExpansionState, SnapshotId, JsonType, VizTableSlice, VizContents
from xn.viz import _Viz, _get_viz


# TODO: do we need snapshot IDs anymore?

class VisualizationEngine:
    """A stateful object which creates VizTableSlices for Python objects."""

    class _CacheEntry:
        """
        The information that should be cached about each vizualization created by the VisualizationEngine.
        """
        def __init__(self,
                     viz_spec: VizSpec,
                     full_viz_model: VizModel,
                     compact_viz_model: VizModel,
                     full_viz_refs: List[VizId],
                     compact_viz_refs: List[VizId],
                     expansion_state: ExpansionState):
            """Constructor.

            Args:
                viz_spec: A VizSpec for the viz for which the full and compact models is None. It will be copied and
                    altered if the VizSpec is needed to create a VizTableSlice for the client.
                full_viz_model: The full VizModel.
                compact_viz_model: The compact VizModel.
                full_viz_refs: All VizIds referenced in the full viz model.
                compact_viz_refs: All VizIds referenced in the compact viz model.
                expansion_state: The default expansion state taken by this viz.
            """
            self.viz_spec: VizSpec = viz_spec
            self.full_viz_model: VizModel = full_viz_model
            self.compact_viz_model: VizModel = compact_viz_model
            self.full_viz_refs: List[VizId] = full_viz_refs
            # must be subset of full refs
            self.compact_viz_refs: List[VizId] = compact_viz_refs
            self.default_view: ExpansionState = expansion_state

    def __init__(self) -> None:
        """Constructor."""
        # Caches information needed to create VizTableSlices for any VizIds generated in `take_snapshot()`.
        self._cache: MutableMapping[VizId, VisualizationEngine._CacheEntry] = dict()
        # The SnapshotId which should be embedded in all VizIds created in the next call to `take_snapshot()`.
        self._next_snapshot_id: SnapshotId = SnapshotId(0)

    @staticmethod
    def _get_viz_id(obj: '_Viz',
                    snapshot_id: SnapshotId) -> VizId:
        """Gets the VizId for a particular _Viz object at a particular snapshot."""
        return VizId('@id:{}!{}!'.format(str(id(obj)), snapshot_id))

    @staticmethod
    def _replace_viz_with_viz_ids(o: Union[JsonType, '_Viz'],
                                  snapshot_id: SnapshotId) -> Union[JsonType, VizId]:
        """Recursively generates a version of `o` where all _Viz objects are replaced by their respective _VizIds.

        No changes are made to `o`.

        Args:
            o: An object which should be duplicated, with any _Vizzes, at any level of depth, in the duplicate
                replaced by VizIds.
            snapshot_id: The SnapshotId to use when generating VizIds.

        Returns:
            A duplicate of `o` with all _Vizzes replaced by their VizIds.
        """
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
        """Creates the Viz for `obj`, then generates a _CacheEntry for that Viz and every Viz it references.

        Args:
            obj: Any Python object whose visualization info should be cached.
            file_path: The file being executed at which `obj` is being visualized.
            line_number: The line number in `file_path` at which `obj` is being visualized.
            snapshot_id: The SnapshotId which will be used to create VizIds for `obj`.

        Returns:
            The VizId for `obj`.
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
    # caller is given a VizId, which can then be passed at any time to `get_snapshot_slice()`. This will return a
    # VizTableSlice which describes how to visualize the Python object at the time the snapshot was taken.
    # Any VizId in the VizTableSlice returned by `get_snapshot_slice()` can be passed again to `get_snapshot_slice()`,
    # surfacing other VizModels for the components of the visualization.
    # ==================================================================================================================

    def take_snapshot(self,
                      obj: Any,
                      file_path: str,
                      line_number: int) -> VizId:
        """Caches all information needed to visualize `obj` and returns a VizId which can be used to acquire it.

        The returned VizId can be passed to `get_snapshot_slice()` to return the cached VizTableSlice, as well as to
        acquire other VizModels for its components.

        Args:
            obj: Any Python object.
            file_path: The file being executed at which `obj` is being visualized.
            line_number: The line number in `file_path` at which `obj` is being visualized.

        Returns:
            The VizId of `obj` at the current point in the program's execution.
        """
        self._next_snapshot_id += 1
        return self._cache_slice(obj, file_path, line_number, self._next_snapshot_id)

    def get_snapshot_slice(self,
                           viz_id: VizId,
                           expansion_state: Optional[ExpansionState]=None) -> VizTableSlice:
        """Returns a VizTableSlice containing the VizModel for the given VizId in the given ExpansionState.

        This function does not create any new information; instead, it reads information that was cached in a
        previous call to `take_snapshot()`.

        Args:
            viz_id: The VizId of an object, as returned by `take_snapshot()` or surfaced in a previous
                call to `get_snapshot_slice()`.
            expansion_state: The VizModel which should be included in the VizSpec for `viz_id`, or `None` if the
                default (full) VizModel should be included.

        Returns:
            A VizTableSlice containing all of the information needed to visualize `viz_id` in the given expansion state.
        """
        viz_slice: VizTableSlice = dict()
        to_add: MutableSequence[(VizId, ExpansionState, Optional[ExpansionState])] = [(viz_id, ExpansionState.DEFAULT,
                                                                                       expansion_state)]
        while len(to_add) > 0:
            viz_id, parent_view_mode, force_view_mode = to_add.pop()
            if viz_id in viz_slice:
                continue
            viz_slice[viz_id] = copy(self._cache[viz_id].viz_spec)
            expansion_state: ExpansionState = (force_view_mode if force_view_mode is not None
                                   else self._cache[viz_id].default_view
                                   if self._cache[viz_id].default_view != ExpansionState.DEFAULT
                                   else ExpansionState.FULL if parent_view_mode == ExpansionState.DEFAULT
                                   else ExpansionState.COMPACT if parent_view_mode == ExpansionState.FULL
                                   else ExpansionState.SUMMARY)

            if expansion_state == ExpansionState.COMPACT:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                to_add += [(viz_id, expansion_state, None) for viz_id in self._cache[viz_id].compact_viz_refs]
            if expansion_state == ExpansionState.FULL:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                viz_slice[viz_id].fullModel = self._cache[viz_id].full_viz_model
                to_add += [(viz_id, expansion_state, None) for viz_id in self._cache[viz_id].full_viz_refs]
        return viz_slice
