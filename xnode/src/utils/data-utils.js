/**
 * Utility functions to manipulate common data structures.
 */

/**
 * Transform key-value pairs in an object into new key-value pairs, or `undefined` to omit.
 *     let obj = { 1: 1, 2: 2, 3: 3 };
 *     obj2obj(obj, (k, v, i) => [k, v * 2]);
 *     >> { 1: 2, 2: 4, 3: 6 }
 */
export function obj2obj(obj, transform: (k, v, i) => [string, any]): {} {
    return pairs2obj(
        Object.entries(obj)
            .map(([k, v], i) => transform(k, v, i))
            .filter((pair) => pair !== undefined),
    );
}

/**
 * Transform key-value pairs in an object into elements of an array, or `undefined` to omit.
 *     let obj = { 1: 4, 2: 3, 3: 2 };
 *     obj2arr(obj, (k, v, i) => Number(k) + v);
 *     >> [5, 5, 5]
 */
export function obj2arr(obj, transform: (k, v, i) => any): Array {
    return Object.entries(obj)
        .map(([k, v], i) => transform(k, v, i))
        .filter((elem) => elem !== undefined);
}

/**
 * Transform elements of an array into key-value pairs in an object, or `undefined` to omit.
 *     let arr = [5, 4, 3];
 *     arr2obj(arr, (x, i) => [String(x), i]);
 *     >> { 5: 0, 4: 1, 3: 2 }
 */
export function arr2obj(arr, transform: (x, i) => [string, any]): {} {
    return pairs2obj(arr.map((x, i) => transform(x, i)).filter((pair) => pair !== undefined));
}

/**
 * Transform array of pairs into key-value pairs in an object.
 *     let pairs = [["1", 1], ["2", 2]];
 *     pairs2obj(pairs);
 *     >> { 1: 1, 2: 2 }
 */
export function pairs2obj(pairs: Array<[string, any]>): {} {
    return pairs.reduce((obj, [k, v]) => {
        obj[k] = v;
        return obj;
    }, {});
}

// TODO: Implement functions for `Map` (keys not limited to strings).
