import { FragmentId, IconPrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

type EmphasisType = IconPrimitiveFragment['contents']['emphasis'];

class IconPrimitiveFragmentAssembler extends FragmentAssembler {
    private _name: string;
    private _emphasis?: EmphasisType;

    constructor(
        name: string,
        emphasis?: EmphasisType,
    ) {
        super();
        this._name = name;
        this._emphasis = emphasis;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [IconPrimitiveFragment, any[]] {
        return [
            {
                type: 'IconPrimitive',
                contents: {
                    name: this._name,
                    emphasis: this._emphasis,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Icon(
    name: string,
    emphasis?: EmphasisType,
) {
    return new IconPrimitiveFragmentAssembler(name, emphasis);
}

export interface Icon extends ReturnType<typeof Icon> {}
