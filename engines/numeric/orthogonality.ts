import {
    formatNumberToLatex,
    formatNumericMatrixToCsv,
    formatNumericMatrixToLatex,
    numericQR,
    numericSVD
} from '../../services/matrixService';
import type { NumericMatrix, NumericVector, NumericWorkflowEnvelope } from './types';
import {
    EPSILON,
    assertEqualVectorLengths,
    assertRectangularMatrix,
    conditionNumberFromSingularValues,
    dot,
    matrixColumns,
    matrixRank,
    matrixTranspose,
    matrixVectorMultiply,
    nullSpace,
    solveUpperTriangular,
    vectorAdd,
    vectorNorm1,
    vectorNorm2,
    vectorNormInf,
    vectorScale,
    vectorSubtract
} from './utils';

export type InnerProductMetric = 'euclidean' | NumericMatrix;
export type VectorNormKind = '1' | '2' | 'inf';

export interface InnerProductData {
    value: number;
    orthogonal: boolean;
    tolerance: number;
}

export interface VectorNormData {
    normType: VectorNormKind;
    value: number;
}

export interface DistanceData {
    value: number;
}

export interface OrthogonalityCheckData {
    orthogonal: boolean;
    innerProduct: number;
    tolerance: number;
}

export interface GramSchmidtData {
    orthogonalBasis: NumericVector[];
    orthonormalBasis: NumericVector[];
    dependentInputIndices: number[];
    coefficientMatrix: NumericMatrix;
}

export interface ProjectionData {
    projection: NumericVector;
    rejection: NumericVector;
    coefficients: number[];
}

export interface OrthogonalComplementData {
    basis: NumericVector[];
    ambientDimension: number;
}

export interface LeastSquaresDiagnostics {
    method: 'qr' | 'svd-pseudoinverse';
    rankEstimate: number;
    conditionNumber: number;
    residualNorm2: number;
    residualNorm1: number;
    residualNormInf: number;
    relativeResidualNorm2: number;
    normalEquationResidualNorm2: number;
    residualOrthogonalityInf: number;
}

export interface LeastSquaresData {
    solution: NumericVector;
    fitted: NumericVector;
    residual: NumericVector;
    diagnostics: LeastSquaresDiagnostics;
}

const vectorToLatex = (vector: NumericVector): string =>
    `\\begin{bmatrix} ${vector.map((value) => formatNumberToLatex(value)).join(' \\\\ ')} \\end{bmatrix}`;

const vectorToCsv = (vector: NumericVector): string => vector.map((value) => `${value}`).join('\n');

const validateMetric = (dimension: number, metric: InnerProductMetric): NumericMatrix | null => {
    if (metric === 'euclidean') return null;
    assertRectangularMatrix(metric, 'metric');
    if (metric.length !== dimension || (metric[0]?.length ?? 0) !== dimension) {
        throw new Error('Metric matrix dimensions must match vector size.');
    }
    return metric;
};

export const computeInnerProduct = (
    a: NumericVector,
    b: NumericVector,
    metric: InnerProductMetric = 'euclidean'
): number => {
    assertEqualVectorLengths(a, b);
    const metricMatrix = validateMetric(a.length, metric);
    if (!metricMatrix) return dot(a, b);
    const mv = matrixVectorMultiply(metricMatrix, b);
    return dot(a, mv);
};

export const computeVectorNorm = (
    vector: NumericVector,
    normType: VectorNormKind = '2',
    metric: InnerProductMetric = 'euclidean'
): number => {
    if (normType === '1') return vectorNorm1(vector);
    if (normType === 'inf') return vectorNormInf(vector);
    return Math.sqrt(Math.max(computeInnerProduct(vector, vector, metric), 0));
};

export const computeDistance = (
    a: NumericVector,
    b: NumericVector,
    metric: InnerProductMetric = 'euclidean'
): number => {
    assertEqualVectorLengths(a, b);
    return computeVectorNorm(vectorSubtract(a, b), '2', metric);
};

