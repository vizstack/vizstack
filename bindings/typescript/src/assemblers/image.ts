import { FragmentId, ImagePrimitiveFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

class ImagePrimitiveFragmentAssembler extends FragmentAssembler {
    private _location: string;

    constructor(location: string) {
        super();
        this._location = location;
    }

    public assemble(
        getId: (obj: any, name: string) => FragmentId,
    ): [ImagePrimitiveFragment, any[]] {
        return [
            {
                type: 'ImagePrimitive',
                contents: {
                    location: this._location,
                },
                meta: this._meta,
            },
            [],
        ];
    }
}

export function Image(location: string) {
    return new ImagePrimitiveFragmentAssembler(location);
}

export interface Image extends ReturnType<typeof Image> {}
