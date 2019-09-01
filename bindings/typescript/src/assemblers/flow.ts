import { FragmentId, FlowLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

class FlowLayoutFragmentAssembler extends FragmentAssembler {
    private _elements: any[];

    constructor(...elements: any[]) {
        super();
        this._elements = elements;
    }

    public item(item: any) {
        this._elements.push(item)
        return this;
    }

    public items(...items: any[]) {
        this._elements.push(...items);
        return this;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [FlowLayoutFragment, any[]] {
        return [
            {
                type: 'FlowLayout',
                contents: {
                    elements: this._elements.map((elem, idx) => getId(elem, `${idx}`)),
                },
                meta: this._meta,
            },
            this._elements,
        ];
    }
}

export function Flow(...elements: any[]) {
    return new FlowLayoutFragmentAssembler(...elements);
}

export interface Flow extends ReturnType<typeof Flow> {}
