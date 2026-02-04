import { describe, expect, it, vi } from 'vitest';
import { createSafeStorage, safeJsonParse } from '../../services/storageService';

describe('safeJsonParse', () => {
  it('returns fallback on invalid JSON', () => {
    const result = safeJsonParse('{"oops"', { ok: false });
    expect(result).toEqual({ ok: false });
  });

  it('returns parsed JSON when valid', () => {
    const result = safeJsonParse('{"ok":true}', { ok: false });
    expect(result).toEqual({ ok: true });
  });
});

describe('createSafeStorage', () => {
  it('disables writes after a failure', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
      removeItem: vi.fn()
    };
    const onError = vi.fn();
    const safe = createSafeStorage(storage, onError);

    expect(safe.setItem('key', 'value')).toBe(false);
    expect(safe.isAvailable()).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);

    expect(safe.setItem('key2', 'value2')).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
