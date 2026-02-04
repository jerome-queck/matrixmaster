export const createLruCache = <T>(limit: number) => {
    const cache = new Map<string, T>();

    const get = (key: string): T | undefined => {
        const value = cache.get(key);
        if (value === undefined) return undefined;
        cache.delete(key);
        cache.set(key, value);
        return value;
    };

    const set = (key: string, value: T) => {
        if (cache.has(key)) {
            cache.delete(key);
        }
        cache.set(key, value);
        if (cache.size > limit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey) cache.delete(oldestKey);
        }
    };

    const has = (key: string) => cache.has(key);
    const remove = (key: string) => cache.delete(key);
    const clear = () => cache.clear();

    return { get, set, has, remove, clear, size: () => cache.size };
};
