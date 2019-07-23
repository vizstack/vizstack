/**
 * Utility functions to format string representations of data.
 */

export function fixedWidthNumber(n: number, maxWholeDigits = 5, maxFractionDigits = 4) {
    // TODO: Copy Pytorch number formatting scheme, which uses exponentials.
    return `${n.toFixed(maxFractionDigits)}`;
}
