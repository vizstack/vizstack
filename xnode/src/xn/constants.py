from typing import Union, NewType, MutableMapping, Mapping, Optional

# The Python equivalents of the values allowed in JSON
JsonType = Union[str, float, int, bool, None, list, dict]

# Strings which represent the unique identifier for a particular Python object at a particular point in execution
VizId = NewType('VizId', str)

# Integers which uniquely identify points in execution at which symbol IDs were created
SnapshotId = NewType('SnapshotId', int)

# A set of key-value pairs which describe all of the properties of a viz
VizModel = NewType('VizModel', Mapping[str, JsonType])


# The format of objects which describe a particular visualization and its metadata that are sent to clients. We use a
# pseudo-dataclass instead of a named tuple for mutability, and instead of a real dataclass to ensure compliance with
# Python 3.6.
class VizEntry:
    def __init__(self,
                 file_name: str,
                 line_number: int,
                 compact_viz_model: VizModel,
                 full_viz_model: Optional[VizModel]):
        self.file_name: str = file_name
        self.line_number: int = line_number
        self.compact_viz_model: VizModel = compact_viz_model
        self.full_viz_model: Optional[VizModel] = full_viz_model

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def __eq__(self, other):
        """Define two `VizEntry`s as equal if all of their fields are equal."""
        return isinstance(other, VizEntry) and \
            self.file_name == other.file_name and \
            self.line_number == other.line_number and \
            self.compact_viz_model == other.compact_viz_model and \
            self.full_viz_model == other.full_viz_model


# A collection of `VizEntry`s mapped to their respective IDs.
VizSlice = NewType('VizSlice', MutableMapping[VizId, VizEntry])

# A description of an action that should be performed on a constructed viz slice before being sent to the client
Action = NewType('Action', JsonType)

# A mapping of action names to the descriptions of the requested behavior
Actions = NewType('Actions', Mapping[str, Action])
