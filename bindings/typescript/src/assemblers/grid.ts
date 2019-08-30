import { FragmentId, GridLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';
import _ from 'lodash';

type GridCell = { row: number; col: number; height: number; width: number };
type GridBounds = { r: number; c: number; R: number; C: number };

export function withinBounds(bounds: GridBounds, row: number, col: number): boolean {
    const { r, c, R, C } = bounds;
    return r <= row && row <= R && c <= col && col <= C;
}

export function parseGridString(str: string): Record<string, GridCell> {
    const rows = str
        .split(/[\n,|]+/)
        .map((row) => row.replace(/\s/g, ''))
        .filter((row) => row.length > 0);
    if (!rows || !rows.every((row) => row.length === rows[0].length)) {
        throw new Error(`Specification string must be rectangular, got rows: ${rows}`);
    }
    const grid: string[][] = rows.map((row) => row.split(''));
    const bounds: Record<string, GridBounds> = {};

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const char = grid[r][c];
            if (char in bounds) {
                // A previously encountered character must be within the greedily expanded bounds.
                if (withinBounds(bounds[char], r, c)) continue;
                throw new Error(`Specification string malformed for cell: ${char}`);
            } else {
                if (char === '.') continue;
                // Create a new cell and greedily expand col-wise then row-wise while bounds
                // keep fencing a contiguous rectangle of `char`.
                let R = r,
                    C = c;
                while (C + 1 < grid[0].length && grid[r][C + 1] === char) {
                    C++;
                }
                while (
                    R + 1 < grid.length &&
                    _.range(c, C + 1).every((idx) => grid[R + 1][idx] === char)
                ) {
                    R++;
                }
                bounds[char] = { r, c, R, C };
            }
        }
    }

    return _.mapValues(bounds, ({ r, c, R, C }) => ({
        row: r,
        col: c,
        height: R - r + 1,
        width: C - c + 1,
    }));
}

type GridLayoutConfig = {
    rowHeight?: 'fit' | 'equal';
    colWidth?: 'fit' | 'equal';
    showLabels?: boolean;
};

const kNoneSpecified = Symbol();

class GridLayoutFragmentAssembler extends FragmentAssembler {
    private _cells: Record<string, GridCell> = {};
    private _items: Record<string, any> = {};
    private _rowHeight?: 'fit' | 'equal';
    private _colWidth?: 'fit' | 'equal';
    private _showLabels?: boolean;

    constructor(
        cells?: string | (GridCell & { name: string })[],
        items?: Record<string, any>,
        config: GridLayoutConfig = {},
    ) {
        super();
        if (cells) {
            if (typeof cells === 'string') {
                // Cells provided as specification string.
                this._cells = parseGridString(cells);
            } else if (Array.isArray(cells)) {
                // Cells already provided in structured format.
                cells.forEach(({ name, ...cell }) => (this._cells[name] = cell));
            } else {
                throw new Error(`Unknown format received for cells: ${cells}`);
            }
        }

        if (items) this._items = items;
        this.config(config);
    }

    public cell(
        name: string,
        row: number,
        col: number,
        height: number,
        width: number,
        item: any = kNoneSpecified,
    ) {
        this._cells[name] = { row, col, height, width };
        if (item !== kNoneSpecified) this._items[name] = item;
        return this;
    }

    public item(name: string, item: any) {
        this._items[name] = item;
        return this;
    }

    public config(config: GridLayoutConfig) {
        const { rowHeight, colWidth, showLabels } = config;
        if (rowHeight !== undefined) this._rowHeight = rowHeight;
        if (colWidth !== undefined) this._colWidth = colWidth;
        if (showLabels !== undefined) this._showLabels = showLabels;
        return this;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [GridLayoutFragment, any[]] {
        _.keys(this._cells).forEach((name) => {
            if (!(name in this._items)) throw new Error(`Cell with no item: ${name}`);
        });
        return [
            {
                type: 'GridLayout',
                contents: {
                    cells: _.entries(this._cells).map(([name, cell]) => ({
                        fragmentId: getId(this._items[name], name),
                        ...cell,
                    })),
                    rowHeight: this._rowHeight,
                    colWidth: this._colWidth,
                    showLabels: this._showLabels,
                },
                meta: this._meta,
            },
            Object.keys(this._cells).map((name) => this._items[name]),
        ];
    }
}

/**
 * `Grid` is a layout with slots (named cells) arranged on a 2D grid. Cells can have different
 * dimensions and can even overlap.
 * @param cells
 *     (optional) (1) A list of named cells. (2) A specification string where cells must be
 *     contiguous rectangles of the same character, and all instances of a character must be part
 *     of the same rectangle. Each row is on a different line and all other whitespace is ignored.
 *     The special character '.' is ignored.
 * @param items
 *     (optional) Items to fill slots with.
 * @example
 *     // These produce the equivalent cells.
 *     Grid([{ name: "A", row: 0, col: 0, width: 1, height: 1 },
 *           { name: "B", row: 0, col: 1, width: 3, height: 1 }])
 *     Grid(`A BBB`)
 *     Grid(`A B B B`)
 *
 *     // Use multi-line strings to create rows.
 *     Grid(`A BB C
 *           D BB E`)
 */
export function Grid(
    cells?: string | (GridCell & { name: string })[],
    items?: Record<string, any>,
    config: GridLayoutConfig = {},
) {
    return new GridLayoutFragmentAssembler(cells, items, config);
}

export interface Grid extends ReturnType<typeof Grid> {}

// TODO: Allow width of grid to be set independently (e.g. so that ". A B ." case works).
