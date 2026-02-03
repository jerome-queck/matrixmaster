import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDelayedFlag } from '../../hooks/useDelayedFlag';

describe('useDelayedFlag', () => {
  it('delays visibility until timeout elapses', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active, delay }) => useDelayedFlag(active, delay), {
      initialProps: { active: true, delay: 200 },
    });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    rerender({ active: false, delay: 200 });
    expect(result.current).toBe(false);

    vi.useRealTimers();
  });
});
