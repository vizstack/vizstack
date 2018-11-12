from typing import Union, NewType, MutableMapping, Optional, Dict, Any
from enum import Enum

# The Python equivalents of the values allowed in JSON
JsonType = Union[str, float, int, bool, None, list, Dict[str, Any]]

# Strings which represent the unique identifier for a particular Python object at a particular point in execution
VizId = NewType('VizId', str)

# Integers which uniquely identify points in execution at which symbol IDs were created
SnapshotId = NewType('SnapshotId', int)


class _Dataclass:
    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def __eq__(self, other):
        """Define two `_Dataclass`s as equal if all of their member fields are equal."""
        return isinstance(other, type(self)) and vars(self) == vars(other)


VizContents = Dict[str, Any]


class VizModel(_Dataclass):
    def __init__(self,
                 type: str,
                 contents: VizContents) -> None:
        self.type: str = type
        self.contents: VizContents = contents


# The format of objects which describe a particular visualization and its metadata that are sent to clients. We use a
# pseudo-dataclass instead of a named tuple for mutability, and instead of a real dataclass to ensure compliance with
# Python 3.6.
class VizSpec(_Dataclass):
    def __init__(self,
                 file_path: str,
                 line_number: int,
                 summary_viz_model: VizModel,
                 compact_viz_model: Optional[VizModel],
                 full_viz_model: Optional[VizModel]) -> None:
        self.filePath: str = file_path
        self.lineNumber: int = line_number
        self.summaryModel: VizModel = summary_viz_model
        self.compactModel: Optional[VizModel] = compact_viz_model
        self.fullModel: Optional[VizModel] = full_viz_model


# A collection of `VizSpec`s mapped to their respective IDs.
VizTableSlice = NewType('VizTableSlice', MutableMapping[VizId, VizSpec])


# A message which should be sent to the client, describing a viz to render, a new VizTableSlice to store, and whether
# the client should clear all existing renders. We use a pseudo-dataclass instead of a named tuple for mutability,
# and instead of a real dataclass to ensure compliance with Python 3.6.
class ExecutionEngineMessage(_Dataclass):
    def __init__(self,
                 viewed_viz_id: Optional[VizId],
                 viz_table_slice: Optional[VizTableSlice],
                 should_refresh: bool) -> None:
        self.viewedVizId: Optional[VizId] = viewed_viz_id
        self.vizTableSlice: Optional[VizTableSlice] = viz_table_slice
        self.shouldRefresh: bool = should_refresh


# Identifies the summary, compact, and full models of a particular `VizSpec`.
class ExpansionState(Enum):
    # No specified view, use Xnode defaults
    DEFAULT = 0
    FULL = 1
    COMPACT = 2
    SUMMARY = 3
