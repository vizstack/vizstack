import JSON5 from 'json5';

const _CURRENT_PLACEHOLDERS = new Map();

export function _getView(o: any) {
    if (_CURRENT_PLACEHOLDERS.has(o)) {
        return _CURRENT_PLACEHOLDERS.get(o);
    }
    _CURRENT_PLACEHOLDERS.set(o, new ViewPlaceholder());
    let view;
    let shouldReplace = false;
    if (o instanceof View || o instanceof ViewPlaceholder) {
        view = o;
    }
    else if ('__view__' in o) {
        view = o.__view__();
    }
    else if (o !== Object(o)) {
        view = Token(typeof o === 'string' ? `"${o}"` : `${o}`);
    }
    else if (Array.isArray(o)) {
        view = _SwitchSequence(o, `List[${o.length}] [`, ']',
            'horizontal',
            `List[${o.length}]`);
        shouldReplace = true;
    }
    else if (o instanceof Set) {
        view = _SwitchSequence(Array.from(o), `Set[${o.size}] {`, '}',
            'horizontal',
            `Set[${o.size}]`);
        shouldReplace = true;
    }
    else if (typeof o === 'function') {
        const { args, defaults } = _getArgs(o);
        const keyValues = {};
        args.forEach((arg, i) => keyValues[arg] = defaults[i]);
        view = _SwitchKeyValues(keyValues, ':',  o.name ? `Function[${o.name}] (` : 'Function (', ')', o.name ? `Function[${o.name}]` : `Function(...)`);
        shouldReplace = true;
    }
    else {
        view = _SwitchKeyValues(o, ':', `Object[${Object.keys(o).length}] {`, '}',
            `Object[${Object.keys(o).length}]`);
        shouldReplace = true;
    }
    if (shouldReplace) {
        _CURRENT_PLACEHOLDERS.get(o).view = Switch(view._modes[view._modes.length - 1].concat([view._modes.slice(0, view._modes.length - 1)]), view._items);
    }
    else {
        _CURRENT_PLACEHOLDERS.get(o).view = view;
    }
    _CURRENT_PLACEHOLDERS.delete(o);
    return view;
}

