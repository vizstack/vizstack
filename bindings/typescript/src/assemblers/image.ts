import { FragmentId, ImagePrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

class ImagePrimitiveFragmentAssembler extends FragmentAssembler {
    private _image: string;

    constructor(image: string) {
        super();
        this._image = image;
    }

    public assemble(
        getId: (obj: any, name: string) => FragmentId,
    ): [ImagePrimitiveFragment, any[]] {
        return [
            {
                type: 'ImagePrimitive',
                contents: {
                    image: this._image,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Image(image: string) {
    return new ImagePrimitiveFragmentAssembler(image);
}

export interface Image extends ReturnType<typeof Image> {}
