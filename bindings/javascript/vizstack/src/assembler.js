// @flow
import cuid from 'cuid';
import { View, ViewPlaceholder, _getView } from './view';

function _getViewId(obj, viewIds) {
    if (!(obj in viewIds)) {
        viewIds.set(obj, `@id:${cuid()}`);
    }
    return viewIds.get(obj);
}

function _replaceViewWithId(obj, viewIds, referencedViews) {
    if (Array.isArray(obj)) {
        return obj.map((elem) => _replaceViewWithId(elem, viewIds, referencedViews));
    }
    else if (obj instanceof View) {
        return _getViewId(obj, viewIds);
    }
    else if (typeof obj === 'object' && obj !== null) {
        const replacedDict = {};
        Object.entries(obj).forEach(([key, value]) => {
            replacedDict[key] = _replaceViewWithId(value, viewIds, referencedViews);
        });
        return replacedDict;
    }
    else {
        return obj;
    }
}

// TODO: typing here
export function assemble(obj: any): {
    rootId: string,
    models: any,
} {
    let objViewId: string | undefined;
    const models: { [string]: {} } = {};
    const viewIds: Map = new Map();
    const toAdd: Array = [_getView(obj)];
    const added: Set<string> = new Set();
    while (toAdd.length > 0) {
        const view = toAdd.pop();
        const viewId = _getViewId(view, viewIds);
        if (!objViewId) {
            objViewId = viewId;
        }
        if (added.has(viewId)) {
            continue;
        }
        added.add(viewId);
        const viewDict = view.assembleDict();
        const referencedViews = [];
        models[viewId] = _replaceViewWithId(viewDict, viewIds, referencedViews);
        toAdd.push(...referencedViews);
    }
    return {
        rootId: objViewId,
        models,
    };
}