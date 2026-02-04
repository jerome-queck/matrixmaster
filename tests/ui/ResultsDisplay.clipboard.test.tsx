import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ResultsDisplay } from '../../components/ResultsDisplay';
import { parseInput } from '../../services/matrixService';
import type { MatrixOperationsResult, ValidMatrix } from '../../types';

const makeSmallMatrix = (): ValidMatrix =>
  [
    [parseInput('1'), parseInput('2')],
    [parseInput('3'), parseInput('4')],
  ] as ValidMatrix;

const originalClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

describe('ResultsDisplay clipboard integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it('invokes onClipboardError when copy fails', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false);
    const onClipboardError = vi.fn();

    const result: MatrixOperationsResult = {
      steps: [],
      finalResult: makeSmallMatrix(),
      conditions: [],
    };

    render(
      <ResultsDisplay
        results={result}
        appMode="matrixOperations"
        originalMatrix={null}
        openSections={{}}
        onToggleSection={() => undefined}
        onRequestDetails={() => undefined}
        onUseResult={() => undefined}
        loadingDetails={null}
        onExplain={() => undefined}
        onClipboardError={onClipboardError}
      />
    );

    await user.click(screen.getByRole('button', { name: /copy latex/i }));

    expect(onClipboardError).toHaveBeenCalledWith('Clipboard unavailable. Unable to copy LaTeX.');
  });
});
