/**
 * Utility functions to format path strings.
 */

/**
 * Returns a mapping of path names to their minimal unique name among the set of all paths.
 * @param paths
 *      A list of path name strings.
 * @returns
 *      An object mapping path name strings to their unique shortened versions.
 */
// TODO: Remove this.
export function getMinimalUniquePaths(paths: Array<string>): {[string]: string} {
    let pathToTokens = {};
    paths.forEach(path => pathToTokens[path] = path.split(/[/\\]+/));
    let pathToCurrentTokenIndex = {};
    paths.forEach(path => pathToCurrentTokenIndex[path] = pathToTokens[path].length - 2);
    let pathToShortened = {};
    let shortenedToPaths = {};
    Object.entries(pathToTokens).forEach(([path, tokens]) => {
        const token = tokens[tokens.length - 1];
        pathToShortened[path] = token;
        if (!(token in shortenedToPaths)) {
            shortenedToPaths[token] = new Set();
        }
        shortenedToPaths[token].add(path);
    });
    paths.forEach(path => {
        let shortened = pathToShortened[path];
        while(shortenedToPaths[shortened].size > 1) {
            shortenedToPaths[shortened].forEach(conflictingPath => {
                const currentTokenIndex = pathToCurrentTokenIndex[conflictingPath];
                if (currentTokenIndex >= 0) {
                    pathToShortened[conflictingPath] = pathToTokens[conflictingPath][currentTokenIndex] + "/" + shortened;
                    pathToCurrentTokenIndex[conflictingPath] -= 1;
                    if (!(pathToShortened[conflictingPath] in shortenedToPaths)) {
                        shortenedToPaths[pathToShortened[conflictingPath]] = new Set();
                    }
                    shortenedToPaths[pathToShortened[conflictingPath]].add(conflictingPath);
                }
            });
            shortenedToPaths[shortened] = new Set([...shortenedToPaths[shortened]].filter(conflictPath => pathToShortened[conflictPath] === shortened));
        }
    });
    return pathToShortened;
}


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