from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Union
from typing_extensions import TypedDict
from vizstack.schema import JsonType, View, Fragment


Cell = TypedDict('Cell', {
    'col': int,
    'row': int,
    'width': int,
    'height': int,
})

NamedCell = TypedDict('NamedCell', {
    'col': int,
    'row': int,
    'width': int,
    'height': int,
    'name': str,
})


# TODO: ensure no overlap of elements
class Grid(FragmentAssembler):
    """

   """

    _DEFAULT_ITEM = object()

    def __init__(self, cells: Optional[Union[str, List[NamedCell]]] = None, items: Optional[Dict[str, Any]] = None) -> \
            None:
        """

        Args:
            cells: A string like "ABB\nACC\nACC", which specifies initial cell sizes and positions. The given example 
                creates a cell "A" at (0,0) with dimensions 1x3, cell "B" at (1,0) with dimensions 2x1, and a cell 
                "C" at position (1,1) with dimensions 2x2.
            items: An optional mapping of cell names to items.
        """""
        super(Grid, self).__init__()
        self._cells: Dict[str, Cell] = dict()
        if isinstance(cells, list):
            for cell in cells:
                self._cells[cell['name']] = {
                    'col': cell['col'],
                    'row': cell['row'],
                    'width': cell['width'],
                    'height': cell['height'],
                }
        elif isinstance(cells, str):
            self._parse_grid_string(cells)
        self._items: Dict[str, Any] = dict()
        if items is not None:
            for cell_name, item in items.items():
                self.item(item, cell_name)

    def cell(self, cell_name: str, col: int, row: int, width: int, height: int, item=_DEFAULT_ITEM):
        self._cells[cell_name] = {
            'col': col,
            'row': row,
            'width': width,
            'height': height,
        }
        if item is not Grid._DEFAULT_ITEM:
            self.item(item, cell_name)
        # TODO: assert non-overlapping
        return self

    def item(self, item: Any, cell_name: str):
        self._items[cell_name] = item
        return self

    def _parse_grid_string(self, grid_string):
        cell_bounds = dict()
        row_len = None
        for y, row in enumerate(grid_string.splitlines()):
            if row_len is None:
                row_len = len(row)
            else:
                # TODO: meaningful error here
                assert len(row) == row_len
            current_char = None
            for x, c in enumerate(row):
                if c not in cell_bounds:
                    cell_bounds[c] = {
                        'x': x, 'y': y, 'X': -1, 'Y': -1
                    }
                cell_bounds[c]['Y'] = y + 1
                if current_char is None:
                    current_char = c
                elif current_char != c:
                    cell_bounds[current_char]['X'] = x
                    current_char = c
                cell_bounds[current_char]['X'] = row_len
        for cell_name, cell_bound in cell_bounds.items():
            self._cells[cell_name] = {
                'col': cell_bound['x'],
                'row': cell_bound['y'],
                'width': cell_bound['X'] - cell_bound['x'],
                'height': cell_bound['Y'] - cell_bound['y'],
            }

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        for cell_name in self._cells:
            assert cell_name in self._items, 'No item was provided for cell "{}".'.format(cell_name)
        return {
                   'type': 'GridLayout',
                   'contents': {
                       'cells': [{**cell, 'fragmentId': get_id(self._items[cell_name], cell_name)} for cell_name,
                                                                                                       cell in
                                 self._cells.items()],
                   },
                   'meta': self._meta,
               }, [self._items[cell_name] for cell_name in self._cells]
