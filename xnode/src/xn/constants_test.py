from xn.constants import VizTableSlice, VizSpec, ExecutionEngineMessage, VizId
from xn.viz import TokenPrimitiveModel


def test_two_messages_with_same_args_should_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                 'fp',
                 1,
                 TokenPrimitiveModel('text'),
                 TokenPrimitiveModel('text'),
                 None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 == e2


def test_two_messages_with_different_view_viz_ids_should_not_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('YYY'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 != e2


def test_two_messages_with_different_viz_table_slice_viz_ids_should_not_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('YYY'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 != e2


def test_two_messages_with_different_viz_spec_file_paths_should_not_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp1',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp2',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 != e2


def test_two_messages_with_different_viz_spec_line_numbers_should_not_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                0,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 != e2


def test_two_messages_with_different_viz_spec_model_args_should_not_be_equal():
    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text1'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text2'),
                TokenPrimitiveModel('text'),
                None)
        }),
        True
    )
    assert e1 != e2

    e1 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text1'),
                None)
        }),
        True
    )
    e2 = ExecutionEngineMessage(
        VizId('XXX'),
        VizTableSlice({
            VizId('XXX'): VizSpec(
                'fp',
                1,
                TokenPrimitiveModel('text'),
                TokenPrimitiveModel('text2'),
                None)
        }),
        True
    )
    assert e1 != e2
