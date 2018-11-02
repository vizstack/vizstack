from importlib import reload
import json

import xn
from xn.viz import TokenPrimitive, SequenceLayout


class _TokenTest:
    def __init__(self, data):
        self.data = data

    def xn(self):
        return TokenPrimitive(self.data)


class _SequenceTest:
    def __init__(self, data):
        self.data = data

    def xn(self):
        return SequenceLayout(self.data)

# TODO: use this to test viz engine
#
#
# def take_snapshot_and_get_schema(obj: Any,
#                                  name: Optional[str]=None) -> SymbolShell:
#     engine: viz.VisualizationEngine = viz.VisualizationEngine()
#     symbol_id: SymbolId = engine.take_snapshot(obj, name=name)
#     symbol_slice = engine.get_snapshot_slice(symbol_id)
#     return symbol_slice[symbol_id]
#
#
# @pytest.fixture(params=[
#     (10, 'number'), (2**30, 'number'),
#     (None, 'none'),
#     (True, 'bool'), (False, 'bool'),
#     ('Hello world!', 'string'),
#     ([1, 2, 3], 'list'), ([{'Hello'}, {'Wor': 'ld'}], 'list'),  # list
#     ({1, 2, 3}, 'set'), ({'Hello', 'World'}, 'set'),  # set
#     ((1, 2, 3), 'tuple'), (('Hello', 'World'), 'tuple'),  # tuple
#     ({1: 2, 3: 4}, 'dict'), ({'Hell': {'o': 'World'}}, 'dict'),  # dict
#     # class TODO: __subclasshook__ can have a different symbol ID at different times
#     (constants, 'module'),  # module
#     # object TODO: seems to have similar problems to class
#     (lambda x: x**2, 'fn'), (take_snapshot_and_get_schema, 'fn'),  # function
#     (torch.ones(10, 10, 10), 'tensor'),  # tensor
# ])
# def example_obj(request) -> (Any, str):
#     return request.param
#
#
# # TODO: should we make a separate, more hard-coded test fn for each type?
# def test_snapshot_shell_should_match_schema(example_obj: (Any, str)):
#     obj, type_name = example_obj
#     viz_type: viz._VisualizationType = viz._get_type_info(obj)
#     assert viz_type.type_name == type_name
#     assert take_snapshot_and_get_schema(obj, 'test_name') == SymbolShell(
#         viz_type.type_name,
#         viz_type.str_fn(obj),
#         'test_name',
#         viz_type.data_fn(obj, SnapshotId(1))[0],
#         None
#     )
# def test_view_object_with_xn_that_returns_token_should_print_message(capsys) -> None:
#     reload(xn)
#     xn.set_view_fn(_view_fn)
#     test_obj = _TokenTest(10)
#     xn.view(test_obj)
#     assert {
#         'fileName': 'none',
#         'lineNumber': 0,
#         'compactVizModel': {
#             'type': 'TokenPrimitive',
#             'contents': {
#                 'text': '10'
#             }
#         },
#         'fullVizModel': {
#             'type': 'TokenPrimitive',
#             'contents': {
#                 'text': '10'
#             }
#         }
#     } in list(json.loads(capsys.readouterr().out.strip()).values())
#
#
# def test_view_object_with_xn_that_returns_sequence_should_print_message(capsys) -> None:
#     reload(xn)
#     xn.set_view_fn(_view_fn)
#     test_obj = _SequenceTest([_TokenTest(1), _TokenTest(2), _TokenTest(3), _TokenTest(4)])
#     xn.view(test_obj)
#     output = json.loads(capsys.readouterr().out.strip())
#     assert len(output) == 5
#     assert len([d['fullVizModel']['contents']['elements'] for d in output.values() if d['fullVizModel'] is
#                 not None]) == 1
#     assert all([len(d['fullVizModel']['contents']['elements']) == 4 for d in output.values() if d['fullVizModel'] is
#                 not None])
