import { FragmentId, ImagePrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

class ImagePrimitiveFragmentAssembler extends FragmentAssembler {
    private _filePath: string;

    constructor(filePath: string) {
        super();
        this._filePath = filePath;
    }

    public assemble(
        getId: (obj: any, name: string) => FragmentId,
    ): [ImagePrimitiveFragment, any[]] {
        return [
            {
                type: 'ImagePrimitive',
                contents: {
                    filePath: this._filePath,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Image(filePath: string) {
    return new ImagePrimitiveFragmentAssembler(filePath);
}

export interface Image extends ReturnType<typeof Image> {}
