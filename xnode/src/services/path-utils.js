/**
 * Utility functions to format path strings.
 */

/**
 * Returns a map from unique filepaths to their minimal disambiguated path suffixes (e.g. filepaths in an IDE tab to
 * distinguish between different open files).
 * @param paths
 *      A list of filepath strings. Duplicates are allowed.
 * @returns
 *      A map from unique filepath strings to the minimal disambiguated path suffixes.
 */
export function getMinimalDisambiguatedPaths(paths: Array<string>): {[string]: string} {
    const uniquePaths: Array<string> = Array.from(new Set(paths));
    const tokenizedPaths: Array<Array<string>> = uniquePaths.map((path) => path.split(/[/\\]+/));

    let tokenFromEnd: number = 1;  // Last token would be 1, second to last would be 2, etc.
    let minimalPaths: Array<string> = [];  // List of shortened paths. Gradually populated when disambiguated.
    let ambiguousIdxs: Array<number> = Array.from(uniquePaths.keys());  // Indices of still ambiguous paths.

    // Continue until all paths are disambiguated.
    while(ambiguousIdxs.length > 0) {

        // Build index from token to indices of paths currently ending with the token.
        let tokenToIdxs: {[string]: Array<number>} = {};
        for(const idx of ambiguousIdxs) {
            const tokens = tokenizedPaths[idx];
            const token = tokens[tokens.length - tokenFromEnd];
            if(token === undefined || token === "" || tokenFromEnd + 1 === tokens.length) {
                minimalPaths[idx] = uniquePaths[idx];
            } else {
                if(!tokenToIdxs[token]) tokenToIdxs[token] = [];
                tokenToIdxs[token].push(idx);
            }
        }

        // Filter out disambiguated paths, and continue to process ambiguous ones.
        ambiguousIdxs = [];
        for(const token in tokenToIdxs) {
            const idxs = tokenToIdxs[token];
            if(idxs.length == 1) {
                const tokens = tokenizedPaths[idxs[0]];
                minimalPaths[idxs[0]] = tokens.slice(-tokenFromEnd).join('/');
            } else {
                ambiguousIdxs.push(...idxs);
            }
        }

        tokenFromEnd++;
    }

    return uniquePaths.reduce((uniqueToMinimal, uniquePath, i) => {
        uniqueToMinimal[uniquePath] = minimalPaths[i]
        return uniqueToMinimal;
    }, {});
}

// console.log("test1", getMinimalDisambiguatedPaths(["/a/z/c/d.py", '/a/b/c/d.py', '/z/a/b/c/d.py', '/']));