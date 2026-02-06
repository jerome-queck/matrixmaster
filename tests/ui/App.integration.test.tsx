import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import App from '../../App';

const originalClipboard = navigator.clipboard;
const originalStorage = window.localStorage;
const originalWorker = (globalThis as any).Worker;
const restoreClipboard = () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
};

describe('App integration', () => {
  const setWorkerMock = () => {
    (globalThis as any).Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage() {}
      terminate() {}
    };
  };
  const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
    const header = screen.getAllByRole('banner')[0];
    await user.click(within(header).getByRole('button', { name: /open more menu/i }));
    const title = await screen.findByText('More', { selector: 'h2' });
    const dialog = title.closest('[role="dialog"]');
    if (!dialog) throw new Error('More dialog not found');
    return dialog as HTMLElement;
  };
  const openExportImport = async (user: ReturnType<typeof userEvent.setup>) => {
    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /export \/ import/i }));
  };

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    restoreClipboard();
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
    });
    (globalThis as any).Worker = originalWorker;
  });

  it('shows a toast when storage writes fail', async () => {
    setWorkerMock();
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Local storage unavailable. Changes won’t persist.')).toBeInTheDocument();
    });
  });

  it('shows a toast when clipboard paste fails', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    setWorkerMock();

    render(<App />);

    const pasteButtons = screen.getAllByRole('button', { name: /paste from clipboard/i });
    await user.click(pasteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Clipboard unavailable. Unable to paste.').length).toBeGreaterThan(0);
    });
  });

  it('falls back to default profile when stored profiles are invalid', async () => {
    setWorkerMock();
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === 'matrix-master-profiles') return '{bad json';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);

    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /advanced tools/i }));
    const toolsDialog = screen.getByRole('dialog', { name: /advanced tools/i });
    await user.click(within(toolsDialog).getByRole('button', { name: /workspace utilities/i }));
    await user.click(within(toolsDialog).getByRole('button', { name: /workspace profiles/i }));

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows copy-to-clipboard controls in export modal', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    await openExportImport(user);
    const copySection = await screen.findByText('Copy to Clipboard');
    const dialog = copySection.closest('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const { getByRole } = within(dialog as HTMLElement);
    expect(getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('shows core-first controls by default and hides top-level advanced shortcuts', () => {
    setWorkerMock();
    render(<App />);

    expect(screen.getByRole('button', { name: /open more menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calculate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open tools/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export or import/i })).not.toBeInTheDocument();
  });

  it('opens advanced tools from more menu', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /advanced tools/i }));
    const toolsDialog = screen.getByRole('dialog', { name: /advanced tools/i });
    expect(within(toolsDialog).getByRole('button', { name: /data & sharing/i })).toBeInTheDocument();
    expect(within(toolsDialog).getByRole('button', { name: /specialist math/i })).toBeInTheDocument();
  });
});
