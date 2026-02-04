import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseInput } from '../../services/matrixService';
import type { CalculationResult, ReportOptions, VariableAssumption } from '../../types';

const renderToString = vi.hoisted(() => vi.fn(() => '<span>ok</span>'));
vi.mock('katex', () => ({
  default: { renderToString },
}));

import katex from 'katex';
import { ReportView } from '../../components/ReportView';

describe('ReportView', () => {
  it('escapes latex strings for assumptions and determinant', () => {
    const one = parseInput('1');
    const results: CalculationResult = {
      systemType: 'homogeneous',
      conditions: [],
      gaussJordanSteps: [],
      determinant: {
        value: one,
        cofactorSteps: [],
        rowOpSteps: [],
        rowOpFinalCalculation: { description: '', equation: '' },
      },
      inverse: null,
      rowSpaceBasis: null,
      colSpaceBasis: null,
      nullSpace: null,
      homogeneousSolutionSet: null,
      solutionSetRef: null,
      solutionSetRref: null,
      cramersRule: null,
    };

    const reportOptions: ReportOptions = {
      includeCover: false,
      includeTOC: false,
      includeSteps: false,
      includeDetails: false,
      includeAssumptions: true,
      includeTutorNotes: false,
    };

    const variableAssumptions: VariableAssumption[] = [
      { variable: 'a', constraint: 'nonzero' },
    ];

    render(
      <ReportView
        results={results}
        appMode="systemSolver"
        originalMatrix={[[one]]}
        variableAssumptions={variableAssumptions}
        reportOptions={reportOptions}
      />
    );

    const calls = (katex as { renderToString: typeof renderToString }).renderToString.mock.calls;
    const latexArgs = calls.map(([latex]) => latex as string);

    expect(latexArgs.some((latex) => latex.includes('\\text{a}'))).toBe(true);
    expect(latexArgs.some((latex) => latex.includes('\\det'))).toBe(true);

    for (const latex of latexArgs) {
      expect(latex).not.toContain('\t');
    }
  });
});
