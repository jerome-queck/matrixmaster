import type { AnyResult, CalculationResult, MatrixAnalysisResult, MatrixOperationsResult, NumberFormatOptions, ValidMatrix } from '../types';
import {
  formatAugmentedMatrixToLatex,
  formatMatrixToLatex,
  formatNumberToLatex,
  formatNumericMatrixToLatex,
  formatSymbolicFractionToLatex,
} from './matrixService';

type StepsBundle = {
  md: string;
  texDoc: string;
  latexBlock: string;
};

const escapeTexText = (input: string) => input.replace(/[&%$#_{}]/g, (m) => `\\${m}`);

const formatOpLatex = (op: string) => {
  const looksLikeLatex = /[\\_^{}]/.test(op);
  return looksLikeLatex ? op : `\\text{${escapeTexText(op)}}`;
};

export const buildStepsBundle = (
  results: AnyResult | null,
  numberFormat: NumberFormatOptions
): StepsBundle | null => {
  if (!results) return null;

  const sections: { title: string; blocks: string[] }[] = [];
  const addSection = (title: string, blocks: string[]) => {
    if (blocks.length > 0) sections.push({ title, blocks });
  };

  if ('systemType' in results) {
    const systemResult = results as CalculationResult;
    const formatter = (m: ValidMatrix) =>
      systemResult.systemType === 'non-homogeneous'
        ? formatAugmentedMatrixToLatex(m, systemResult.systemType)
        : formatMatrixToLatex(m);
    const steps = systemResult.gaussJordanSteps.map((step) => {
      const op = step.operation || 'Step';
      const matrix = step.matrix ? formatter(step.matrix) : '';
      return matrix ? `${formatOpLatex(op)}\\\\${matrix}` : formatOpLatex(op);
    });
    addSection('System Solver Steps', steps);
    if (systemResult.determinant) {
      addSection('Determinant', [`\\det(A) = ${formatSymbolicFractionToLatex(systemResult.determinant.value)}`]);
    }
    if (systemResult.inverse?.inverseMatrix) {
      addSection('Inverse', [`A^{-1} = ${formatMatrixToLatex(systemResult.inverse.inverseMatrix)}`]);
    }
  } else if ('finalResult' in results) {
    const opsResult = results as MatrixOperationsResult;
    const steps = opsResult.steps.map((step) => `${formatOpLatex(step.operation)}\\\\${formatMatrixToLatex(step.result)}`);
    addSection('Matrix Operation Steps', steps);
  } else if ('kind' in results && results.kind === 'analysis') {
    const analysis = results as MatrixAnalysisResult;
    const blocks = [`\\text{Rank: } ${analysis.rank}`];
    if (analysis.trace !== undefined) {
      const traceLatex =
        analysis.mode === 'numeric' ? formatNumberToLatex(analysis.trace, numberFormat) : formatSymbolicFractionToLatex(analysis.trace);
      blocks.push(`\\operatorname{tr}(A) = ${traceLatex}`);
    }
    if (analysis.metrics) {
      if (analysis.metrics.determinant !== undefined) blocks.push(`\\det(A) = ${formatNumberToLatex(analysis.metrics.determinant, numberFormat)}`);
      if (analysis.metrics.norm1 !== undefined) blocks.push(`\\lVert A \\rVert_1 = ${formatNumberToLatex(analysis.metrics.norm1, numberFormat)}`);
      if (analysis.metrics.normInf !== undefined) blocks.push(`\\lVert A \\rVert_{\\infty} = ${formatNumberToLatex(analysis.metrics.normInf, numberFormat)}`);
      if (analysis.metrics.normFro !== undefined) blocks.push(`\\lVert A \\rVert_F = ${formatNumberToLatex(analysis.metrics.normFro, numberFormat)}`);
      if (analysis.metrics.norm2 !== undefined) blocks.push(`\\lVert A \\rVert_2 = ${formatNumberToLatex(analysis.metrics.norm2, numberFormat)}`);
      if (analysis.metrics.conditionNumber !== undefined) {
        const cond = Number.isFinite(analysis.metrics.conditionNumber) ? formatNumberToLatex(analysis.metrics.conditionNumber, numberFormat) : '\\infty';
        blocks.push(`\\kappa(A) = ${cond}`);
      }
    }
    addSection('Analysis Summary', blocks);
  }

  const md = sections
    .map((section) => `## ${section.title}\n\n${section.blocks.map((block) => `$$${block}$$`).join('\n\n')}`)
    .join('\n\n');
  const texBody = sections
    .map((section) => `\\section*{${section.title}}\n${section.blocks.map((block) => `\\[\n${block}\n\\]`).join('\n\n')}`)
    .join('\n\n');
  const texDoc = `\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage[margin=1in]{geometry}\n\\begin{document}\n${texBody}\n\\end{document}\n`;
  const latexBlock = sections
    .map((section) => `% ${section.title}\n${section.blocks.map((block) => `\\[\n${block}\n\\]`).join('\n\n')}`)
    .join('\n\n');

  return { md, texDoc, latexBlock };
};
