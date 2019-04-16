import { ViewId, ViewModel } from '../../core/schema';
import { DisplayId, DisplaySpec } from './outputs';

/** Action type definitions. */
export const DisplayTableActions = Object.freeze({
    CLEAR_TABLE: 'displaytable::CLEAR_TABLE',
    ADD_SPEC: 'displaytable::ADD_SPEC',
});

/**
 * Action creator to remove all entries from the viz table.
 * @returns
 *      An action object.
 */
export function clearDisplayTableAction() {
    return {
        type: DisplayTableActions.CLEAR_TABLE,
    };
}

/**
 * Action creator to add a viz table slice (mapping vizIds to vizSpecs) to the central viz table.
 * @param vizTableSlice
 *      A mapping of VizIds to VizSpecs.
 * @returns
 *      An action object.
 */
export function addDisplaySpecAction(displayId: DisplayId, displaySpec: DisplaySpec) {
    return {
        type: DisplayTableActions.ADD_SPEC,
        displayId,
        displaySpec,
    };
}
