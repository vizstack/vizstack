import type { CanvasState } from './reducers';
import type { DisplayId } from '../displaytable/outputs';
import type { ViewId } from '../../core/schema';
import { createSelector } from 'reselect';

export type Display = {
    displayId: DisplayId,
    viewId?: ViewId,
}

/**
 * Returns an array of `VizId`s in order of layout in the canvas.
 * @param state
 * @returns Array<VizId>
 */
export function getCanvasLayout(state: CanvasState): Array<Display> {
    return state.layout;
}
