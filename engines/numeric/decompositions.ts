import {
    formatNumberToLatex,
    formatNumericMatrixToCsv,
    formatNumericMatrixToLatex,
    numericConditionNumber,
    numericEigen,
    numericLU,
    numericQR,
    numericSVD
} from '../../services/matrixService';
import type { NumericMatrix, NumericWorkflowEnvelope } from './types';
import {
    EPSILON,
    clusterScalars,
    frobeniusNorm,
    identityMatrix,
    matrixColumns,
    matrixMultiply,
    matrixRank,
    matrixSubtract,
    matrixTranspose,
    matrixVectorMultiply,
    maxAbsEntry,
    vectorNorm2,
    vectorSubtract,
    zeroMatrix,
    assertRectangularMatrix,
    assertSquareMatrix
} from './utils';

export interface EigenMultiplicity {
    eigenvalue: number;
    algebraicMultiplicity: number;
    indices: number[];
}

export interface LuWorkflowData {
    L: NumericMatrix;
    U: NumericMatrix;
    P: NumericMatrix;
    determinant: number;
    rankEstimate: number;
    reconstructionError: number;
    pivotGrowth: number;
}

export interface QrWorkflowData {
    Q: NumericMatrix;
    R: NumericMatrix;
    rankEstimate: number;
    reconstructionError: number;
    orthogonalityError: number;
}

export interface SvdWorkflowData {
    U: NumericMatrix;
    S: NumericMatrix;
    Vt: NumericMatrix;
    singularValues: number[];
    rankEstimate: number;
    conditionNumber: number;
    reconstructionError: number;
}

export interface EigenWorkflowData {
    eigenvalues: number[];
    eigenvectors?: NumericMatrix;
    symmetric: boolean;
    iterations: number;
    converged: boolean;
    maxResidual?: number;
    multiplicities: EigenMultiplicity[];
}

const diagonalProduct = (matrix: NumericMatrix): number => {
    const n = Math.min(matrix.length, matrix[0]?.length ?? 0);
    let product = 1;
    for (let i = 0; i < n; i++) product *= matrix[i][i] ?? 0;
    return product;
};

const buildIdentity = (size: number): NumericMatrix => identityMatrix(size);

export const runLUWorkflow = (
    matrix: NumericMatrix,
    tolerance = EPSILON
): NumericWorkflowEnvelope<LuWorkflowData> => {
    assertSquareMatrix(matrix, 'A');

    const { L, U, P, pivotSign } = numericLU(matrix, tolerance);
    const determinant = pivotSign * diagonalProduct(U);
    const rankEstimate = matrixRank(U, tolerance);
    const PA = matrixMultiply(P, matrix);
    const LU = matrixMultiply(L, U);
    const reconstructionError = frobeniusNorm(matrixSubtract(PA, LU));
    const pivotGrowth = maxAbsEntry(U) / Math.max(maxAbsEntry(matrix), tolerance);

    const warnings: string[] = [];
    if (rankEstimate < matrix.length) warnings.push('Matrix appears singular or nearly singular under LU.');
    if (reconstructionError > 1e-6) warnings.push('LU reconstruction residual is larger than expected.');

    return {
        data: { L, U, P, determinant, rankEstimate, reconstructionError, pivotGrowth },
        warnings,
        latex: {
            summary: `PA = LU, \\det(A) \\approx ${formatNumberToLatex(determinant)}, \\|PA-LU\\|_F \\approx ${formatNumberToLatex(reconstructionError)}`,
            matrices: {
                P: formatNumericMatrixToLatex(P),
                L: formatNumericMatrixToLatex(L),
                U: formatNumericMatrixToLatex(U)
            },
            scalars: {
                determinant: formatNumberToLatex(determinant),
                rankEstimate: formatNumberToLatex(rankEstimate),
                reconstructionError: formatNumberToLatex(reconstructionError)
            }
        },
        reuse: {
            matrices: { P, L, U },
            scalars: { determinant, rankEstimate, reconstructionError, pivotGrowth }
        },
        exports: {
            csv: {
                P: formatNumericMatrixToCsv(P),
                L: formatNumericMatrixToCsv(L),
                U: formatNumericMatrixToCsv(U)
            }
        }
    };
};

export const runQRWorkflow = (
    matrix: NumericMatrix,
    tolerance = EPSILON
): NumericWorkflowEnvelope<QrWorkflowData> => {
    assertRectangularMatrix(matrix, 'A');
    if (matrix.length === 0 || matrix[0].length === 0) throw new Error('A must be non-empty.');

    const { Q, R } = numericQR(matrix, tolerance);
    const reconstruction = matrixMultiply(Q, R);
    const reconstructionError = frobeniusNorm(matrixSubtract(matrix, reconstruction));

    const qtq = matrixMultiply(matrixTranspose(Q), Q);
    const identity = buildIdentity(qtq.length);
    const orthogonalityError = frobeniusNorm(matrixSubtract(qtq, identity));
    const rankEstimate = R.reduce((count, row, i) => count + (Math.abs(row[i] ?? 0) > tolerance ? 1 : 0), 0);

    const warnings: string[] = [];
    if (orthogonalityError > 1e-6) warnings.push('Q is not sufficiently orthonormal at current tolerance.');
    if (reconstructionError > 1e-6) warnings.push('QR reconstruction residual is larger than expected.');

    return {
        data: { Q, R, rankEstimate, reconstructionError, orthogonalityError },
        warnings,
        latex: {
            summary: `A \\approx QR, \\|A-QR\\|_F \\approx ${formatNumberToLatex(reconstructionError)}`,
            matrices: {
                Q: formatNumericMatrixToLatex(Q),
                R: formatNumericMatrixToLatex(R)
            },
            scalars: {
                rankEstimate: formatNumberToLatex(rankEstimate),
                reconstructionError: formatNumberToLatex(reconstructionError),
                orthogonalityError: formatNumberToLatex(orthogonalityError)
            }
        },
        reuse: {
            matrices: { Q, R },
            scalars: { rankEstimate, reconstructionError, orthogonalityError }
        },
        exports: {
            csv: {
                Q: formatNumericMatrixToCsv(Q),
                R: formatNumericMatrixToCsv(R)
            }
        }
    };
};

