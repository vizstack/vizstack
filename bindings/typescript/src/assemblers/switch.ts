import { FragmentId, SwitchLayoutFragment } from '../../../../core/src/schema';
import { FragmentAssembler } from '../assembler';


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
                modes: this._modes.map((name, idx) => getId(this._items[name], `${idx}`))
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