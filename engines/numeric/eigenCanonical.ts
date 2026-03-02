import {
    formatNumberToLatex,
    formatNumericMatrixToCsv,
    formatNumericMatrixToLatex
} from '../../services/matrixService';
import type { NumericMatrix, NumericWorkflowEnvelope, NumericVector } from './types';
import { runEigenWorkflow } from './decompositions';
import {
    EPSILON,
    assertSquareMatrix,
    clusterScalars,
    columnsToMatrix,
    flattenMatrix,
    formatPolynomialLatex,
    frobeniusNorm,
    identityMatrix,
    integerMatrixPower,
    matrixAdd,
    matrixInverse,
    matrixMultiply,
    matrixRank,
    matrixScale,
    matrixSubtract,
    matrixVectorMultiply,
    normalizeJordanBlockSizes,
    nullSpace,
    vectorNorm2,
    vectorSubtract,
    zeroMatrix
} from './utils';

export interface EigenspaceData {
    eigenvalue: number;
    basis: NumericVector[];
    geometricMultiplicity: number;
    residuals: number[];
}

export interface EigenMultiplicitySummary {
    eigenvalue: number;
    algebraicMultiplicity: number;
    geometricMultiplicity: number;
    diagonalizableAtEigenvalue: boolean;
    jordanBlockSizes: number[];
}

export interface DiagonalizationData {
    diagonalizable: boolean;
    multiplicities: EigenMultiplicitySummary[];
    P?: NumericMatrix;
    D?: NumericMatrix;
    Pinv?: NumericMatrix;
    basisEigenvalues: number[];
    reconstructionError?: number;
}

export interface FastPowerData {
    power: number;
    method: 'diagonalization' | 'repeated-squaring';
    matrixPower: NumericMatrix;
}

export interface MinimalPolynomialData {
    degree: number;
    coefficientsHighToLow: number[];
    coefficientsLowToHigh: number[];
    polynomialLatex: string;
    verificationResidual: number;
}

export interface JordanBlockDescriptor {
    eigenvalue: number;
    size: number;
    startIndex: number;
    endIndex: number;
}

export interface JordanCanonicalData {
    J: NumericMatrix;
    P: NumericMatrix;
    blocks: JordanBlockDescriptor[];
    multiplicities: EigenMultiplicitySummary[];
}

const vectorToDiagonalMatrix = (diagonalEntries: number[]): NumericMatrix => {
    const n = diagonalEntries.length;
    const diagonal = zeroMatrix(n, n);
    for (let i = 0; i < n; i++) diagonal[i][i] = diagonalEntries[i];
    return diagonal;
};

const inferJordanBlockSizes = (
    matrix: NumericMatrix,
    eigenvalue: number,
    algebraicMultiplicity: number,
    tolerance: number
): number[] => {
    if (algebraicMultiplicity <= 0) return [];
    const n = matrix.length;
    const shifted = matrixSubtract(matrix, matrixScale(identityMatrix(n), eigenvalue));

    const blocksAtLeast: number[] = Array(algebraicMultiplicity + 2).fill(0);
    let previousNullity = 0;
    for (let k = 1; k <= algebraicMultiplicity; k++) {
        const powered = integerMatrixPower(shifted, k);
        const nullity = Math.max(previousNullity, n - matrixRank(powered, tolerance));
        blocksAtLeast[k] = Math.max(0, nullity - previousNullity);
        previousNullity = nullity;
    }

    const sizes: number[] = [];
    for (let size = algebraicMultiplicity; size >= 1; size--) {
        const exactCount = Math.max(0, Math.round(blocksAtLeast[size] - blocksAtLeast[size + 1]));
        for (let i = 0; i < exactCount; i++) sizes.push(size);
    }

    return normalizeJordanBlockSizes(sizes, algebraicMultiplicity);
};

