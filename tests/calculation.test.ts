import {
  calculateRank,
  numericMatrixInverse,
  numericJacobi,
  numericGaussSeidel,
  numericConjugateGradient,
  numericMatrixExp,
  numericMatrixLog,
  numericMatrixSqrt,
  numericConditionNumber,
  numericTrace,
  numericLU,
  numericQR,
  numericEigenSymmetric,
  formatSymbolicFractionToLatex,
  parseInput,
} from '../services/matrixService.ts';
import { buildStepsBundle } from '../services/exportService.ts';
import type { CalculationResult, RowOperationStep } from '../types.ts';

type Matrix = number[][];

const approxEqual = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertMatrixClose = (actual: Matrix, expected: Matrix, eps = 1e-6) => {
  assert(actual.length === expected.length, 'Matrix row count mismatch');
  for (let r = 0; r < actual.length; r++) {
    assert(actual[r].length === expected[r].length, `Matrix col count mismatch at row ${r}`);
    for (let c = 0; c < actual[r].length; c++) {
      assert(
        approxEqual(actual[r][c], expected[r][c], eps),
        `Matrix mismatch at [${r},${c}]: expected ${expected[r][c]}, got ${actual[r][c]}`
      );
    }
  }
};

const assertVectorClose = (actual: number[], expected: number[], eps = 1e-6) => {
  assert(actual.length === expected.length, 'Vector length mismatch');
  for (let i = 0; i < actual.length; i++) {
    assert(
      approxEqual(actual[i], expected[i], eps),
      `Vector mismatch at [${i}]: expected ${expected[i]}, got ${actual[i]}`
    );
  }
};

const toSymbolicMatrix = (matrix: number[][]) =>
  matrix.map(row => row.map(value => parseInput(String(value))));

const run = () => {
  const identity3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  assert(calculateRank(toSymbolicMatrix(identity3) as any) === 3, 'Rank of identity should be 3');

  const invTarget = [
    [1, 2],
    [3, 4],
  ];
  const invExpected = [
    [-2, 1],
    [1.5, -0.5],
  ];
  assertMatrixClose(numericMatrixInverse(invTarget), invExpected, 1e-6);

  const A1 = [
    [4, 1],
    [2, 3],
  ];
  const b1 = [1, 2];
  const jacobi = numericJacobi(A1, b1, 1e-10, 200);
  assertVectorClose(jacobi.x, [0.1, 0.6], 1e-4);

  const gs = numericGaussSeidel(A1, b1, 1e-10, 200);
  assertVectorClose(gs.x, [0.1, 0.6], 1e-4);

  const A2 = [
    [4, 1],
    [1, 3],
  ];
  const b2 = [1, 2];
  const cg = numericConjugateGradient(A2, b2, 1e-12, 100);
  assertVectorClose(cg.x, [0.0909090909, 0.6363636363], 1e-4);

  const expZero = numericMatrixExp([
    [0, 0],
    [0, 0],
  ]);
  assertMatrixClose(expZero, [
    [1, 0],
    [0, 1],
  ], 1e-6);

  const logIdentity = numericMatrixLog([
    [1, 0],
    [0, 1],
  ]);
  assertMatrixClose(logIdentity, [
    [0, 0],
    [0, 0],
  ], 1e-6);

  const sqrtIdentity = numericMatrixSqrt([
    [1, 0],
    [0, 1],
  ]);
  assertMatrixClose(sqrtIdentity, [
    [1, 0],
    [0, 1],
  ], 1e-6);

  assert(approxEqual(numericConditionNumber(identity3), 1, 1e-6), 'Condition number of identity should be 1');
  assert(approxEqual(numericTrace(identity3), 3, 1e-6), 'Trace of identity should be 3');

  const luInput = [
    [4, 3],
    [6, 3],
  ];
  const lu = numericLU(luInput);
  const multiply = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
  const PA = multiply(lu.P, luInput);
  const LU = multiply(lu.L, lu.U);
  assertMatrixClose(PA, LU, 1e-6);

  const qrInput = [
    [1, 1],
    [1, -1],
  ];
  const qr = numericQR(qrInput);
  const QR = multiply(qr.Q, qr.R);
  assertMatrixClose(QR, qrInput, 1e-6);

  const eigInput = [
    [2, 0],
    [0, 3],
  ];
  const eig = numericEigenSymmetric(eigInput);
  assertVectorClose(eig.values.sort((a, b) => a - b), [2, 3], 1e-6);

  const sfLatex = formatSymbolicFractionToLatex(parseInput('1/2'));
  assert(sfLatex.includes('1') && sfLatex.includes('2'), 'Symbolic fraction LaTeX should include numerator and denominator');

  const stepMatrix = toSymbolicMatrix([
    [1, 2],
    [3, 4],
  ]) as any;
  const steps: RowOperationStep[] = [
    { matrix: stepMatrix, operation: 'R_1 \\to R_1 + R_2', description: 'test' },
  ];
  const mockResult: CalculationResult = {
    systemType: 'non-homogeneous',
    conditions: [],
    gaussJordanSteps: steps,
    determinant: null,
    inverse: null,
    rowSpaceBasis: null,
    colSpaceBasis: null,
    nullSpace: null,
    homogeneousSolutionSet: null,
    solutionSetRef: null,
    solutionSetRref: null,
    cramersRule: null,
  };
  const bundle = buildStepsBundle(mockResult as any, { digits: 6, mode: 'fixed', fractionMaxDenominator: 1000 });
  assert(bundle !== null, 'Steps bundle should be generated');
  assert(!bundle!.latexBlock.includes('\\documentclass'), 'Clipboard LaTeX should not include document preamble');
  assert(bundle!.texDoc.includes('\\documentclass'), 'TeX document should include preamble');
  assert(!bundle!.texDoc.includes('\\\\documentclass'), 'TeX document should not contain double-escaped preamble');

  console.log('Calculation tests: PASS');
};

run();