export const areOrthogonal = (
    a: NumericVector,
    b: NumericVector,
    tolerance = 1e-9,
    metric: InnerProductMetric = 'euclidean'
): boolean => Math.abs(computeInnerProduct(a, b, metric)) <= tolerance;

export const analyzeInnerProduct = (
    a: NumericVector,
    b: NumericVector,
    metric: InnerProductMetric = 'euclidean',
    tolerance = 1e-9
): NumericWorkflowEnvelope<InnerProductData> => {
    const value = computeInnerProduct(a, b, metric);
    const orthogonal = Math.abs(value) <= tolerance;
    return {
        data: { value, orthogonal, tolerance },
        warnings: [],
        latex: {
            summary: `\\langle u,v \\rangle = ${formatNumberToLatex(value)}${orthogonal ? ',\\ \\text{orthogonal}' : ''}`,
            vectors: { u: vectorToLatex(a), v: vectorToLatex(b) }
        },
        reuse: { vectors: { u: a, v: b }, scalars: { innerProduct: value } },
        exports: { json: { innerProduct: value, orthogonal } }
    };
};

export const analyzeVectorNorm = (
    vector: NumericVector,
    normType: VectorNormKind = '2',
    metric: InnerProductMetric = 'euclidean'
): NumericWorkflowEnvelope<VectorNormData> => {
    const value = computeVectorNorm(vector, normType, metric);
    return {
        data: { normType, value },
        warnings: [],
        latex: {
            summary: `\\|v\\|_${normType} = ${formatNumberToLatex(value)}`,
            vectors: { v: vectorToLatex(vector) }
        },
        reuse: { vectors: { v: vector }, scalars: { norm: value } },
        exports: { json: { normType, value } }
    };
};

export const analyzeVectorDistance = (
    a: NumericVector,
    b: NumericVector,
    metric: InnerProductMetric = 'euclidean'
): NumericWorkflowEnvelope<DistanceData> => {
    const value = computeDistance(a, b, metric);
    return {
        data: { value },
        warnings: [],
        latex: {
            summary: `d(u,v) = ${formatNumberToLatex(value)}`,
            vectors: { u: vectorToLatex(a), v: vectorToLatex(b) }
        },
        reuse: { vectors: { u: a, v: b }, scalars: { distance: value } },
        exports: { json: { distance: value } }
    };
};

export const analyzeOrthogonality = (
    a: NumericVector,
    b: NumericVector,
    tolerance = 1e-9,
    metric: InnerProductMetric = 'euclidean'
): NumericWorkflowEnvelope<OrthogonalityCheckData> => {
    const innerProduct = computeInnerProduct(a, b, metric);
    const orthogonal = Math.abs(innerProduct) <= tolerance;
    return {
        data: { orthogonal, innerProduct, tolerance },
        warnings: [],
        latex: {
            summary: orthogonal
                ? '\\text{Vectors are orthogonal.}'
                : `\\text{Not orthogonal: }\\langle u,v \\rangle=${formatNumberToLatex(innerProduct)}`,
            vectors: { u: vectorToLatex(a), v: vectorToLatex(b) }
        },
        reuse: { vectors: { u: a, v: b }, scalars: { innerProduct } },
        exports: { json: { orthogonal, innerProduct, tolerance } }
    };
};

export interface GramSchmidtOptions {
    normalize?: boolean;
    tolerance?: number;
    metric?: InnerProductMetric;
}

