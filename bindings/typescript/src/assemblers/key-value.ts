import { FragmentId, KeyValueLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';
import _ from 'lodash';

type KeyValueLayoutConfig = {
    separator?: string;
    startMotif?: string;
    endMotif?: string;
    alignSeparators?: boolean;
    showLabels?: boolean;
};

class KeyValueLayoutFragmentAssembler extends FragmentAssembler {
    private _entries: [any, any][] = [];
    private _separator?: string;
    private _startMotif?: string;
    private _endMotif?: string;
    private _alignSeparators?: boolean;
    private _showLabels?: boolean;

    constructor(entries?: [any, any][], config: KeyValueLayoutConfig = {}) {
        super();
        if (entries) this._entries = entries;
        this.config(config);
    }

    public item(key: any, value: any) {
        this._entries.push([key, value]);
        return this;
    }

    public config(config: KeyValueLayoutConfig) {
        const { separator, startMotif, endMotif, alignSeparators, showLabels } = config;
        if (separator !== undefined) this._separator = separator;
        if (startMotif !== undefined) this._startMotif = startMotif;
        if (endMotif !== undefined) this._endMotif = endMotif;
        if (alignSeparators !== undefined) this._alignSeparators = alignSeparators;
        if (showLabels !== undefined) this._showLabels = showLabels;
    }

    public assemble(
        getId: (obj: any, name: string) => FragmentId,
    ): [KeyValueLayoutFragment, any[]] {
        return [
            {
                type: 'KeyValueLayout',
                contents: {
                    entries: this._entries.map(([key, value], idx) => ({
                        key: getId(key, `${idx}k`),
                        value: getId(value, `${idx}v`),
                    })),
                    separator: this._separator,
                    startMotif: this._startMotif,
                    endMotif: this._endMotif,
                    alignSeparators: this._alignSeparators,
                    showLabels: this._showLabels,
                },
                meta: this._meta,
            },
            _.flatMap(this._entries, ([key, value]) => [key, value]),
        ];
    }
}

export function KeyValue(entries?: [any, any][], config: KeyValueLayoutConfig = {}) {
    return new KeyValueLayoutFragmentAssembler(entries, config);
}

export interface KeyValue extends ReturnType<typeof KeyValue> {}
