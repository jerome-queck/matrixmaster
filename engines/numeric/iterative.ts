import { formatNumberToLatex, numericConjugateGradient, numericGaussSeidel, numericGMRES, numericJacobi } from '../../services/matrixService';
import type { NumericMatrix, NumericVector, NumericWorkflowEnvelope } from './types';
import { EPSILON, assertRectangularMatrix } from './utils';

export type IterativeMethodId = 'jacobi' | 'gauss-seidel' | 'conjugate-gradient' | 'gmres';

export interface IterativeSolverData {
    method: IterativeMethodId;
    solution: NumericVector;
    residuals: number[];
    iterations: number;
    converged: boolean;
    tolerance: number;
    maxIterations: number;
    finalResidual: number;
    residualReductionRatio: number;
}

export interface IterativeSolverOptions {
    tolerance?: number;
    maxIterations?: number;
}

const methodLabel: Record<IterativeMethodId, string> = {
    jacobi: 'Jacobi',
    'gauss-seidel': 'Gauss-Seidel',
    'conjugate-gradient': 'Conjugate Gradient',
    gmres: 'GMRES'
};

const vectorToCsv = (vector: NumericVector): string => vector.map((value) => `${value}`).join('\n');

const isSquare = (matrix: NumericMatrix): boolean => matrix.length > 0 && matrix.length === matrix[0].length;

const hasZeroDiagonal = (matrix: NumericMatrix, tolerance: number): boolean =>
    matrix.some((row, idx) => Math.abs(row[idx] ?? 0) <= tolerance);

const isSymmetric = (matrix: NumericMatrix, tolerance: number): boolean => {
    if (!isSquare(matrix)) return false;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = i + 1; j < matrix.length; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > tolerance) return false;
        }
    }
    return true;
};

export const runIterativeSolver = (
    method: IterativeMethodId,
    matrix: NumericMatrix,
    rhs: NumericVector,
    options: IterativeSolverOptions = {}
): NumericWorkflowEnvelope<IterativeSolverData> => {
    assertRectangularMatrix(matrix, 'A');
    if (!isSquare(matrix)) throw new Error('Iterative solvers require a square coefficient matrix.');
    if (rhs.length !== matrix.length) throw new Error('Vector b dimension mismatch.');

    const tolerance = options.tolerance ?? 1e-8;
    const maxIterations = options.maxIterations ?? (method === 'gmres' ? 80 : 200);
    const warnings: string[] = [];

    if ((method === 'jacobi' || method === 'gauss-seidel') && hasZeroDiagonal(matrix, tolerance)) {
        warnings.push('Zero diagonal entry detected; convergence is not guaranteed.');
    }
    if (method === 'conjugate-gradient' && !isSymmetric(matrix, 1e-8)) {
        warnings.push('Matrix is not symmetric; conjugate-gradient assumptions are violated.');
    }

    let raw: { x: number[]; residuals: number[] };
    if (method === 'jacobi') raw = numericJacobi(matrix, rhs, tolerance, maxIterations);
    else if (method === 'gauss-seidel') raw = numericGaussSeidel(matrix, rhs, tolerance, maxIterations);
    else if (method === 'conjugate-gradient') raw = numericConjugateGradient(matrix, rhs, tolerance, maxIterations);
    else raw = numericGMRES(matrix, rhs, tolerance, maxIterations);

    const iterations = raw.residuals.length;
    const finalResidual = iterations > 0 ? raw.residuals[iterations - 1] : Number.POSITIVE_INFINITY;
    const initialResidual = iterations > 0 ? raw.residuals[0] : Number.POSITIVE_INFINITY;
    const residualReductionRatio = initialResidual > EPSILON ? finalResidual / initialResidual : 1;
    const converged = finalResidual <= tolerance;

    if (!converged) warnings.push('Solver stopped before meeting tolerance.');

    const data: IterativeSolverData = {
        method,
        solution: raw.x,
        residuals: raw.residuals,
        iterations,
        converged,
        tolerance,
        maxIterations,
        finalResidual,
        residualReductionRatio
    };

    return {
        data,
        warnings,
        latex: {
            summary: `${methodLabel[method]}: \\|r_k\\|_2 \\approx ${formatNumberToLatex(finalResidual)} \\text{ after } ${iterations} \\text{ iterations.}`,
            scalars: {
                finalResidual: formatNumberToLatex(finalResidual),
                iterations: formatNumberToLatex(iterations),
                reductionRatio: formatNumberToLatex(residualReductionRatio)
            }
        },
        reuse: {
            vectors: { solution: raw.x, residuals: raw.residuals },
            scalars: { finalResidual, iterations, converged: converged ? 1 : 0 }
        },
        exports: {
            csv: {
                solution: vectorToCsv(raw.x),
                residuals: vectorToCsv(raw.residuals)
            },
            json: data
        }
    };
};

export const runJacobiWorkflow = (
    matrix: NumericMatrix,
    rhs: NumericVector,
    options?: IterativeSolverOptions
): NumericWorkflowEnvelope<IterativeSolverData> => runIterativeSolver('jacobi', matrix, rhs, options);

export const runGaussSeidelWorkflow = (
    matrix: NumericMatrix,
    rhs: NumericVector,
    options?: IterativeSolverOptions
): NumericWorkflowEnvelope<IterativeSolverData> => runIterativeSolver('gauss-seidel', matrix, rhs, options);

export const runConjugateGradientWorkflow = (
    matrix: NumericMatrix,
    rhs: NumericVector,
    options?: IterativeSolverOptions
): NumericWorkflowEnvelope<IterativeSolverData> => runIterativeSolver('conjugate-gradient', matrix, rhs, options);

export const runGMRESWorkflow = (
    matrix: NumericMatrix,
    rhs: NumericVector,
    options?: IterativeSolverOptions
): NumericWorkflowEnvelope<IterativeSolverData> => runIterativeSolver('gmres', matrix, rhs, options);