export const computeEigenspace = (
    matrix: NumericMatrix,
    eigenvalue: number,
    tolerance = 1e-8
): NumericWorkflowEnvelope<EigenspaceData> => {
    assertSquareMatrix(matrix, 'A');
    const n = matrix.length;
    const shifted = matrixSubtract(matrix, matrixScale(identityMatrix(n), eigenvalue));
    const basis = nullSpace(shifted, tolerance, n);
    const residuals = basis.map((vector) => {
        const av = matrixVectorMultiply(matrix, vector);
        const lv = vector.map((value) => value * eigenvalue);
        return vectorNorm2(vectorSubtract(av, lv));
    });

    const geometricMultiplicity = basis.length;
    const warnings: string[] = [];
    if (geometricMultiplicity === 0) warnings.push('No stable eigenspace basis detected at current tolerance.');

    return {
        data: { eigenvalue, basis, geometricMultiplicity, residuals },
        warnings,
        latex: {
            summary: `\\mathcal{E}_{${formatNumberToLatex(eigenvalue)}}(A) = \\mathrm{Null}(A-${formatNumberToLatex(eigenvalue)}I),\\ \\dim = ${formatNumberToLatex(geometricMultiplicity)}`,
            vectors: basis.length > 0
                ? Object.fromEntries(basis.map((vector, idx) => [`v_${idx + 1}`, `\\begin{bmatrix} ${vector.map((value) => formatNumberToLatex(value)).join(' \\\\ ')} \\end{bmatrix}`]))
                : undefined
        },
        reuse: {
            vectors: basis.length > 0 ? Object.fromEntries(basis.map((vector, idx) => [`v_${idx + 1}`, vector])) : undefined
        },
        exports: {
            json: {
                eigenvalue,
                geometricMultiplicity,
                basis,
                residuals
            }
        }
    };
};

export const summarizeEigenMultiplicities = (
    matrix: NumericMatrix,
    tolerance = 1e-8
): NumericWorkflowEnvelope<{ summaries: EigenMultiplicitySummary[] }> => {
    assertSquareMatrix(matrix, 'A');
    const eigen = runEigenWorkflow(matrix, 320, tolerance);
    const n = matrix.length;
    const clusters = clusterScalars(eigen.data.eigenvalues, Math.max(tolerance, 1e-6));

    const summaries: EigenMultiplicitySummary[] = clusters.map((cluster) => {
        const eigenspace = computeEigenspace(matrix, cluster.value, tolerance);
        const geometricMultiplicity = eigenspace.data.geometricMultiplicity;
        const algebraicMultiplicity = cluster.indices.length;
        const jordanBlockSizes = inferJordanBlockSizes(matrix, cluster.value, algebraicMultiplicity, tolerance);
        return {
            eigenvalue: cluster.value,
            algebraicMultiplicity,
            geometricMultiplicity,
            diagonalizableAtEigenvalue: geometricMultiplicity === algebraicMultiplicity,
            jordanBlockSizes
        };
    });

    const totalAlgebraic = summaries.reduce((sum, item) => sum + item.algebraicMultiplicity, 0);
    const warnings = [...eigen.warnings];
    if (totalAlgebraic !== n) warnings.push('Algebraic multiplicities do not sum to matrix size at current tolerance.');

    return {
        data: { summaries },
        warnings,
        latex: {
            summary: summaries
                .map((item) =>
                    `\\lambda=${formatNumberToLatex(item.eigenvalue)}: a_m=${item.algebraicMultiplicity}, g_m=${item.geometricMultiplicity}`
                )
                .join('; ')
        },
        reuse: {
            scalars: Object.fromEntries(summaries.map((item, idx) => [`lambda_${idx + 1}`, item.eigenvalue]))
        },
        exports: {
            json: { summaries }
        }
    };
};

export const analyzeDiagonalization = (
    matrix: NumericMatrix,
    tolerance = 1e-8
): NumericWorkflowEnvelope<DiagonalizationData> => {
    assertSquareMatrix(matrix, 'A');
    const n = matrix.length;
    const multiplicitySummary = summarizeEigenMultiplicities(matrix, tolerance);
    const multiplicities = multiplicitySummary.data.summaries;

    const basisVectors: NumericVector[] = [];
    const basisEigenvalues: number[] = [];
    multiplicities.forEach((summary) => {
        const eigenspace = computeEigenspace(matrix, summary.eigenvalue, tolerance);
        eigenspace.data.basis.forEach((vector) => {
            if (basisVectors.length < n) {
                basisVectors.push(vector);
                basisEigenvalues.push(summary.eigenvalue);
            }
        });
    });

    const warnings = [...multiplicitySummary.warnings];
    let diagonalizable = false;
    let P: NumericMatrix | undefined;
    let D: NumericMatrix | undefined;
    let Pinv: NumericMatrix | undefined;
    let reconstructionError: number | undefined;

    if (basisVectors.length >= n) {
        P = columnsToMatrix(basisVectors.slice(0, n));
        const rankP = matrixRank(P, tolerance);
        if (rankP === n) {
            Pinv = matrixInverse(P, tolerance) ?? undefined;
            if (Pinv) {
                D = vectorToDiagonalMatrix(basisEigenvalues.slice(0, n));
                const reconstructed = matrixMultiply(matrixMultiply(P, D), Pinv);
                reconstructionError = frobeniusNorm(matrixSubtract(matrix, reconstructed));
                diagonalizable = reconstructionError <= 1e-5 || multiplicities.every((item) => item.diagonalizableAtEigenvalue);
            } else {
                warnings.push('Eigenvector matrix is singular; diagonalization matrix inverse failed.');
            }
        } else {
            warnings.push('Eigenvector matrix is rank deficient; matrix is not diagonalizable.');
        }
    } else {
        warnings.push('Insufficient eigenspace basis vectors for full diagonalization.');
    }

    if (!diagonalizable) {
        P = undefined;
        D = undefined;
        Pinv = undefined;
    }

    return {
        data: {
            diagonalizable,
            multiplicities,
            P,
            D,
            Pinv,
            basisEigenvalues,
            reconstructionError
        },
        warnings,
        latex: {
            summary: diagonalizable
                ? `A = PDP^{-1},\\ \\|A-PDP^{-1}\\|_F \\approx ${formatNumberToLatex(reconstructionError ?? 0)}`
                : '\\text{Matrix is not diagonalizable at the current tolerance.}',
            matrices: diagonalizable && P && D && Pinv
                ? {
                    P: formatNumericMatrixToLatex(P),
                    D: formatNumericMatrixToLatex(D),
                    Pinv: formatNumericMatrixToLatex(Pinv)
                }
                : undefined
        },
        reuse: {
            matrices: diagonalizable && P && D && Pinv ? { P, D, Pinv } : undefined
        },
        exports: {
            csv: diagonalizable && P && D && Pinv
                ? {
                    P: formatNumericMatrixToCsv(P),
                    D: formatNumericMatrixToCsv(D),
                    Pinv: formatNumericMatrixToCsv(Pinv)
                }
                : undefined,
            json: { multiplicities, diagonalizable }
        }
    };
};

