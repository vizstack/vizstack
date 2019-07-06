import JSON5 from 'json5';

import { Text, Sequence, KeyValue, Switch } from './assemblers';
import { FragmentAssembler } from './assembler';

export function getLanguageDefault(obj: any): FragmentAssembler {
    if (obj !== Object(obj)) {
        // Primitive like number, string, or symbol.
        return Text(typeof obj === 'string' ? `"${obj}"` : `${obj}`, 'token');
    } else if (Array.isArray(obj)) {
        return SwitchSequence(
            obj,
            `Array[${obj.length}]`,
            `Array[${obj.length}] [`,
            ']',
        );
    } else if (obj instanceof Set) {
        return SwitchSequence(
            Array.from(obj),
            `Set[${obj.size}]`,
            `Set[${obj.size}] {`,
            '}',
        );
    } else if (obj instanceof Map) {
        return SwitchKeyValue(
            Array.from(obj.entries()).map(([key, value]) => ({ key, value })),
            `Map[${obj.size}]`,
            `Map[${obj.size}] {`,
            '}',
        );
    } else if (typeof obj === 'function') {
        const { args, defaults } = getFunctionArgs(obj);
        return SwitchKeyValue(
            args.map((arg, idx) => ({ key: arg, value: defaults[idx]})),
            obj.name ? `Function[${obj.name}]` : `Function`,
            obj.name ? `Function[${obj.name}] (` : `Function (`,
            ')',
        );
    } else {
        return SwitchKeyValue(
            Object.entries(obj).map(([key, value]) =>({ key, value })),
            `Object[${Object.keys(obj).length}]`,
            `Object[${Object.keys(obj).length}] {`,
            '}',
        );
    }
}

function getFunctionArgs(func: any) {
    const params = (func + '')
        .replace(/[/][/].*$/mg,'') // strip single-line comments
        .replace(/\s+/g, '') // strip white space
        .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
        .split('){', 1)[0]
        .split(')=>')[0]
        .replace(/^[^(]*[(]/, '') // extract the parameters
        /* .replace(/=[^,]+/g, '') // strip any ES6 defaults */
        .split(',').filter(Boolean); // split & filter [""]

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
    }
}

const kCompactNum = 5;

function SwitchSequence(
    elements: any[],
    summary: string,
    startMotif?: string,
    endMotif?: string
) {
    const fullMode = Sequence(
        elements,
        'horizontal',
        startMotif,
        endMotif,
    );
    const compactMode = Sequence(
        elements.slice(0, kCompactNum),
        'horizontal',
        startMotif,
        '... ' + endMotif,
    );
    const summaryMode = summary;
    if (elements.length <= kCompactNum) {
        return Switch(['full', 'summary'], { full: fullMode, summary: summaryMode });
    } else {
        return Switch(['full', 'summary', 'compact'], { full: fullMode, summary: summaryMode, compact: compactMode });
    }
}

function SwitchKeyValue(
    entries: { key: any, value: any }[],
    summary: string,
    startMotif?: string,
    endMotif?: string,
) {
    const fullMode = KeyValue(
        entries,
        ':',
        startMotif,
        endMotif,
    );
    const compactMode = KeyValue(
        entries.slice(0, kCompactNum),
        ':',
        startMotif,
        '... ' + endMotif,
    );
    const summaryMode = summary;
    if (entries.length <= kCompactNum) {
        return Switch(['full', 'summary'], { full: fullMode, summary: summaryMode });
    } else {
        return Switch(['full', 'summary', 'compact'], { full: fullMode, summary: summaryMode, compact: compactMode });
    }
}