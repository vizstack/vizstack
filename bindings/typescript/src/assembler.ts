/**
 * While it is possible to manually assemble `View`/`Fragment` data structures to feed to a
 * `Viewer`, it is often much more convenient to use "Assemblers". These are lightweight helper
 * classes that allow a developer to declaratively and incrementally assemble the data structures
 * using a chain syntax.
 * 
 * Each programming language can have its own set of bindings for the "Assemblers". This allows
 * developers to construct `View`/`Fragment` data structures from a variety of backends, enabling a
 * shared interface for visualizing data in different program contexts and platforms. Each
 * language's bindings can define its own language-specific defaults for how to convert native
 * constructs into visualizations. Additionally, developers can create custom views for different
 * classes by implementing custom view methods (e.g. `__view__()`).
 */

 // TODO: Import package properly.
import { View, Fragment, FragmentId, FragmentMeta } from '../../../core/src/schema';
import { getLanguageDefault } from './lang';


/* Converts the given object into a `View`. The object can be a `FragmentAssembler`, a native
 * language construct (e.g. int, list, class, function), or objects with custom view methods.
 * In nested objects (e.g. list, set, map), it is possible to mix these types. */
class ViewAssembler {
    /* Prefix to include before all the generated IDs, including the root ID. */
    private static _kIdPrefix = "frag:";

    /* Default unprefixed ID for root fragment.*/
    private static _kRootId = "root";

    private _getFragmentAssembler(obj: any): FragmentAssembler {
        if(obj instanceof FragmentAssembler) {
            return obj;
        } else if (obj === Object(obj) && '__view__' in obj) {
            return obj.__view__();
        } else {
            return getLanguageDefault(obj);
        }
    }

    private _createFragmentId(parentId: FragmentId, name: string): FragmentId {
        const parentHash = parentId.slice(ViewAssembler._kIdPrefix.length);
        return `frag:${parentHash}${name}`;
    }

    /**
     * @param obj
     * @return
     *     `View` data structure that represents the given `obj`.
     */
    public assemble(obj: any): View {
        // An object is "assigned" a `FragmentId` when it is encountered for the first time, but
        // the corresponding `Fragment` object is `null` until the object has been taken off the
        // the queue and processed. This must be the case since the children of an object are
        // processed later than it and since an object may reference itself.
        // TODO: Is there a circular references problem?
        const assigned = new Map<any, FragmentId>([
            [obj, ViewAssembler._kRootId],
        ]);
        const fragments: {[fragmentId: string]: Fragment | null} = {
            [ViewAssembler._kRootId]: null,
        };
        const queue: any[] = [obj];
        while(queue.length > 0) {
            const curr = queue.shift();
            const fragId = assigned.get(curr);

            if(!fragId) throw new Error(
                `Object returned as ref was not assigned a FragmentId: ${JSON.stringify(curr)}`
            );
            
            // Already processed current object.
            if(fragments[fragId] !== null) continue;

            // Process current object and append list of refs to to the queue.
            const fasm = this._getFragmentAssembler(curr);
            const [frag, refs] = fasm.assemble((obj, name) => {
                const existingId = assigned.get(obj);
                if(existingId) return existingId;
                const createdId = this._createFragmentId(fragId, name);
                assigned.set(obj, createdId);
                fragments[createdId] = null;
                return createdId;
            });
            fragments[fragId] = frag;
            queue.push(...refs);
        }

        Object.entries(fragments).forEach(([id, frag]) => {
            if(!frag) throw new Error(
                `Object assigned a FragmentId was not returned as a ref: ${id}`
            );
        })
        
        return {
            rootId: ViewAssembler._kRootId,
            fragments: fragments as any as {[fragmentId: string]: Fragment},
        }
    }
}

export function assemble(obj: any): View {
    return (new ViewAssembler()).assemble(obj);
}

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