"""
This file contains all of the logic needed to translate `Viz` objects into JSON strings that can be sent to renderers.
"""

from copy import copy
from typing import List, MutableMapping, Any, Optional, MutableSequence, MutableSet, Tuple, overload, Dict

from xnode.constants import VizSpec, VizModel, VizId, ExpansionMode, SnapshotId, VizTableSlice
from xnode.viz import Viz, get_viz

# TODO: do we need snapshot IDs anymore?


class VisualizationEngine:
    """A stateful object which creates VizTableSlices for Python objects."""

    class _CacheEntry:
        """
        The information that should be cached about each vizualization created by the VisualizationEngine.
        """

        def __init__(
                self, viz_spec: VizSpec, full_viz_model: VizModel, compact_viz_model: VizModel,
                full_viz_refs: List[VizId], compact_viz_refs: List[VizId],
                expansion_mode: ExpansionMode
        ) -> None:
            """Constructor.

            Args:
                viz_spec: A VizSpec for the viz for which the full and compact models is None. It will be copied and
                    altered if the VizSpec is needed to create a VizTableSlice for the client.
                full_viz_model: The full VizModel.
                compact_viz_model: The compact VizModel.
                full_viz_refs: All VizIds referenced in the full viz model.
                compact_viz_refs: All VizIds referenced in the compact viz model.
                expansion_mode: The default expansion state taken by this viz.
            """
            self.viz_spec: VizSpec = viz_spec
            self.full_viz_model: VizModel = full_viz_model
            self.compact_viz_model: VizModel = compact_viz_model
            self.full_viz_refs: List[VizId] = full_viz_refs
            # must be subset of full refs
            self.compact_viz_refs: List[VizId] = compact_viz_refs
            self.expansion_mode: ExpansionMode = expansion_mode

    def __init__(self) -> None:
        """Constructor."""
        # Caches information needed to create VizTableSlices for any VizIds generated in `take_snapshot()`.
        self._cache: MutableMapping[VizId, VisualizationEngine._CacheEntry] = dict()
        # The SnapshotId which should be embedded in all VizIds created in the next call to `take_snapshot()`.
        self._next_snapshot_id: SnapshotId = SnapshotId(0)

    @staticmethod
    def _get_viz_id(obj: 'Viz', snapshot_id: SnapshotId) -> VizId:
        """Gets the VizId for a particular Viz object at a particular snapshot."""
        return VizId('@id:{}!{}!'.format(str(id(obj)), snapshot_id))

    @staticmethod
    @overload
    def _replace_viz_with_viz_ids(o: 'Viz', snapshot_id: SnapshotId) -> VizId:
        ...

    @staticmethod
    @overload
    def _replace_viz_with_viz_ids(o: Dict[str, Any], snapshot_id: SnapshotId) -> Dict[str, Any]:
        ...

    @staticmethod
    @overload
    def _replace_viz_with_viz_ids(o: List[Any], snapshot_id: SnapshotId) -> List[Any]:
        ...

    @staticmethod
    def _replace_viz_with_viz_ids(o, snapshot_id):
        """Recursively generates a version of `o` where all Viz objects are replaced by their respective _VizIds.

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
                key: VisualizationEngine._replace_viz_with_viz_ids(value, snapshot_id)
                for key, value in o.items()
            }
        elif isinstance(o, list) or isinstance(o, tuple):
            return [VisualizationEngine._replace_viz_with_viz_ids(elem, snapshot_id) for elem in o]
        elif isinstance(o, Viz):
            return VisualizationEngine._get_viz_id(o, snapshot_id)
        else:
            return o

    # ==================================================================================================================
    # Utility functions for public methods.
    # ==================================================================================================================

    def _cache_slice(
            self, obj: Any, file_path: str, line_number: int, snapshot_id: SnapshotId
    ) -> VizId:
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
        to_cache: MutableSequence[Viz] = [get_viz(obj)]
        added: MutableSet[VizId] = set()
        while len(to_cache) > 0:
            viz_obj: Viz = to_cache.pop()
            viz_id: VizId = VisualizationEngine._get_viz_id(viz_obj, snapshot_id)
            if obj_viz_id is None:
                obj_viz_id = viz_id
            if viz_id in added:
                continue
            added.add(viz_id)
            full_viz, full_refs = viz_obj.compile_full()
            full_viz.contents = VisualizationEngine._replace_viz_with_viz_ids(
                full_viz.contents, snapshot_id
            )
            compact_viz, compact_refs = viz_obj.compile_compact()
            compact_viz.contents = VisualizationEngine._replace_viz_with_viz_ids(
                compact_viz.contents, snapshot_id
            )
            summary_viz = viz_obj.compile_summary()
            summary_viz.contents = VisualizationEngine._replace_viz_with_viz_ids(
                summary_viz.contents, snapshot_id
            )
            self._cache[viz_id] = VisualizationEngine._CacheEntry(
                VizSpec(file_path, line_number, summary_viz, None, None),
                full_viz,
                compact_viz,
                [VisualizationEngine._get_viz_id(ref, snapshot_id) for ref in full_refs],
                [VisualizationEngine._get_viz_id(ref, snapshot_id) for ref in compact_refs],
                viz_obj.default_expansion_mode,
            )
            to_cache += full_refs
            to_cache += compact_refs
        assert obj_viz_id is not None
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

    def take_snapshot(self, obj: Any, file_path: str, line_number: int) -> VizId:
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
        self._next_snapshot_id = SnapshotId(self._next_snapshot_id + 1)
        return self._cache_slice(obj, file_path, line_number, self._next_snapshot_id)

    def get_snapshot_slice(
            self, viz_id: VizId, expansion_mode: Optional[ExpansionMode] = None
    ) -> VizTableSlice:
        """Returns a VizTableSlice containing the VizModel for the given VizId in the given ExpansionMode.

        This function does not create any new information; instead, it reads information that was cached in a
        previous call to `take_snapshot()`.

        Args:
            viz_id: The VizId of an object, as returned by `take_snapshot()` or surfaced in a previous
                call to `get_snapshot_slice()`.
            expansion_mode: The VizModel which should be included in the VizSpec for `viz_id`, or `None` if the
                default (full) VizModel should be included.

        Returns:
            A VizTableSlice containing all of the information needed to visualize `viz_id` in the given expansion state.
        """
        viz_slice: VizTableSlice = VizTableSlice(dict())
        to_add: MutableSequence[Tuple[VizId, ExpansionMode, Optional[ExpansionMode]]] = [
            (viz_id, ExpansionMode.NONE, expansion_mode)
        ]
        while len(to_add) > 0:
            viz_id, parent_expansion_mode, force_expansion_mode = to_add.pop()
            if viz_id in viz_slice:
                continue
            viz_slice[viz_id] = copy(self._cache[viz_id].viz_spec)
            expansion_mode = (
                force_expansion_mode if force_expansion_mode is not None else self._cache[viz_id].expansion_mode
                if self._cache[viz_id].expansion_mode != ExpansionMode.NONE else ExpansionMode
                .FULL if parent_expansion_mode == ExpansionMode.NONE else ExpansionMode
                .COMPACT if parent_expansion_mode == ExpansionMode.FULL else ExpansionMode.SUMMARY
            )

            if expansion_mode == ExpansionMode.COMPACT or expansion_mode == ExpansionMode.FULL:
                viz_slice[viz_id].compactModel = self._cache[viz_id].compact_viz_model
                to_add += [
                    (viz_id, expansion_mode, None)
                    for viz_id in self._cache[viz_id].compact_viz_refs
                ]
            if expansion_mode == ExpansionMode.FULL:
                viz_slice[viz_id].fullModel = self._cache[viz_id].full_viz_model
                to_add += [
                    (viz_id, expansion_mode, None) for viz_id in self._cache[viz_id].full_viz_refs
                ]
        return viz_slice
