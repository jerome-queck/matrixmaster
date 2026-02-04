import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard, readFromClipboard } from '../../services/clipboardService';

const originalClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

const setClipboard = (value: any) => {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
  });
};

afterEach(() => {
  setClipboard(originalClipboard);
  document.execCommand = originalExecCommand;
});

describe('copyToClipboard', () => {
  it('uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const ok = await copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API is unavailable', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(true);
    const ok = await copyToClipboard('fallback');
    expect(ok).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when fallback fails', async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false);
    const ok = await copyToClipboard('fail');
    expect(ok).toBe(false);
  });
});

describe('readFromClipboard', () => {
  it('throws when clipboard API is unavailable', async () => {
    setClipboard(undefined);
    await expect(readFromClipboard()).rejects.toThrow('Clipboard unavailable.');
  });
});
