import JSON5 from 'json5';

import { FragmentAssembler } from './fragment-assembler';
import { Token, Sequence, KeyValue, Switch } from './assemblers';

const kMinShownLength = 10;

export function getLanguageDefault(obj: any): FragmentAssembler {
    if (obj !== Object(obj)) {
        // Primitive like number, string, or symbol.
        return Token(typeof obj === 'string' ? `"${obj}"` : `${obj}`);
    } else if (Array.isArray(obj)) {
        return Sequence(obj, {
            orientation: 'horizontal', 
            startMotif: `${obj.length < kMinShownLength ? '' : `[${obj.length}] `}[`, 
            endMotif: ']',
        });
    } else if (obj instanceof Set) {
        return Sequence(Array.from(obj), {
            orientation: 'horizontal',
            startMotif: `${obj.size < kMinShownLength ? '' : `[${obj.size}] `}{`,
            endMotif: '}',
        });
    } else if (obj instanceof Map) {
        return KeyValue(
            Array.from(obj.entries()), {
                startMotif: `${obj.size < kMinShownLength ? '' : `[${obj.size}] `}{`,
                endMotif: '}',
            }
        );
    } else if (typeof obj === 'function') {
        const { args, defaults } = getFunctionArgs(obj);
        return KeyValue(
            args.map((arg, idx) => [arg, defaults[idx]]), {
                startMotif: obj.name ? `${obj.name} (` : `Function (`,
                endMotif: ')',
            }
        );
    } else {
        return KeyValue(
            Object.entries(obj), {
                startMotif: `${Object.keys(obj).length < kMinShownLength ? '' : `[${Object.keys(obj).length}] `}{`,
                endMotif: '}',
            }
        );
    }
}

function getFunctionArgs(func: any) {
    const params = (func + '')
        .replace(/[/][/].*$/gm, '') // strip single-line comments
        .replace(/\s+/g, '') // strip white space
        .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
        .split('){', 1)[0]
        .split(')=>')[0]
        .replace(/^[^(]*[(]/, '') // extract the parameters
        /* .replace(/=[^,]+/g, '') // strip any ES6 defaults */
        .split(',')
        .filter(Boolean); // split & filter [""]

    return {
        args: params.map((param) => param.split('=')[0]),
        defaults: params.map((param) => {
            let value = param.split('=').length > 1 ? param.split('=')[1] : undefined;
            try {
                if (value) {
                    value = JSON5.parse(value);
                }
            } catch (error) {}
            return value;
        }),
    };
}

const kCompactNum = 5;

function SwitchSequence(elements: any[], summary: string, startMotif?: string, endMotif?: string) {
    const fullMode = Sequence(elements, { orientation: 'horizontal', startMotif, endMotif });
    const compactMode = Sequence(elements.slice(0, kCompactNum), {
        orientation: 'horizontal',
        startMotif,
        endMotif: '... ' + endMotif,
    });
    const summaryMode = summary;
    if (elements.length <= kCompactNum) {
        return Switch(['full', 'summary'], { full: fullMode, summary: summaryMode });
    } else {
        return Switch(['full', 'summary', 'compact'], {
            full: fullMode,
            summary: summaryMode,
            compact: compactMode,
        });
    }
}

function SwitchKeyValue(
    entries: [any, any][],
    summary: string,
    startMotif?: string,
    endMotif?: string,
) {
    const fullMode = KeyValue(entries, { separator: ':', startMotif, endMotif });
    const compactMode = KeyValue(entries.slice(0, kCompactNum), {
        separator: ':',
        startMotif,
        endMotif: '... ' + endMotif,
    });
    const summaryMode = summary;
    if (entries.length <= kCompactNum) {
        return Switch(['full', 'summary'], { full: fullMode, summary: summaryMode });
    } else {
        return Switch(['full', 'summary', 'compact'], {
            full: fullMode,
            summary: summaryMode,
            compact: compactMode,
        });
    }
}
