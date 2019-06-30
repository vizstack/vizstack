// @flow
// TODO: document this. Until then, look at Python bindings, since this closely mirrors them.
import { View, _getView } from './view';

// TODO: We can't type this until we can import stuff from `schema.js` in core, but that would create a cyclic dependency
export function assemble(obj: any): {
    rootId: string,
    models: any,
} {
    const toAdd: Array<View> = [_getView(obj)];
    const added: Set<string> = new Set();
    const returnDict: {rootId: string, models: any} = {
        rootId: toAdd[0].id,
        models: {},
    };
    while (toAdd.length > 0) {
        const view = toAdd.pop();
        const viewId = view.id;
        if (added.has(viewId)) {
            continue;
        }
        added.add(viewId);
        const { viewModel, referencedViews } = view.assemble();
        returnDict.models[viewId] = viewModel;
        toAdd.push(...referencedViews);
    }
    return returnDict;
}