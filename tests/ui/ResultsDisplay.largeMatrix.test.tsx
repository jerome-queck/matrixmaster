import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsDisplay } from '../../components/ResultsDisplay';
import { parseInput } from '../../services/matrixService';
import type { MatrixOperationsResult, ValidMatrix } from '../../types';

const makeLargeMatrix = (): ValidMatrix =>
  Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => parseInput(String(r + c + 1)))
  ) as ValidMatrix;

describe('ResultsDisplay large matrix gating', () => {
  it('shows View Full Matrix button for matrices larger than 8x8', () => {
    const result: MatrixOperationsResult = {
      steps: [],
      finalResult: makeLargeMatrix(),
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
      />
    );

    expect(screen.getByText('View Full Matrix')).toBeInTheDocument();
  });
});
