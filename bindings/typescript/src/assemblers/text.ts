import { FragmentId, TextPrimitiveFragment } from '../../../../core/src/schema';
import { FragmentAssembler } from '../assembler';


class TextPrimitiveFragmentAssembler extends FragmentAssembler {
    private _text: string;
    private _variant?: 'plain' | 'token';
    private _color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible';

    constructor(
        text: string,
        variant?: 'plain' | 'token',
        color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
    ) {
        super();
        this._text = text;
        this._variant = variant;
        this._color = color;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [TextPrimitiveFragment, any[]] {
        return [{
            type: 'TextPrimitive',
            contents: {
                text: this._text,
                color: this._color,
                variant: this._variant,
            },
            meta: this._meta,
        }, []];
    }
}

export function Text(
    text: string,
    variant?: 'plain' | 'token',
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'invisible',
) {
    return new TextPrimitiveFragmentAssembler(text, variant, color);
}

export interface Text extends ReturnType<typeof Text> {};