export const runGramSchmidtWorkflow = (
    vectors: NumericVector[],
    options: GramSchmidtOptions = {}
): NumericWorkflowEnvelope<GramSchmidtData> => {
    if (vectors.length === 0) {
        return {
            data: {
                orthogonalBasis: [],
                orthonormalBasis: [],
                dependentInputIndices: [],
                coefficientMatrix: []
            },
            warnings: ['No vectors provided.'],
            latex: { summary: '\\text{No input vectors.}' },
            reuse: {},
            exports: { json: { basis: [] } }
        };
    }

    const tolerance = options.tolerance ?? 1e-9;
    const metric = options.metric ?? 'euclidean';
    const dimension = vectors[0].length;
    vectors.forEach((vector, idx) => {
        if (vector.length !== dimension) throw new Error(`Vector ${idx + 1} has inconsistent dimension.`);
    });

    const orthogonalBasis: NumericVector[] = [];
    const orthonormalBasis: NumericVector[] = [];
    const dependentInputIndices: number[] = [];
    const coefficientMatrix = Array.from({ length: vectors.length }, () => Array(vectors.length).fill(0));

    vectors.forEach((inputVector, inputIdx) => {
        let residual = [...inputVector];
        orthogonalBasis.forEach((basisVector, basisIdx) => {
            const denominator = computeInnerProduct(basisVector, basisVector, metric);
            const coefficient = Math.abs(denominator) <= tolerance
                ? 0
                : computeInnerProduct(residual, basisVector, metric) / denominator;
            coefficientMatrix[inputIdx][basisIdx] = coefficient;
            residual = vectorSubtract(residual, vectorScale(basisVector, coefficient));
        });

        const residualNorm = computeVectorNorm(residual, '2', metric);
        if (residualNorm <= tolerance) {
            dependentInputIndices.push(inputIdx);
            return;
        }

        orthogonalBasis.push(residual);
        orthonormalBasis.push(vectorScale(residual, 1 / residualNorm));
    });

    const warnings: string[] = [];
    if (dependentInputIndices.length > 0) {
        warnings.push(`Detected dependent vectors at indices: ${dependentInputIndices.map((idx) => idx + 1).join(', ')}.`);
    }
    const exportBasis = options.normalize === false ? orthogonalBasis : orthonormalBasis;

    return {
        data: {
            orthogonalBasis,
            orthonormalBasis,
            dependentInputIndices,
            coefficientMatrix
        },
        warnings,
        latex: {
            summary: `\\text{Gram-Schmidt produced }${exportBasis.length}\\text{ basis vectors.}`,
            vectors: Object.fromEntries(exportBasis.map((vector, idx) => [`q_${idx + 1}`, vectorToLatex(vector)]))
        },
        reuse: {
            vectors: Object.fromEntries(exportBasis.map((vector, idx) => [`q_${idx + 1}`, vector]))
        },
        exports: {
            json: {
                orthogonalBasis,
                orthonormalBasis,
                dependentInputIndices,
                coefficientMatrix
            }
        }
    };
};

export const projectOntoVectorWorkflow = (
    vector: NumericVector,
    onto: NumericVector,
    tolerance = 1e-9,
    metric: InnerProductMetric = 'euclidean'
): NumericWorkflowEnvelope<ProjectionData> => {
    assertEqualVectorLengths(vector, onto);
    const denominator = computeInnerProduct(onto, onto, metric);
    if (Math.abs(denominator) <= tolerance) throw new Error('Cannot project onto a zero vector.');
    const coefficient = computeInnerProduct(vector, onto, metric) / denominator;
    const projection = vectorScale(onto, coefficient);
    const rejection = vectorSubtract(vector, projection);

    return {
        data: { projection, rejection, coefficients: [coefficient] },
        warnings: [],
        latex: {
            summary: `\\mathrm{proj}_u(v) = ${formatNumberToLatex(coefficient)}u`,
            vectors: {
                projection: vectorToLatex(projection),
                rejection: vectorToLatex(rejection)
            }
        },
        reuse: {
            vectors: { projection, rejection },
            scalars: { coefficient }
        },
        exports: {
            json: { projection, rejection, coefficient }
        }
    };
};

