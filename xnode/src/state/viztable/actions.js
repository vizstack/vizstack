import { VizId, VizSpec } from './outputs';

/** Action type definitions. */
export const VizTableActions = Object.freeze({
    CLEAR_TABLE: 'viztable::CLEAR_TABLE',
    ADD_SLICE: 'viztable::ADD_SLICE',
});

/**
 * Action creator to remove all entries from the viz table.
 * @returns
 *      An action object.
 */
export function clearVizTableAction() {
    return {
        type: VizTableActions.CLEAR_TABLE,
    };
}

/**
 * Action creator to add a viz table slice (mapping vizIds to vizSpecs) to the central viz table.
 * @param vizTableSlice
 *      A mapping of VizIds to VizSpecs.
 * @returns
 *      An action object.
 */
export function addVizTableSliceAction(vizTableSlice: { [VizId]: VizSpec }) {
    return {
        type: VizTableActions.ADD_SLICE,
        vizTableSlice,
    };
}