export const fastMatrixPower = (
    matrix: NumericMatrix,
    power: number,
    tolerance = 1e-8
): NumericWorkflowEnvelope<FastPowerData> => {
    assertSquareMatrix(matrix, 'A');
    if (!Number.isInteger(power)) throw new Error('Fast powers require an integer exponent.');
    const n = matrix.length;
    if (power === 0) {
        const identity = identityMatrix(n);
        return {
            data: { power, method: 'repeated-squaring', matrixPower: identity },
            warnings: [],
            latex: {
                summary: 'A^0 = I',
                matrices: { result: formatNumericMatrixToLatex(identity) }
            },
            reuse: { matrices: { result: identity } },
            exports: { csv: { result: formatNumericMatrixToCsv(identity) } }
        };
    }

    const diagonalization = analyzeDiagonalization(matrix, tolerance);
    const warnings = [...diagonalization.warnings];
    let method: FastPowerData['method'] = 'repeated-squaring';
    let matrixPower: NumericMatrix;

    if (
        diagonalization.data.diagonalizable &&
        diagonalization.data.P &&
        diagonalization.data.D &&
        diagonalization.data.Pinv
    ) {
        const diagonalEntries = diagonalization.data.D.map((row, idx) => row[idx] ?? 0);
        const canUseDiagonalization = !(power < 0 && diagonalEntries.some((value) => Math.abs(value) <= tolerance));
        if (canUseDiagonalization) {
            const DPower = zeroMatrix(n, n);
            for (let i = 0; i < n; i++) DPower[i][i] = Math.pow(diagonalEntries[i], power);
            matrixPower = matrixMultiply(matrixMultiply(diagonalization.data.P, DPower), diagonalization.data.Pinv);
            method = 'diagonalization';
        } else {
            warnings.push('Diagonal form has near-zero eigenvalue; falling back to repeated squaring for negative power.');
            const inverse = matrixInverse(matrix, tolerance);
            if (!inverse) throw new Error('Matrix is not invertible, negative powers are undefined.');
            matrixPower = integerMatrixPower(inverse, -power);
        }
    } else {
        if (power > 0) {
            matrixPower = integerMatrixPower(matrix, power);
        } else {
            const inverse = matrixInverse(matrix, tolerance);
            if (!inverse) throw new Error('Matrix is not invertible, negative powers are undefined.');
            matrixPower = integerMatrixPower(inverse, -power);
        }
    }

    return {
        data: { power, method, matrixPower },
        warnings,
        latex: {
            summary: `A^{${power}}\\ \\text{computed via }${method === 'diagonalization' ? 'diagonalization' : 'repeated squaring'}.`,
            matrices: { result: formatNumericMatrixToLatex(matrixPower) }
        },
        reuse: {
            matrices: { result: matrixPower }
        },
        exports: {
            csv: { result: formatNumericMatrixToCsv(matrixPower) }
        }
    };
};

