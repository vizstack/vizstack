from typing import Dict
from mypy_extensions import TypedDict
from vizstack.schema import Fragment, View
from vizstack import assemble, Sequence, Text
from vizstack.view_assembler import ViewAssembler


# TODO: make this type meaningfully distinct from `View`
RawView = TypedDict('RawView', {
    'rootId': str,
    'fragments': Dict[str, Fragment],
})


def _hash_ids(raw: RawView) -> View:
    view: View = {
        'rootId': raw['rootId'],
        'fragments': {},
    }
    for raw_id, raw_fragment in raw['fragments'].items():
        raw_type = raw_fragment['type']
        raw_contents = raw_fragment['contents']

        contents = {**raw_contents}

        hash = ViewAssembler._hash_fragment_id

        if raw_type == 'FlowLayout' or raw_type == 'SequenceLayout':
            contents['elements'] = [hash(raw_id) for raw_id in raw_contents['elements']]
        elif raw_type == 'DagLayout':
            contents['nodes'] = {
                node_id: {**node, 'fragmentId': hash(node['fragmentId'])}
                for node_id, node in raw_contents['nodes'].items()
            }
        elif raw_type == 'GridLayout':
            contents['cells'] = {
                cell_id: {**cell, 'fragmentId': hash(cell['fragmentId'])}
                for cell_id, cell in raw_contents['cells'].items()
            }
        elif raw_type == 'SwitchLayout':
            contents['modes'] = [hash(raw_id) for raw_id in raw_contents['modes']]
        elif raw_type == 'KeyValueLayout':
            contents['entries'] = [{
                'key': hash(key),
                'value': hash(value),
            } for key, value in raw_contents['entries'].items()]
        # Make no changes for non-layout types, since they have no FragmentIds in their contents

        view['fragments'][hash(raw_id) if raw_id is not raw['rootId'] else raw_id] = {
            'type': raw_fragment['type'],
            'contents': contents,
            'meta': raw_fragment['meta'],
        }
    return view


def test_layout_with_duplicates():
    text = Text('herro')
    fasm = Sequence([text, text])
    view = assemble(fasm)
    assert view == _hash_ids({
        'rootId': ViewAssembler._ROOT_ID,
        'fragments': {
            'root': {
                'type': 'SequenceLayout',
                'contents': { 'elements': ['root-0', 'root-0'] },
                'meta': {},
            },
            'root-0': { 'type': 'TextPrimitive', 'contents': { 'text': 'herro' }, 'meta': {} },
        }
    })
