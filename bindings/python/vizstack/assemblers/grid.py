from vizstack.fragment_assembler import FragmentAssembler
from typing import Optional, Tuple, Dict, List, Any, Union
from typing_extensions import TypedDict, Literal
from vizstack.schema import JsonType, View, Fragment
import re


GridCell = TypedDict('GridCell', {
    'col': int,
    'row': int,
    'width': int,
    'height': int,
})

GridCellNamed = TypedDict('GridCellNamed', {
    'col': int,
    'row': int,
    'width': int,
    'height': int,
    'name': str,
})

GridBounds = TypedDict('GridBounds', {
    'r': int,
    'c': int,
    'R': int,
    'C': int,
})

RowColSetting = Literal['fit', 'equal', None]


def _within_bounds(bounds: GridBounds, row: int, col: int) -> bool:
    return bounds['r'] <= row <= bounds['R'] and bounds['c'] <= col <= bounds['C']


def _parse_grid_string(spec: str) -> Dict[str, GridCell]:
    rows = re.split("\||\n", spec)
    rows = ["".join(row.split()) for row in rows]
    rows = [row for row in rows if len(row) > 0]
    if len(rows) == 0 or not all(len(row) == len(rows[0]) for row in rows):
        raise ValueError('Specification string must be rectangular, got rows: ' + str(rows))

    bounds: Dict[str, GridBounds] = {}
    for r in range(len(rows)):
        for c in range(len(rows[0])):
            char = rows[r][c]
            if char in bounds:
                # A previously encountered character must be within the greedily expanded bounds.
                if _within_bounds(bounds[char], r, c): continue
                raise ValueError('Specification string malformed for cell: ' + char)
            else:
                if char == '.': continue
                # Create a new cell and greedily expand col-wise then row-wise while bounds keep
                # fencing a contiguous rectangle of `char`.
                R, C = r, c
                while C + 1 < len(rows[0]) and rows[r][C + 1] == char:
                    C += 1
                while R + 1 < len(rows) and all(rows[R + 1][i] == char for i in range(c, C + 1)):
                    R += 1
                bounds[char] = {'r': r, 'c': c, 'R': R, 'C': C}

    return {name: {
        'row': bound['r'],
        'col': bound['c'],
        'height': bound['R'] - bound['r'] + 1,
        'width': bound['C'] - bound['c'] + 1,
    } for name, bound in bounds.items()}


class Grid(FragmentAssembler):

    _NONE_SPECIFIED = object()

    _row_height: RowColSetting = None
    _col_width: RowColSetting = None
    _show_labels: Optional[bool] = None

    def __init__(self,
                 cells: Optional[Union[str, List[GridCellNamed]]] = None,
                 items: Optional[Dict[str, Any]] = None,
                 row_height: RowColSetting = None,
                 col_width: RowColSetting = None,
                 show_labels: Optional[bool] = None) -> \
            None:
        """
        Args:
            cells: A string like "ABB\nACC\nACC", which specifies initial cell sizes and positions.
                The given example creates a cell "A" at (0,0) with dimensions 1x3, cell "B" at
                (1,0) with dimensions 2x1, and a cell "C" at position (1,1) with dimensions 2x2.
            items: An optional mapping of cell names to items.
        """""
        super(Grid, self).__init__()
        self._cells: Dict[str, GridCell] = dict()
        if isinstance(cells, list):
            for cell in cells:
                self._cells[cell['name']] = {
                    'col': cell['col'],
                    'row': cell['row'],
                    'width': cell['width'],
                    'height': cell['height'],
                }
        elif isinstance(cells, str):
            self._cells = _parse_grid_string(cells)
        else:
            raise ValueError('Unknown format received for cells:' + str(cells))

        self._items: Dict[str, Any] = dict()
        if items is not None:
            for name, item in items.items():
                self.item(name, item)

        self.config(row_height=row_height, col_width=col_width, show_labels=show_labels)

    def cell(self, name: str, row: int, col: int, height: int, width: int, item=_NONE_SPECIFIED):
        self._cells[name] = {
            'col': col,
            'row': row,
            'width': width,
            'height': height,
        }
        if item is not Grid._NONE_SPECIFIED:
            self.item(item, name)
        return self

    def item(self, name: str, item: Any):
        self._items[name] = item
        return self

    def config(self, row_height: RowColSetting = None,
                 col_width: RowColSetting = None,
                 show_labels: Optional[bool] = None):
        if row_height is not None: self._row_height = row_height
        if col_width is not None: self._col_width = col_width
        if show_labels is not None: self._show_labels = show_labels

    def assemble(self, get_id) -> Tuple[Fragment, List[Any]]:
        for cell_name in self._cells:
            assert cell_name in self._items, 'No item was provided for cell "{}".'.format(cell_name)
        return {
                   'type': 'GridLayout',
                   'contents': {
                       'cells': [{**cell, 'fragmentId': get_id(self._items[cell_name], cell_name)}
                                 for cell_name, cell in self._cells.items()],
                       'rowHeight': self._row_height,
                       'colWidth': self._col_width,
                       'showLabels': self._show_labels,
                   },
                   'meta': self._meta,
               }, [self._items[cell_name] for cell_name in self._cells]
