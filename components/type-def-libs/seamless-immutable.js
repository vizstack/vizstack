declare module 'seamless-immutable' {
    declare type Immutable<T> = T & {
        set(key: $Keys<T>, value: any): Immutable<T>,
        setIn(keys: Array<$Keys<T>>, value: any): T,
        merge<U>(u: U, opts?: { deep: boolean }): Immutable<T & U>,
        replace<U: $Subtype<T>>(u: U, opts?: { deep: boolean }): Immutable<T>,
        update<U>(key: $Keys<T>, fn: (U, ...args: any) => U, ...args: any): Immutable<T>,
        updateIn<U>(keys: Array<$Keys<T>>, fn: (U, ...args: any) => U, ...args: any): Immutable<T>,
        getIn(path: string[], defaultValue?: any): any,
        without<U>(key: string | string[]): U,
        without<U>(keys: string[]): U,
        without<U>(...args: string[]): U,
        without<U>(keyFunction: (value: any, key: string) => boolean): U,
        asMutable(): T,
    };

    declare type ImmutableStatic = {
        static: ImmutableStatic,
        from<T>(v: T): Immutable<T>,
        flatMap<T>(v: Array<T | Immutable<T>>, fn: (T) => T[]): Immutable<T[]>,
        asObject<T>(v: Array<T | Immutable<T>>, fn: (T) => [string, any]): Immutable<T[]>,
        merge<T, U>(t: Immutable<T>, u: U, opts?: { deep: boolean }): Immutable<T & U>,
        replace<T, U: $Subtype<T>>(t: Immutable<T>, u: U, opts?: { deep: boolean }): Immutable<T>,
        update<T, U>(
            t: Immutable<T>,
            key: $Keys<T>,
            fn: (U, ...args: any) => U,
            ...args: any
        ): Immutable<T>,
        updateIn<T, U>(
            t: Immutable<T>,
            keys: Array<$Keys<T>>,
            fn: (U, ...args: any) => U,
            ...args: any
        ): Immutable<T>,
        getIn<T>(t: Immutable<T>, path: string[], defaultValue?: any): any,
        without<T, U>(t: Immutable<T>, key: string | string[]): U,
        without<T, U>(t: Immutable<T>, keys: string[]): U,
        without<T, U>(t: Immutable<T>, ...args: string[]): U,
        without<T, U>(t: Immutable<T>, keyFunction: (value: any, key: string) => boolean): U,
        asMutable<T>(t: Immutable<T>): T,
        isImmutable(v: any): boolean,
    };

    declare module.exports: ImmutableStatic & (<T>(t: T) => Immutable<T>);
}