export const projectOntoSubspaceWorkflow = (
    vector: NumericVector,
    basis: NumericVector[],
    tolerance = 1e-9,
    metric: InnerProductMetric = 'euclidean'
): NumericWorkflowEnvelope<ProjectionData> => {
    if (basis.length === 0) {
        const zeroProjection = Array(vector.length).fill(0);
        return {
            data: {
                projection: zeroProjection,
                rejection: [...vector],
                coefficients: []
            },
            warnings: ['Empty basis: projection is zero.'],
            latex: {
                summary: '\\mathrm{proj}_W(v)=0\\ \\text{for }W=\\{0\\}',
                vectors: {
                    projection: vectorToLatex(zeroProjection),
                    rejection: vectorToLatex(vector)
                }
            },
            reuse: { vectors: { projection: zeroProjection, rejection: vector } },
            exports: { json: { projection: zeroProjection, rejection: vector, coefficients: [] } }
        };
    }

    const gramSchmidt = runGramSchmidtWorkflow(basis, { normalize: true, tolerance, metric });
    const orthonormalBasis = gramSchmidt.data.orthonormalBasis;
    if (orthonormalBasis.length === 0) throw new Error('Basis is degenerate; cannot project onto subspace.');

    let projection = Array(vector.length).fill(0);
    const coefficients: number[] = [];
    orthonormalBasis.forEach((q) => {
        const coefficient = computeInnerProduct(vector, q, metric);
        coefficients.push(coefficient);
        projection = vectorAdd(projection, vectorScale(q, coefficient));
    });

    const rejection = vectorSubtract(vector, projection);
    const warnings = [...gramSchmidt.warnings];

    return {
        data: { projection, rejection, coefficients },
        warnings,
        latex: {
            summary: '\\mathrm{proj}_W(v)=\\sum_i\\langle v,q_i\\rangle q_i',
            vectors: {
                projection: vectorToLatex(projection),
                rejection: vectorToLatex(rejection)
            }
        },
        reuse: {
            vectors: { projection, rejection },
            scalars: Object.fromEntries(coefficients.map((value, idx) => [`c_${idx + 1}`, value]))
        },
        exports: {
            json: { projection, rejection, coefficients }
        }
    };
};

export const computeOrthogonalComplementWorkflow = (
    basis: NumericVector[],
    ambientDimension?: number,
    tolerance = 1e-9
): NumericWorkflowEnvelope<OrthogonalComplementData> => {
    const dimension = basis.length > 0 ? basis[0].length : (ambientDimension ?? 0);
    if (dimension <= 0) throw new Error('Ambient dimension must be positive.');

    basis.forEach((vector, idx) => {
        if (vector.length !== dimension) throw new Error(`Basis vector ${idx + 1} has inconsistent dimension.`);
    });

    if (basis.length === 0) {
        const canonicalBasis = Array.from({ length: dimension }, (_, idx) => {
            const vector = Array(dimension).fill(0);
            vector[idx] = 1;
            return vector;
        });
        return {
            data: { basis: canonicalBasis, ambientDimension: dimension },
            warnings: ['No basis supplied: orthogonal complement is the full ambient space.'],
            latex: {
                summary: '\\text{Orthogonal complement equals ambient space.}',
                vectors: Object.fromEntries(canonicalBasis.map((vector, idx) => [`e_${idx + 1}`, vectorToLatex(vector)]))
            },
            reuse: { vectors: Object.fromEntries(canonicalBasis.map((vector, idx) => [`e_${idx + 1}`, vector])) },
            exports: { json: { basis: canonicalBasis } }
        };
    }

    const matrix = basis.map((vector) => [...vector]);
    const complementBasis = nullSpace(matrix, tolerance, dimension);
    return {
        data: {
            basis: complementBasis,
            ambientDimension: dimension
        },
        warnings: complementBasis.length === 0 ? ['Orthogonal complement appears trivial at current tolerance.'] : [],
        latex: {
            summary: '\\text{Orthogonal complement basis from Null}(B).',
            vectors: Object.fromEntries(complementBasis.map((vector, idx) => [`w_${idx + 1}`, vectorToLatex(vector)]))
        },
        reuse: {
            vectors: Object.fromEntries(complementBasis.map((vector, idx) => [`w_${idx + 1}`, vector]))
        },
        exports: {
            json: { basis: complementBasis, ambientDimension: dimension }
        }
    };
};

export interface LeastSquaresOptions {
    tolerance?: number;
    maxIterations?: number;
}