function _getArgs(func) {
    const params = (func + '')
        .replace(/[/][/].*$/mg,'') // strip single-line comments
        .replace(/\s+/g, '') // strip white space
        .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
        .split('){', 1)[0]
        .split(')=>')[0]
        .replace(/^[^(]*[(]/, '') // extract the parameters
        /* .replace(/=[^,]+/g, '') // strip any ES6 defaults */
        .split(',').filter(Boolean); // split & filter [""]

    return {
        args: params.map((param) => param.split('=')[0]),
        defaults: params.map((param) => {
            let value = param.split('=').length > 1 ? param.split('=')[1] : undefined;
            try {
                if (value) {
                    value = JSON5.parse(value);
                }
            } catch (error) {}
            return value;
        }),
    }
}

export class View {
    _meta = {};
    meta(key, value) {
        this._meta[key] = value;
    }
}

export class ViewPlaceholder {
    view;
}

export class Text extends View {
    constructor(text: string,
                color: 'default' | 'primary' | 'secondary' | 'error' | 'invisible' | null = null,
                variant: 'plain' | 'token' | null = null) {
        super();
        this._text = text;
        this._color = color;
        this._variant = variant;
    }
    assembleDict() {
        return {
            type: 'TextPrimitive',
            contents: {
                text: this._text,
                color: this._color,
                variant: this._variant,
            },
            meta: this._meta,
        }
    }
}

export class Image extends View {
    constructor(filePath: string) {
        super();
        this._filePath = filePath;
    }

    assembleDict() {
        return {
            type: 'ImagePrimitive',
            contents: {
                filePath: this._filePath,
            },
            meta: this._meta,
        }
    }
}

export class Token extends Text {
    constructor(obj: any) {
        super(obj.toString(), null, 'token');
    }
}

export class Flow extends View {
    constructor(items: Array<any>) {
        super();
        this._elements = items.map((item) => _getView(item));
    }

    item(item) {
        this._elements.push(_getView(item));
        return this;
    }

    assembleDict() {
        return {
            type: 'FlowLayout',
            contents: {
                elements: this._elements,
            },
            meta: this._meta,
        }
    }
}

// TODO: daglayout

export class Grid extends View {
    constructor(cells=null, items=null) {
        super();
        this._cells = {};
        if (cells) {
            const cellBounds = {};
            let rowLen;
            cells.split('\n').forEach((row, y) => {
                if (rowLen === undefined) {
                    rowLen = row.length;
                }
                else {
                    if (row.length !== rowLen) {
                        throw Error('Lines of Grid.cells must be of uniform length.');
                    }
                }
                let currentChar;
                row.split('').forEach((c, x) => {
                    if (!(c in cellBounds)) {
                        cellBounds[c] = {
                            x, y, X: -1, Y: -1,
                        };
                    }
                    cellBounds[c].Y = y + 1;
                    if (currentChar !== undefined && currentChar !== c) {
                        cellBounds[currentChar].X = x;
                    }
                    currentChar = c;
                    cellBounds[currentChar].X = rowLen;
                });
            });
            Object.entries(cellBounds).forEach(([cellName, {x, y, X, Y}]) => {
                this._cells[cellName] = {
                    col: x, row: y, width: X - x, height: Y - y,
                }
            });
        }
        this._items = items || {};
    }

    cell(cellName: string, col: number, row: number, width: number, height: number, item=null) {
        this._cells[cellName] = { col, row, width, height };
        if (item) {
            this.item(item, cellName);
        }
        return this;
    }

    item(item: any, cellName: string) {
        this._items[cellName] = _getView(item);
        return this;
    }

    assembleDict() {
        Object.keys(this._cells).forEach((cellName) => {
            if (!(cellName in this._items)) throw Error(`Cell ${cellName} has no item.`);
        });
        return {
            type: 'GridLayout',
            contents: {
                elements: Object.entries(this._cells).map(([cellName, cell]) => ({
                    ...cell,
                    viewId: this._items[cellName],
                }))
            },
            meta: this._meta,
        }
    }
}

class Switch extends View {
    constructor(modes: Array<string> | null = null,
                items: {[string]: any} | null = null) {
        super();
        this._modes = modes || [];
        this._items = {};
        if (items) {
            Object.entries(items).forEach(([key, value]) => this._items[key] = _getView(value))
        }
    }

    mode(mode: string, index: number | null = null) {
        if (index !== null) {
            this._modes.splice(index, 0, mode);
        }
        else {
            this._modes.push(mode);
        }
        return this;
    }

    item(item: any, mode: string) {
        this._items[mode] = _getView(item);
        return this;
    }

    assembleDict() {
        this._modes.forEach((mode) => {
            if (!(mode in this._items)) throw Error(`No item was provided for mode "${mode}".`);
        });
        return {
            type: 'SwitchLayout',
            contents: {
                elements: this._modes.map((mode) => this._items[mode]),
            },
            meta: this._meta,
        }
    }
}

class Sequence extends View {
    constructor(elements: Array<any> | null = null,
                startMotif: string | null = null,
                endMotif: string | null = null,
                orientation: string = 'horizontal') {
        super();
        this._orientation = orientation;
        this._startMotif = startMotif ? Text(startMotif) : null;
        this._endMotif = endMotif ? Text(endMotif) : null;
        this._elements = elements.map((elem) => _getView(elem)) || [];
    }

    item(item: any) {
        this._elements.push(_getView(item));
        return this;
    }

    assembleDict() {
        const grid = Grid();
        let updateIndex = this._orientation === 'horizontal' ? 0 : 1;
        const currentPosition: [number, number] = [0, 0];
        if (this._startMotif) {
            grid.cell('startMotif', ...currentPosition, 1, 1, this._startMotif);
            currentPosition[updateIndex] += 1;
        }
        this._elements.forEach((item, i) => {
            grid.cell(`${i}`, ...currentPosition, 1, 1, item);
            currentPosition[updateIndex] += 1;
        });
        if (this._endMotif) {
            grid.cell('endMotif', ...currentPosition, 1, 1, this._endMotif);
        }
        return grid.assembleDict();
    }
}

class KeyValues extends View {
    constructor(keyValues = null,
                itemSep = ':',
                startMotif = null,
                endMotif = null) {
        super();
        this._startMotif = startMotif ? Text(startMotif) : null;
        this._endMotif = endMotif ? Text(endMotif) : null;
        this._itemSep = itemSep;
        this._elements = keyValues ? Object.entries(keyValues).map(([key, value]) => [_getView(key), _getView(value)]) : [];
    }

    item(key, value) {
        this._elements.push([_getView(key), _getView(value)]);
        return this;
    }

    assembleDict() {
        const grid = Grid();
        let currentRow = 0;
        if (this._startMotif) {
            grid.cell('startMotif', 0, currentRow, 3, 1, this._startMotif);
            currentRow += 1;
        }
        this._elements.forEach(([key, value], i) => {
            grid.cell(`k${i}`, 0, currentRow, 1, 1, key);
            grid.cell(`sep${i}`, 1, currentRow, 1, 1, Text(this._itemSep));
            grid.cell(`v${i}`, 2, currentRow, 1, 1, value);
            currentRow += 1;
        });
        if (this._endMotif) {
            grid.cell('endMotif', 0, currentRow, 3, 1, this._endMotif);
        }
        return grid.assembleDict();
    }
}

function _SwitchSequence(
    elements,
    startMotif = null,
    endMotif = null,
    orientation = 'horizontal',
    summary = null,
    expansionMode = null,
) {
    const fullView = Sequence(elements, startMotif, endMotif, orientation);
    const compactView = Sequence(elements.slice(0, 3), startMotif, '...', orientation);
    const summaryView = summary || `sequence[${elements.length}]`;
    if (elements.length <= 3) {
        let modes = expansionMode === 'summary' ? ['summary', 'full'] : ['full', 'summary'];
        return Switch(modes, {'full': fullView, 'summary': summaryView});
    }
    let modes;
    switch(expansionMode) {
        default:
        case 'full':
            modes = ['full', 'compact', 'summary'];
            break;
        case 'compact':
            modes = ['compact', 'summary', 'full'];
            break;
        case 'summary':
            modes = ['summary', 'full', 'compact'];
            break;
    }
    return Switch(modes, {'full': fullView, 'compact': compactView, 'summary': summaryView});
}

function _SwitchKeyValues(
    keyValues,
    itemSep = ':',
    startMotif = null,
    endMotif = null,
    summary = null,
    expansionMode = null,
) {
    const fullView = KeyValues(keyValues, itemSep, startMotif, endMotif);
    const compact = {};
    Object.entries(keyValues).slice(0, 3).forEach(([key, value]) => compact[key] = value);
    const compactView = KeyValues(compact, itemSep, startMotif, '...');
    const summaryView = summary || `object[${Object.keys(keyValues).length}]`;
    if (Object.keys(keyValues).length <= 3) {
        let modes = expansionMode === 'summary' ? ['summary', 'full'] : ['full', 'summary'];
        return Switch(modes, {'full': fullView, 'summary': summaryView});
    }
    let modes;
    switch(expansionMode) {
        default:
        case 'full':
            modes = ['full', 'compact', 'summary'];
            break;
        case 'compact':
            modes = ['compact', 'summary', 'full'];
            break;
        case 'summary':
            modes = ['summary', 'full', 'compact'];
            break;
    }
    return Switch(modes, {'full': fullView, 'compact': compactView, 'summary': summaryView});
}