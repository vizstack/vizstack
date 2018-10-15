import pytest
import torch
from typing import Any, Optional

import constants
import viz
from constants import SymbolId, SymbolShell, SnapshotId


def take_snapshot_and_get_schema(obj: Any,
                                 name: Optional[str]=None) -> SymbolShell:
    engine: viz.VisualizationEngine = viz.VisualizationEngine()
    symbol_id: SymbolId = engine.take_snapshot(obj, name=name)
    symbol_slice = engine.get_snapshot_slice(symbol_id)
    return symbol_slice[symbol_id]


@pytest.fixture(params=[
    (10, 'number'), (2**30, 'number'),
    (None, 'none'),
    (True, 'bool'), (False, 'bool'),
    ('Hello world!', 'string'),
    ([1, 2, 3], 'list'), ([{'Hello'}, {'Wor': 'ld'}], 'list'),  # list
    ({1, 2, 3}, 'set'), ({'Hello', 'World'}, 'set'),  # set
    ((1, 2, 3), 'tuple'), (('Hello', 'World'), 'tuple'),  # tuple
    ({1: 2, 3: 4}, 'dict'), ({'Hell': {'o': 'World'}}, 'dict'),  # dict
    # class TODO: __subclasshook__ can have a different symbol ID at different times
    (constants, 'module'),  # module
    # object TODO: seems to have similar problems to class
    (lambda x: x**2, 'fn'), (take_snapshot_and_get_schema, 'fn'),  # function
    (torch.ones(10, 10, 10), 'tensor'),  # tensor
])
def example_obj(request) -> (Any, str):
    return request.param


# TODO: should we make a separate, more hard-coded test fn for each type?
def test_snapshot_shell_should_match_schema(example_obj: (Any, str)):
    obj, type_name = example_obj
    viz_type: viz._VisualizationType = viz._get_type_info(obj)
    assert viz_type.type_name == type_name
    assert take_snapshot_and_get_schema(obj, 'test_name') == SymbolShell(
        viz_type.type_name,
        viz_type.str_fn(obj),
        'test_name',
        viz_type.data_fn(obj, SnapshotId(1))[0],
        None
    )
