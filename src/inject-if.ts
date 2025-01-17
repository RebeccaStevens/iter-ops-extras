import {IterationState, Operation, SyncValue, UnknownIterable, map, spread, wait} from 'iter-ops';

/**
 * NOTES: 1) This operator requires "iter-ops" v2.7.0 or later, as it relies on the following update:
 *           https://github.com/vitaly-t/iter-ops/issues/200
 *        2) If predicate returns a Promise inside a synchronous pipeline, an error will be thrown:
 *           TypeError: Value at index 0 is not iterable: {}
 */

/**
 * Conditionally injects value(s) after current value.
 */
export function appendIf<T, R>(value: SyncValue<R>, predicate: (value: T, index: number, state: IterationState) => boolean | Promise<boolean>): Operation<T, T | R> {
    return injectIf(predicate, current => [current, ...safeIterable(value)]);
}

/**
 * Conditionally injects value(s) before current value.
 */
export function prependIf<T, R>(value: SyncValue<R>, predicate: (value: T, index: number, state: IterationState) => boolean | Promise<boolean>): Operation<T, T | R> {
    return injectIf(predicate, current => [...safeIterable(value), current]);
}

/**
 * Conditionally injects value(s) in place of the current value.
 */
export function replaceIf<T, R>(value: SyncValue<R>, predicate: (value: T, index: number, state: IterationState) => boolean | Promise<boolean>): Operation<T, T | R> {
    return injectIf(predicate, () => safeIterable(value));
}

/**
 * Conditional injector of synchronous iterables, with support for asynchronous predicate result.
 */
function injectIf<T, R>(predicate: (value: T, index: number, state: IterationState) => boolean | Promise<boolean>, cb: (current: T) => SyncValue<R>): Operation<T, T | R> {
    return i => {
        const m = map((a: T, index: number, state: IterationState) => {
            const r = predicate(a, index, state) as any;
            const isPromise = r && typeof r.then === 'function';
            const out = (pass: boolean) => pass ? cb(a) : [a];
            return isPromise ? r.then(out) : out(r);
        })(i) as UnknownIterable<any>;
        const w = wait()(m) as UnknownIterable<any>;
        return spread()(w) as UnknownIterable<any>; // will throw, if predicate returns a Promise inside synchronous pipeline
    };
}

/**
 * Makes value a safe iterable.
 */
function safeIterable<T>(value: SyncValue<T>): Iterable<T> {
    return (value && typeof (value as any)[Symbol.iterator] === 'function' ? value : [value]) as Iterable<T>;
}
