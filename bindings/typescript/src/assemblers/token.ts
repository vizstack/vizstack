import { FragmentId, TokenPrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

type ColorType = TokenPrimitiveFragment['contents']['color'];

class TokenPrimitiveFragmentAssembler extends FragmentAssembler {
    private _text: string;
    private _color?: ColorType;

    constructor(
        text: string,
        color?: ColorType,
    ) {
        super();
        this._text = text;
        this._color = color;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [TokenPrimitiveFragment, any[]] {
        return [
            {
                type: 'TokenPrimitive',
                contents: {
                    text: this._text,
                    color: this._color,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Token(
    text: string,
    color?: ColorType,
) {
    return new TokenPrimitiveFragmentAssembler(text, color);
}

export interface Token extends ReturnType<typeof Token> {}