export const runSVDWorkflow = (
    matrix: NumericMatrix,
    maxIterations = 240,
    tolerance = EPSILON
): NumericWorkflowEnvelope<SvdWorkflowData> => {
    assertRectangularMatrix(matrix, 'A');
    if (matrix.length === 0 || matrix[0].length === 0) throw new Error('A must be non-empty.');

    const { U, S, Vt, singularValues } = numericSVD(matrix, maxIterations, tolerance);
    const n = matrix[0].length;
    const sigma = zeroMatrix(n, n);
    for (let i = 0; i < Math.min(n, singularValues.length); i++) sigma[i][i] = singularValues[i];
    const reconstructed = matrixMultiply(matrixMultiply(U, sigma), Vt);
    const reconstructionError = frobeniusNorm(matrixSubtract(matrix, reconstructed));
    const rankEstimate = singularValues.reduce((count, value) => count + (Math.abs(value) > tolerance ? 1 : 0), 0);
    const conditionNumber = numericConditionNumber(matrix);

    const warnings: string[] = [];
    if (rankEstimate < Math.min(matrix.length, matrix[0].length)) warnings.push('Matrix appears rank-deficient in SVD.');
    if (reconstructionError > 1e-6) warnings.push('SVD reconstruction residual is larger than expected.');

    return {
        data: { U, S, Vt, singularValues, rankEstimate, conditionNumber, reconstructionError },
        warnings,
        latex: {
            summary: `A \\approx U\\Sigma V^T, \\kappa(A) \\approx ${formatNumberToLatex(conditionNumber)}`,
            matrices: {
                U: formatNumericMatrixToLatex(U),
                S: formatNumericMatrixToLatex(S),
                Vt: formatNumericMatrixToLatex(Vt)
            },
            scalars: {
                rankEstimate: formatNumberToLatex(rankEstimate),
                conditionNumber: formatNumberToLatex(conditionNumber),
                reconstructionError: formatNumberToLatex(reconstructionError)
            }
        },
        reuse: {
            matrices: { U, S, Vt },
            scalars: { rankEstimate, conditionNumber, reconstructionError }
        },
        exports: {
            csv: {
                U: formatNumericMatrixToCsv(U),
                S: formatNumericMatrixToCsv(S),
                Vt: formatNumericMatrixToCsv(Vt)
            }
        }
    };
};

export const runEigenWorkflow = (
    matrix: NumericMatrix,
    maxIterations = 320,
    tolerance = 1e-9
): NumericWorkflowEnvelope<EigenWorkflowData> => {
    assertSquareMatrix(matrix, 'A');

    const eig = numericEigen(matrix, maxIterations, tolerance);
    const multiplicities = clusterScalars(eig.values, Math.max(tolerance, 1e-6)).map((cluster) => ({
        eigenvalue: cluster.value,
        algebraicMultiplicity: cluster.indices.length,
        indices: cluster.indices
    }));

    let maxResidual: number | undefined;
    if (eig.vectors) {
        const columns = matrixColumns(eig.vectors);
        let residual = 0;
        columns.forEach((vector, idx) => {
            const av = matrixVectorMultiply(matrix, vector);
            const lv = vector.map((value) => value * (eig.values[idx] ?? 0));
            residual = Math.max(residual, vectorNorm2(vectorSubtract(av, lv)));
        });
        maxResidual = residual;
    }

    const warnings: string[] = [];
    if (!eig.converged) warnings.push('Eigen iteration reached max iterations before full convergence.');
    if (!eig.vectors) warnings.push('Eigenvectors unavailable; non-symmetric solve returned eigenvalues only.');
    if (typeof maxResidual === 'number' && maxResidual > 1e-5) {
        warnings.push('Eigenpair residuals are larger than expected.');
    }

    return {
        data: {
            eigenvalues: eig.values,
            eigenvectors: eig.vectors,
            symmetric: eig.symmetric,
            iterations: eig.iterations,
            converged: eig.converged,
            maxResidual,
            multiplicities
        },
        warnings,
        latex: {
            summary: `\\text{eigs}(A) = \\{${eig.values.map((value) => formatNumberToLatex(value)).join(', ')}\\}`,
            matrices: eig.vectors ? { eigenvectors: formatNumericMatrixToLatex(eig.vectors) } : undefined,
            scalars: {
                iterations: formatNumberToLatex(eig.iterations),
                maxResidual: formatNumberToLatex(maxResidual ?? 0)
            }
        },
        reuse: {
            matrices: eig.vectors ? { eigenvectors: eig.vectors } : undefined,
            scalars: {
                iterations: eig.iterations,
                maxResidual: maxResidual ?? 0,
                multiplicityCount: multiplicities.length
            }
        },
        exports: {
            csv: eig.vectors ? { eigenvectors: formatNumericMatrixToCsv(eig.vectors) } : undefined,
            json: {
                eigenvalues: eig.values,
                multiplicities
            }
        }
    };
};
