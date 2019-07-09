import { FragmentId, GridLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';
import _ from 'lodash';

type GridCell = { row: number; col: number; height: number; width: number };
type GridBounds = { r: number; c: number; R: number; C: number };

function withinBounds(bounds: GridBounds, row: number, col: number): boolean {
    const { r, c, R, C } = bounds;
    return r <= row && row <= R && c <= col && col <= C;
}

class GridLayoutFragmentAssembler extends FragmentAssembler {
    private _cells: Record<string, GridCell> = {};
    private _items: Record<string, any> = {};

    constructor(cells?: string | (GridCell & { name: string })[], items?: Record<string, any>) {
        super();
        if (cells) {
            if (typeof cells === 'string') {
                // Cells provided as specification string.
                this._cells = this._parseGridString(cells);
            } else if (Array.isArray(cells)) {
                // Cells already provided in structured format.
                cells.forEach(({ name, ...cell }) => (this._cells[name] = cell));
            } else {
                throw new Error(`Unknown format recieved for cells: ${cells}`);
            }
        }

        if (items) {
            this._items = items;
        }
    }

    public cell(name: string, row: number, col: number, height: number, width: number) {
        this._cells[name] = { row, col, height, width };
        return this;
    }

    public item(name: string, item: any) {
        this._items[name] = item;
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
                },
                meta: this._meta,
            },
            Object.keys(this._cells).map((name) => this._items[name]),
        ];
    }

    private _parseGridString(str: string): Record<string, GridCell> {
        // Cells must be contiguous rectangles of the same character, and all instances of that
        // character must be a part of the rectangle.
        const rows = str.split('\n');
        if (!rows || !rows.every((row) => row.length === row[0].length)) {
            throw new Error(`Grid specification string must be rectangular in shape.`);
        }
        const grid: string[][] = rows.map((row) => row.split(''));
        const bounds: Record<string, GridBounds> = {};

        function traverse(r: number, c: number): void {
            if (r == grid.length || c == grid[0].length) return;

            const char = grid[r][c];

            // Test if encountering a previously processed bound or a new discontiguous one.
            if (char in bounds) {
                if (withinBounds(bounds[char], r, c)) {
                    return;
                } else {
                    throw new Error(`Grid specification string malformed for cell: ${char}`);
                }
            }

            // Greedily expand the rectangle col-wise then row-wise until no longer possible.
            let R = r,
                C = c;
            while (C + 1 < grid[0].length && grid[r][C + 1] === char) C++;
            while (
                R + 1 < grid.length &&
                _.range(c, C + 1).every((idx) => grid[R + 1][idx] === char)
            )
                R++;
            bounds[char] = { r, c, R, C };

            // Traverse next bounds to the right and below.
            traverse(r, C + 1);
            traverse(R + 1, c);
        }
        traverse(0, 0);

        return _.mapValues(bounds, ({ r, c, R, C }) => ({
            row: r,
            col: c,
            height: R - r + 1,
            width: C - c + 1,
        }));
    }
}

export function Grid(
    cells?: string | (GridCell & { name: string })[],
    items?: Record<string, any>,
) {
    return new GridLayoutFragmentAssembler(cells, items);
}

export interface Grid extends ReturnType<typeof Grid> {}
