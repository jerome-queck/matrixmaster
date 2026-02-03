import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MatrixInput } from '../../components/MatrixInput';
import { stringifySymbolicFraction } from '../../services/matrixService';
import type { Matrix } from '../../types';

describe('MatrixInput', () => {
  it('parses clipboard rows separated by CRLF', async () => {
    const user = userEvent.setup();
    const readText = vi.fn().mockResolvedValue('1,2\r\n3,4');

    Object.defineProperty(navigator, 'clipboard', {
      value: { readText },
      configurable: true,
    });

    const matrix: Matrix = [
      [null, null],
      [null, null],
    ];

    const onMatrixChange = vi.fn();

    render(
      <MatrixInput
        rows={2}
        cols={2}
        matrix={matrix}
        systemType="homogeneous"
        onMatrixChange={onMatrixChange}
        onSave={() => {}}
        onLoad={() => {}}
        title="Test"
      />
    );

    await user.click(screen.getByRole('button', { name: /paste from clipboard/i }));

    await waitFor(() => expect(onMatrixChange).toHaveBeenCalled());

    const updated = onMatrixChange.mock.calls[0][0] as Matrix;
    const updatedStrings = updated.map((row) => row.map((cell) => stringifySymbolicFraction(cell)));

    expect(updatedStrings).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});