export const computeMinimalPolynomial = (
    matrix: NumericMatrix,
    tolerance = 1e-8
): NumericWorkflowEnvelope<MinimalPolynomialData> => {
    assertSquareMatrix(matrix, 'A');
    const n = matrix.length;
    const powers: NumericMatrix[] = [identityMatrix(n)];
    for (let i = 1; i <= n; i++) powers.push(matrixMultiply(powers[i - 1], matrix));

    for (let degree = 1; degree <= n; degree++) {
        const system = zeroMatrix(n * n, degree + 1);
        for (let col = 0; col <= degree; col++) {
            const flattened = flattenMatrix(powers[col]);
            for (let row = 0; row < flattened.length; row++) system[row][col] = flattened[row];
        }

        const nullBasis = nullSpace(system, tolerance, degree + 1);
        const candidate = nullBasis.find((vector) => Math.abs(vector[degree]) > tolerance);
        if (!candidate) continue;

        const normalizedLowToHigh = candidate.map((value) => value / candidate[degree]);
        const coefficientsHighToLow = [...normalizedLowToHigh].reverse();

        let verification = zeroMatrix(n, n);
        for (let i = 0; i <= degree; i++) verification = matrixAdd(verification, matrixScale(powers[i], normalizedLowToHigh[i]));
        const verificationResidual = frobeniusNorm(verification);
        const polynomialLatex = formatPolynomialLatex(coefficientsHighToLow, '\\lambda', tolerance);

        return {
            data: {
                degree,
                coefficientsHighToLow,
                coefficientsLowToHigh: normalizedLowToHigh,
                polynomialLatex,
                verificationResidual
            },
            warnings: verificationResidual > 1e-5 ? ['Minimal polynomial residual is larger than expected.'] : [],
            latex: {
                summary: `m_A(\\lambda) = ${polynomialLatex}`,
                scalars: {
                    degree: formatNumberToLatex(degree),
                    verificationResidual: formatNumberToLatex(verificationResidual)
                }
            },
            reuse: {
                scalars: { degree, verificationResidual }
            },
            exports: {
                json: {
                    degree,
                    coefficientsHighToLow,
                    coefficientsLowToHigh: normalizedLowToHigh,
                    verificationResidual
                }
            }
        };
    }

    throw new Error('Unable to identify a stable minimal polynomial at current tolerance.');
};

export const computeJordanCanonicalApprox = (
    matrix: NumericMatrix,
    tolerance = 1e-8
): NumericWorkflowEnvelope<JordanCanonicalData> => {
    assertSquareMatrix(matrix, 'A');
    const n = matrix.length;
    const eigen = runEigenWorkflow(matrix, 320, tolerance);
    const multiplicities = summarizeEigenMultiplicities(matrix, tolerance);
    const diagonalization = analyzeDiagonalization(matrix, tolerance);

    const J = zeroMatrix(n, n);
    const blocks: JordanBlockDescriptor[] = [];
    let cursor = 0;

    multiplicities.data.summaries.forEach((summary) => {
        summary.jordanBlockSizes.forEach((requestedSize) => {
            if (cursor >= n) return;
            const size = Math.min(requestedSize, n - cursor);
            const start = cursor;
            for (let i = 0; i < size; i++) {
                J[start + i][start + i] = summary.eigenvalue;
                if (i < size - 1) J[start + i][start + i + 1] = 1;
            }
            blocks.push({
                eigenvalue: summary.eigenvalue,
                size,
                startIndex: start,
                endIndex: start + size - 1
            });
            cursor += size;
        });
    });

    while (cursor < n) {
        const fallbackEigenvalue = eigen.data.eigenvalues[cursor] ?? 0;
        J[cursor][cursor] = fallbackEigenvalue;
        blocks.push({
            eigenvalue: fallbackEigenvalue,
            size: 1,
            startIndex: cursor,
            endIndex: cursor
        });
        cursor++;
    }

    const P = diagonalization.data.P ?? identityMatrix(n);
    const warnings = [...multiplicities.warnings, ...diagonalization.warnings];
    if (!diagonalization.data.diagonalizable) {
        warnings.push('Jordan basis matrix P is approximated as identity for non-diagonalizable case.');
    }
    if (!eigen.data.symmetric) warnings.push('Non-symmetric matrix: Jordan structure is numeric approximation.');

    return {
        data: {
            J,
            P,
            blocks,
            multiplicities: multiplicities.data.summaries
        },
        warnings,
        latex: {
            summary: '\\text{Jordan canonical form (numeric approximation)}',
            matrices: {
                J: formatNumericMatrixToLatex(J),
                P: formatNumericMatrixToLatex(P)
            }
        },
        reuse: {
            matrices: { J, P }
        },
        exports: {
            csv: {
                J: formatNumericMatrixToCsv(J),
                P: formatNumericMatrixToCsv(P)
            },
            json: {
                blocks,
                multiplicities: multiplicities.data.summaries
            }
        }
    };
};
