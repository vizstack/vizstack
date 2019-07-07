import { FragmentId, SwitchLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';


const kNoneSpecified = Symbol();

class SwitchLayoutFragmentAssembler extends FragmentAssembler {
    private _modes: string[] = [];
    private _items: Record<string, any> = {};

    constructor(
        modes?: string[],
        items?: Record<string, any>,
    ) {
        super();
        if(modes) this._modes = modes;
        if(items) this._items = items;
    }

    public mode(name: string, item: any = kNoneSpecified) {
        this._modes.push(name);
        if(item !== kNoneSpecified) this._items[name] = item;
        return this;
    }

    public item(name: string, item: any) {
        this._items[name] = item;
        return this;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [SwitchLayoutFragment, any[]] {
        this._modes.forEach((name) => {
            if (!(name in this._items)) throw new Error(`Mode with no item: ${name}`);
        });
        return [{
            type: 'SwitchLayout',
            contents: {
                // Mode names are not necessarily unique
                modes: this._modes.map((name, i) => getId(this._items[name], `${name}${i}`))
            },
            meta: this._meta,
        }, this._modes.map((name) => this._items[name])];
    }
}

export function Switch(
    modes?: string[],
    items?: Record<string, any>,
) {
    return new SwitchLayoutFragmentAssembler(modes, items);
}

export interface Switch extends ReturnType<typeof Switch> {};