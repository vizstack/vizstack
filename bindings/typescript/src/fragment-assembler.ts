import { Fragment, FragmentId, FragmentMeta } from '../../../core/src/schema';

/* Fragment-specific assembler with custom constructor and manipulation methods. */
export abstract class FragmentAssembler {
    protected _meta: FragmentMeta = {};
    public meta(key: string, value?: any): FragmentAssembler {
        this._meta[key] = value;
        return this;
    }

    /**
     * @return
     *     `Fragment` data structure based on the current configuration, and a list of all 
     *     referenced objects (i.e. child elements).
     */
    public abstract assemble(getId: (obj: any, name: string) => FragmentId): [Fragment, any[]];
}