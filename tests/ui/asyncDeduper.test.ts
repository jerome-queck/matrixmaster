import { describe, expect, it, vi } from 'vitest';
import { createAsyncDeduper } from '../../services/asyncDeduper';

describe('createAsyncDeduper', () => {
  it('dedupes in-flight promises for the same key', async () => {
    const deduper = createAsyncDeduper();
    const factory = vi.fn(() => Promise.resolve(42));

    const first = deduper.getOrCreate('key', factory);
    const second = deduper.getOrCreate('key', factory);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(await first).toBe(42);
    expect(await second).toBe(42);
  });

  it('allows a new request after completion', async () => {
    const deduper = createAsyncDeduper();
    const factory = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    await deduper.getOrCreate('key', factory);
    await deduper.getOrCreate('key', factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });
});
