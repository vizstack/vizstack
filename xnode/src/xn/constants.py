from typing import Union, NewType, MutableMapping, Mapping, Optional

# The Python equivalents of the values allowed in JSON
JsonType = Union[str, float, int, bool, None, list, dict]

# Strings which represent the unique identifier for a particular Python object at a particular point in execution
VizId = NewType('VizId', str)

# Integers which uniquely identify points in execution at which symbol IDs were created
SnapshotId = NewType('SnapshotId', int)

# A set of key-value pairs which describe all of the properties of a viz
VizModel = NewType('VizModel', MutableMapping[str, JsonType])


# The format of objects which describe a particular visualization and its metadata that are sent to clients. We use a
# pseudo-dataclass instead of a named tuple for mutability, and instead of a real dataclass to ensure compliance with
# Python 3.6.
class VizSpec:
    def __init__(self,
                 file_path: str,
                 line_number: int,
                 summary_viz_model: VizModel,
                 compact_viz_model: Optional[VizModel],
                 full_viz_model: Optional[VizModel]):
        self.filePath: str = file_path
        self.lineNumber: int = line_number
        self.summaryModel: VizModel = summary_viz_model
        self.compactModel: Optional[VizModel] = compact_viz_model
        self.fullModel: Optional[VizModel] = full_viz_model

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def __eq__(self, other):
        """Define two `VizSpec`s as equal if all of their fields are equal."""
        return isinstance(other, VizSpec) and \
            self.filePath == other.filePath and \
            self.lineNumber == other.lineNumber and \
            self.summaryModel == other.summaryModel and \
            self.compactModel == other.compactModel and \
            self.fullModel == other.fullModel


# A collection of `VizSpec`s mapped to their respective IDs.
VizSlice = NewType('VizSlice', MutableMapping[VizId, VizSpec])

# A description of an action that should be performed on a constructed viz slice before being sent to the client
Action = NewType('Action', JsonType)

# A mapping of action names to the descriptions of the requested behavior
Actions = NewType('Actions', Mapping[str, Action])
