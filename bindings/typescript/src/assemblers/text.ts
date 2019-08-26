import { FragmentId, TextPrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

type VariantType = TextPrimitiveFragment['contents']['variant'];
type EmphasisType = TextPrimitiveFragment['contents']['emphasis'];

class TextPrimitiveFragmentAssembler extends FragmentAssembler {
    private _text: string;
    private _variant?: VariantType;
    private _emphasis?: EmphasisType;

    constructor(
        text: string,
        variant?: VariantType,
        emphasis?: EmphasisType,
    ) {
        super();
        this._text = text;
        this._variant = variant;
        this._emphasis = emphasis;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [TextPrimitiveFragment, any[]] {
        return [
            {
                type: 'TextPrimitive',
                contents: {
                    text: this._text,
                    variant: this._variant,
                    emphasis: this._emphasis,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Text(
    text: string,
    variant?: VariantType,
    emphasis?: EmphasisType,
) {
    return new TextPrimitiveFragmentAssembler(text, variant, emphasis);
}

export interface Text extends ReturnType<typeof Text> {}
