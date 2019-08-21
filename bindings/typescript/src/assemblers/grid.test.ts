import { withinBounds, parseGridString } from './grid';

describe('withinBounds()', () => {
    test('includes cells within', () => {
        const bounds = { r: 0, R: 2, c: 0, C: 2 };
        expect(withinBounds(bounds, 0, 0)).toBe(true);
        expect(withinBounds(bounds, 1, 1)).toBe(true);
        expect(withinBounds(bounds, 2, 2)).toBe(true);
    });
    test('excludes cells outside', () => {
        const bounds = { r: 0, R: 2, c: 0, C: 2 };
        expect(withinBounds(bounds, -1, -1)).toBe(false);
        expect(withinBounds(bounds, 3, 3)).toBe(false);
    });
});

describe('parseGridString()', () => {
    test('ignores whitespace properly', () => {
        // prettier-ignore
        const spec = `
              A A B
            C D   B
        `;
        expect(parseGridString(spec)).toMatchObject({
            A: { row: 0, col: 0, height: 1, width: 2 },
            B: { row: 0, col: 2, height: 2, width: 1 },
            C: { row: 1, col: 0, height: 1, width: 1 },
            D: { row: 1, col: 1, height: 1, width: 1 },
            
        });
    });
    test('parses offset cells', () => {
        // prettier-ignore
        const spec = `
            AAB
            CDD
        `;
        expect(parseGridString(spec)).toMatchObject({
            A: { row: 0, col: 0, height: 1, width: 2 },
            B: { row: 0, col: 2, height: 1, width: 1 },
            C: { row: 1, col: 0, height: 1, width: 1 },
            D: { row: 1, col: 1, height: 1, width: 2 },
        });
    });
    test('parses valid vertical string', () => {
        // prettier-ignore
        const spec = "A\nB\nC";
        expect(parseGridString(spec)).toMatchObject({
            A: { row: 0, col: 0, height: 1, width: 1 },
            B: { row: 1, col: 0, height: 1, width: 1 },
            C: { row: 2, col: 0, height: 1, width: 1 },
        });
    });
    test('parses valid horizontal string', () => {
        // prettier-ignore
        const spec = "A B C";
        expect(parseGridString(spec)).toMatchObject({
            A: { row: 0, col: 0, height: 1, width: 1 },
            B: { row: 0, col: 1, height: 1, width: 1 },
            C: { row: 0, col: 2, height: 1, width: 1 },
        });
    });
    test('errors on non-rect string', () => {
        // prettier-ignore
        const spec = `
            A A
            B
        `;
        expect(() => parseGridString(spec)).toThrow();
    });
    test('errors on duplicate cell name character', () => {
        // prettier-ignore
        const spec = "A B A";
        expect(() => parseGridString(spec)).toThrow();
    });
    test('parses duplicate empty characters', () => {
        // prettier-ignore
        const spec = "A . B .";
        expect(parseGridString(spec)).toMatchObject({
            A: { row: 0, col: 0, height: 1, width: 1 },
            B: { row: 0, col: 2, height: 1, width: 1 },
        });
    });
});