import { FragmentId, SequenceLayoutFragment } from '@vizstack/schema';
import { FragmentAssembler } from '../fragment-assembler';

type SequenceLayoutConfig = {
    orientation?: 'horizontal' | 'vertical',
    startMotif?: string,
    endMotif?: string,
    showLabels?: boolean;
};

class SequenceLayoutFragmentAssembler extends FragmentAssembler {
    private _elements: any[] = [];
    private _orientation?: 'horizontal' | 'vertical';
    private _startMotif?: string;
    private _endMotif?: string;
    private _showLabels?: boolean;

    constructor(
        elements?: any[],
        config: SequenceLayoutConfig = {},
    ) {
        super();
        if (elements) this._elements = elements;
        this.config(config);

    }

    public item(item: any) {
        this._elements.push(item);
        return this;
    }

    public items(...items: any) {
        this._elements.push(...items);
        return this;
    }

    public config(config: SequenceLayoutConfig) {
        const { orientation, startMotif, endMotif, showLabels } = config;
        if(orientation !== undefined) this._orientation = orientation;
        if(startMotif !== undefined) this._startMotif = startMotif;
        if(endMotif !== undefined) this._endMotif = endMotif;
        if(showLabels !== undefined) this._showLabels = showLabels;
    }

    public assemble(
        getId: (obj: any, name: string) => FragmentId,
    ): [SequenceLayoutFragment, any[]] {
        return [
            {
                type: 'SequenceLayout',
                contents: {
                    elements: this._elements.map((elem, idx) => getId(elem, `${idx}`)),
                    orientation: this._orientation,
                    startMotif: this._startMotif,
                    endMotif: this._endMotif,
                    showLabels: this._showLabels,
                },
                meta: this._meta,
            },
            this._elements,
        ];
    }
}

export function Sequence(
    elements?: any[],
    config: SequenceLayoutConfig = {},
) {
    return new SequenceLayoutFragmentAssembler(elements, config);
}

export interface Sequence extends ReturnType<typeof Sequence> {}
