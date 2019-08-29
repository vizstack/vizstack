import { FragmentId, SwitchLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

const kNoneSpecified = Symbol();

type SwitchLayoutConfig = {
    showLabels?: boolean;
};

class SwitchLayoutFragmentAssembler extends FragmentAssembler {
    private _modes: string[] = [];
    private _items: Record<string, any> = {};
    private _showLabels?: boolean;

    constructor(modes?: string[], items?: Record<string, any>, config: SwitchLayoutConfig = {}) {
        super();
        if (modes) this._modes = modes;
        if (items) this._items = items;
        this.config(config);
    }

    public mode(name: string, item: any = kNoneSpecified) {
        this._modes.push(name);
        if (item !== kNoneSpecified) this._items[name] = item;
        return this;
    }

    public item(name: string, item: any) {
        this._items[name] = item;
        return this;
    }

    public config(config: SwitchLayoutConfig) {
        const { showLabels } = config;
        if(showLabels !== undefined) this._showLabels = showLabels;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [SwitchLayoutFragment, any[]] {
        this._modes.forEach((name) => {
            if (!(name in this._items)) throw new Error(`Mode with no item: ${name}`);
        });
        return [
            {
                type: 'SwitchLayout',
                contents: {
                    modes: this._modes.map((name) => getId(this._items[name], `${name}`)),
                    showLabels: this._showLabels,
                },
                meta: this._meta,
            },
            this._modes.map((name) => this._items[name]),
        ];
    }
}

export function Switch(
    modes?: string[],
    items?: Record<string, any>,
    config: SwitchLayoutConfig = {},
) {
    return new SwitchLayoutFragmentAssembler(modes, items, config);
}

export interface Switch extends ReturnType<typeof Switch> {}
