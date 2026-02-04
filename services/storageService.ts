type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StorageFacade = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => boolean;
    removeItem: (key: string) => boolean;
    isAvailable: () => boolean;
};

export const createSafeStorage = (
    storage: StorageLike | null | undefined,
    onError?: (error: unknown) => void
): StorageFacade => {
    let available = true;
    let reported = false;

    const report = (error: unknown) => {
        if (!reported) {
            reported = true;
            onError?.(error);
        }
        available = false;
    };

    const getItem = (key: string) => {
        if (!storage || !available) return null;
        try {
            return storage.getItem(key);
        } catch (error) {
            report(error);
            return null;
        }
    };

    const setItem = (key: string, value: string) => {
        if (!storage || !available) return false;
        try {
            storage.setItem(key, value);
            return true;
        } catch (error) {
            report(error);
            return false;
        }
    };

    const removeItem = (key: string) => {
        if (!storage || !available) return false;
        try {
            storage.removeItem(key);
            return true;
        } catch (error) {
            report(error);
            return false;
        }
    };

    return {
        getItem,
        setItem,
        removeItem,
        isAvailable: () => Boolean(storage && available)
    };
};

export const safeJsonParse = <T>(
    raw: string | null | undefined,
    fallback: T,
    validator?: (value: unknown) => value is T
): T => {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (validator && !validator(parsed)) return fallback;
        return parsed as T;
    } catch {
        return fallback;
    }
};
