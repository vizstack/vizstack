import type { CanvasState } from './reducers';
import type { VizId } from '../viztable/outputs';
import { createSelector } from 'reselect';

/**
 * Returns an array of `VizId`s in order of layout in the canvas.
 * @param state
 * @returns Array<VizId>
 */
export function getCanvasLayout(state: CanvasState): Array<VizId> {
    return state.layout;
}