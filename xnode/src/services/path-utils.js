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
export function getMinimalUniquePaths(paths) {
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