export const solveLeastSquaresWorkflow = (
    matrix: NumericMatrix,
    rhs: NumericVector,
    options: LeastSquaresOptions = {}
): NumericWorkflowEnvelope<LeastSquaresData> => {
    assertRectangularMatrix(matrix, 'A');
    const rows = matrix.length;
    const cols = rows > 0 ? matrix[0].length : 0;
    if (rows === 0 || cols === 0) throw new Error('A must be non-empty.');
    if (rhs.length !== rows) throw new Error('Vector b dimension mismatch.');

    const tolerance = options.tolerance ?? 1e-8;
    const maxIterations = options.maxIterations ?? 240;
    const { Q, R } = numericQR(matrix, tolerance);
    const qt = matrixTranspose(Q);
    const y = qt.map((row) => dot(row, rhs));

    const svd = numericSVD(matrix, maxIterations, tolerance);
    const rankEstimate = svd.singularValues.reduce((count, value) => count + (Math.abs(value) > tolerance ? 1 : 0), 0);
    const conditionNumber = conditionNumberFromSingularValues(svd.singularValues, tolerance);

    let method: LeastSquaresDiagnostics['method'] = 'qr';
    let solution = solveUpperTriangular(R, y, tolerance);

    if (!solution || rankEstimate < Math.min(rows, cols)) {
        const V = matrixTranspose(svd.Vt);
        const uColumns = matrixColumns(svd.U);
        const pseudoSolution = Array(cols).fill(0);

        for (let i = 0; i < Math.min(svd.singularValues.length, uColumns.length); i++) {
            const sigma = svd.singularValues[i];
            if (Math.abs(sigma) <= tolerance) continue;
            const coefficient = dot(uColumns[i], rhs) / sigma;
            for (let j = 0; j < cols; j++) pseudoSolution[j] += (V[j]?.[i] ?? 0) * coefficient;
        }

        solution = pseudoSolution;
        method = 'svd-pseudoinverse';
    }

    const fitted = matrixVectorMultiply(matrix, solution);
    const residual = vectorSubtract(rhs, fitted);
    const residualNorm2 = vectorNorm2(residual);
    const residualNorm1 = vectorNorm1(residual);
    const residualNormInf = vectorNormInf(residual);
    const rhsNorm2 = Math.max(vectorNorm2(rhs), EPSILON);
    const relativeResidualNorm2 = residualNorm2 / rhsNorm2;

    const normalEquationResidual = matrixVectorMultiply(matrixTranspose(matrix), residual);
    const normalEquationResidualNorm2 = vectorNorm2(normalEquationResidual);
    const residualOrthogonalityInf = vectorNormInf(normalEquationResidual);

    const diagnostics: LeastSquaresDiagnostics = {
        method,
        rankEstimate,
        conditionNumber,
        residualNorm2,
        residualNorm1,
        residualNormInf,
        relativeResidualNorm2,
        normalEquationResidualNorm2,
        residualOrthogonalityInf
    };

    const warnings: string[] = [];
    if (rankEstimate < cols) warnings.push('Design matrix is rank-deficient; least-squares solution is minimum-norm approximation.');
    if (residualOrthogonalityInf > 1e-5) warnings.push('Residual is not strongly orthogonal to column space at current tolerance.');

    const solutionAsColumn = solution.map((value) => [value]);
    return {
        data: { solution, fitted, residual, diagnostics },
        warnings,
        latex: {
            summary: `\\min_x\\|Ax-b\\|_2,\\ \\|r\\|_2\\approx${formatNumberToLatex(residualNorm2)},\\ \\kappa(A)\\approx${formatNumberToLatex(conditionNumber)}`,
            matrices: {
                solution: formatNumericMatrixToLatex(solutionAsColumn)
            },
            vectors: {
                fitted: vectorToLatex(fitted),
                residual: vectorToLatex(residual)
            }
        },
        reuse: {
            vectors: { solution, fitted, residual },
            scalars: {
                residualNorm2,
                conditionNumber,
                relativeResidualNorm2,
                normalEquationResidualNorm2
            }
        },
        exports: {
            csv: {
                solution: formatNumericMatrixToCsv(solutionAsColumn),
                fitted: vectorToCsv(fitted),
                residual: vectorToCsv(residual)
            },
            json: {
                diagnostics
            }
        }
    };
};
