import { FragmentId, SequenceLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';


class SequenceLayoutFragmentAssembler extends FragmentAssembler {
    private _elements: any[] = [];
    private _orientation?: 'horizontal' | 'vertical';
    private _startMotif?: string;
    private _endMotif?: string;

    constructor(
        elements?: any[],
        orientation?: 'horizontal' | 'vertical',
        startMotif?: string,
        endMotif?: string,
    ) {
        super();
        if(elements) this._elements = elements;
        this._orientation = orientation;
        this._startMotif = startMotif;
        this._endMotif = endMotif;
    }

    public item(item: any) {
        this._elements.push(item);
        return this;
    }
    
    public items(...items: any) {
        this._elements.push(...items);
        return this;
    }

    public assemble(getId: (obj: any, name: string) => FragmentId): [SequenceLayoutFragment, any[]] {
        return [{
            type: 'SequenceLayout',
            contents: {
                elements: this._elements.map((elem, idx) => getId(elem, `${idx}`)),
                orientation: this._orientation,
                startMotif: this._startMotif,
                endMotif: this._endMotif,
            },
            meta: this._meta,
        }, this._elements];
    }
}

export function Sequence(
    elements?: any[],
    orientation?: 'horizontal' | 'vertical',
    startMotif?: string,
    endMotif?: string,
) {
    return new SequenceLayoutFragmentAssembler(elements, orientation, startMotif, endMotif);
}

export interface Sequence extends ReturnType<typeof Sequence> {};