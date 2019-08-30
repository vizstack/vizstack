from vizstack.view_assembler import ViewAssembler
from typing import Any, Union, Dict
from vizstack.schema import Fragment, View

__all__ = ['hash_ids', 'match_object']


def _hash_fragments(raw_fragments):

    def hash_id(raw_id):
        s = raw_id.split('-')[0]
        for n in raw_id.split('-')[1:]:
            s = ViewAssembler._hash_fragment_id('{}-{}'.format(s, n))
        return s

    fragments = dict()
    for raw_id, raw_fragment in raw_fragments.items():
        fragment = {}
        if 'type' in raw_fragment:
            fragment['type'] = raw_fragment['type']

        if 'type' in raw_fragment and 'contents' in raw_fragment:
            raw_type = raw_fragment['type']
            raw_contents = raw_fragment['contents']

            contents = {**raw_contents}

            if raw_type == 'FlowLayout' or raw_type == 'SequenceLayout':
                contents['elements'] = [hash_id(raw_id) for raw_id in raw_contents['elements']]
            elif raw_type == 'DagLayout':
                contents['nodes'] = {
                    node_id: {
                        **node, 'fragmentId': hash_id(node['fragmentId'])
                    }
                    for node_id, node in raw_contents['nodes'].items()
                }
            elif raw_type == 'GridLayout':
                contents['cells'] = {
                    cell_id: {
                        **cell, 'fragmentId': hash_id(cell['fragmentId'])
                    }
                    for cell_id, cell in raw_contents['cells'].items()
                }
            elif raw_type == 'SwitchLayout':
                contents['modes'] = [hash_id(raw_id) for raw_id in raw_contents['modes']]
            elif raw_type == 'KeyValueLayout':
                contents['entries'] = [
                    {
                        'key': hash_id(key),
                        'value': hash_id(value),
                    } for key, value in raw_contents['entries'].items()
                ]
            # Make no changes for non-layout types, since they have no FragmentIds in their contents
            fragment['contents'] = contents

        if 'meta' in raw_fragment:
            fragment['meta'] = raw_fragment['meta']
        fragments[hash_id(raw_id) if raw_id is not ViewAssembler._ROOT_ID else raw_id] = fragment
    return fragments


def hash_ids(raw: Union[View, Dict[str, Fragment]]):
    """Transforms all plaintext `FragmentId`s in either a `View` or `dict` of `Fragment`s into the
    hashed versions that would have been produced in a call to `assemble()`.

    This allows one to write tests where the ground-truth uses human-readable `FragmentId`s; just
    pass the human-readable version into `hash_ids()` before comparing to the output of
    `assemble()`.

    Args:
        raw:

    Returns:

    """
    if 'rootId' in raw:
        return {'rootId': raw['rootId'], 'fragments': _hash_fragments(raw['fragments'])}
    else:
        return _hash_fragments(raw)


def match_object(given: Any, expected: Any) -> bool:
    """Replicates the behavior of `toMatchObject()` in Javascript.

    If `expected` is a `dict`, then `given` must contain _at least_ all of the keys in `expected`,
    and `match_object` must return `True` for each corresponding value. If `expected` is anything
    else, return `given == truth`.

    Args:
        given:
        expected:

    Returns:

    """
    if isinstance(expected, dict):
        return all(match_object(given[k], expected[k]) for k in expected)
    else:
        return given == expected
