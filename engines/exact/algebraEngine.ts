import type { CalculationResult, SymbolicFraction, SystemType, ValidMatrix } from '../../types';
import {
    addSF,
    areSFEqual,
    calculate,
    divideSF,
    formatMatrixToLatex,
    formatSymbolicFractionToLatex,
    isZeroSF,
    multiplySF,
    parseInput,
    stringifySymbolicFraction,
    subtractSF,
} from '../../services/matrixService';
import type {
    ExactVector,
    ExactVectorSet,
    FundamentalSubspacesResult,
    LinearMapAnalysisResult,
    LinearMapObject,
    MatrixVectorResult,
    OrderedBasis,
    SolveReuseResult,
    SpanBasisResult,
    SubspaceObject,
    SubspaceOperationsResult,
    VectorArithmeticResult,
} from './contracts';

const ZERO = parseInput('0');
const ONE = parseInput('1');

let exactCounter = 0;
const nextExactId = (prefix: string) => {
    exactCounter += 1;
    return `${prefix}_${Date.now()}_${exactCounter}`;
};

const cloneMatrix = (matrix: ValidMatrix): ValidMatrix => matrix.map(row => row.slice());

const isZeroRow = (row: SymbolicFraction[]) => row.every(isZeroSF);

const negateSF = (value: SymbolicFraction): SymbolicFraction => subtractSF(ZERO, value);

const ensureFilled = (value: string, label: string): SymbolicFraction => {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error(`${label} contains an empty entry.`);
    }
    return parseInput(trimmed);
};

export const parseVectorEntries = (entries: string[], label: string): SymbolicFraction[] => {
    if (entries.length === 0) {
        throw new Error(`${label} must have at least one entry.`);
    }
    return entries.map((entry, index) => ensureFilled(entry, `${label} (entry ${index + 1})`));
};

export const parseMatrixEntries = (rows: string[][], label: string): ValidMatrix => {
    if (rows.length === 0 || (rows[0]?.length ?? 0) === 0) {
        throw new Error(`${label} must have at least one row and one column.`);
    }
    return rows.map((row, r) => row.map((entry, c) => ensureFilled(entry, `${label} (r${r + 1}, c${c + 1})`)));
};

export const makeVector = (entries: SymbolicFraction[], label = 'v'): ExactVector => ({
    kind: 'vector',
    id: nextExactId('vec'),
    label,
    entries,
});

export const makeVectorFromStrings = (entries: string[], label = 'v'): ExactVector => makeVector(parseVectorEntries(entries, label), label);

export const makeVectorSet = (vectors: ExactVector[], label = 'S'): ExactVectorSet => ({
    kind: 'vectorSet',
    id: nextExactId('vset'),
    label,
    vectors,
});

export const makeOrderedBasis = (vectors: ExactVector[], label = 'B'): OrderedBasis => ({
    kind: 'orderedBasis',
    id: nextExactId('basis'),
    label,
    vectors,
    ambientDimension: vectors[0]?.entries.length ?? 0,
});

export const makeSubspace = (basisVectors: ExactVector[], label = 'U'): SubspaceObject => {
    const basis = makeOrderedBasis(basisVectors, `${label}_basis`);
    return {
        kind: 'subspace',
        id: nextExactId('subspace'),
        label,
        ambientDimension: basis.ambientDimension,
        basis,
        generatorSet: makeVectorSet(basisVectors, `${label}_gens`),
    };
};

export const vectorToColumnMatrix = (vector: ExactVector): ValidMatrix => vector.entries.map(entry => [entry]);

export const vectorsToColumnMatrix = (vectors: ExactVector[]): ValidMatrix => {
    if (vectors.length === 0) return [];
    const n = vectors[0].entries.length;
    return Array.from({ length: n }, (_, r) => vectors.map(vector => vector.entries[r]));
};

export const matrixColumnsToVectors = (matrix: ValidMatrix, baseLabel = 'v'): ExactVector[] => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return [];
    return Array.from({ length: cols }, (_, c) =>
        makeVector(Array.from({ length: rows }, (_, r) => matrix[r][c]), `${baseLabel}_${c + 1}`)
    );
};

const matrixVectorMultiplyEntries = (matrix: ValidMatrix, vectorEntries: SymbolicFraction[]): SymbolicFraction[] => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (cols !== vectorEntries.length) {
        throw new Error(`Matrix/vector dimension mismatch: matrix has ${cols} columns but vector has ${vectorEntries.length} entries.`);
    }

    return Array.from({ length: rows }, (_, rowIndex) => {
        let acc = ZERO;
        for (let c = 0; c < cols; c += 1) {
            acc = addSF(acc, multiplySF(matrix[rowIndex][c], vectorEntries[c]));
        }
        return acc;
    });
};

export const matrixMultiplyExact = (left: ValidMatrix, right: ValidMatrix): ValidMatrix => {
    const leftRows = left.length;
    const leftCols = left[0]?.length ?? 0;
    const rightRows = right.length;
    const rightCols = right[0]?.length ?? 0;

    if (leftCols !== rightRows) {
        throw new Error(`Matrix multiplication mismatch: ${leftRows}x${leftCols} cannot multiply ${rightRows}x${rightCols}.`);
    }

    return Array.from({ length: leftRows }, (_, r) =>
        Array.from({ length: rightCols }, (_, c) => {
            let acc = ZERO;
            for (let k = 0; k < leftCols; k += 1) {
                acc = addSF(acc, multiplySF(left[r][k], right[k][c]));
            }
            return acc;
        })
    );
};

const identityMatrix = (n: number): ValidMatrix =>
    Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => (r === c ? ONE : ZERO))
    );

export type RrefResult = {
    rref: ValidMatrix;
    pivotColumns: number[];
    rowOperations: string[];
};

export const rrefExact = (input: ValidMatrix): RrefResult => {
    const mat = cloneMatrix(input);
    const rows = mat.length;
    const cols = mat[0]?.length ?? 0;
    const pivotColumns: number[] = [];
    const rowOperations: string[] = [];

    let pivotRow = 0;
    for (let pivotCol = 0; pivotCol < cols && pivotRow < rows; pivotCol += 1) {
        let selectedRow = -1;
        for (let r = pivotRow; r < rows; r += 1) {
            if (!isZeroSF(mat[r][pivotCol])) {
                selectedRow = r;
                break;
            }
        }

        if (selectedRow === -1) continue;

        if (selectedRow !== pivotRow) {
            [mat[pivotRow], mat[selectedRow]] = [mat[selectedRow], mat[pivotRow]];
            rowOperations.push(`R_{${pivotRow + 1}} \leftrightarrow R_{${selectedRow + 1}}`);
        }

        const pivotValue = mat[pivotRow][pivotCol];
        if (!areSFEqual(pivotValue, ONE)) {
            mat[pivotRow] = mat[pivotRow].map(value => divideSF(value, pivotValue));
            rowOperations.push(`R_{${pivotRow + 1}} \leftarrow \frac{1}{${formatSymbolicFractionToLatex(pivotValue)}} R_{${pivotRow + 1}}`);
        }

        for (let r = 0; r < rows; r += 1) {
            if (r === pivotRow) continue;
            const factor = mat[r][pivotCol];
            if (isZeroSF(factor)) continue;
            mat[r] = mat[r].map((value, c) => subtractSF(value, multiplySF(factor, mat[pivotRow][c])));
            rowOperations.push(`R_{${r + 1}} \leftarrow R_{${r + 1}} - (${formatSymbolicFractionToLatex(factor)})R_{${pivotRow + 1}}`);
        }

        pivotColumns.push(pivotCol);
        pivotRow += 1;
    }

    return { rref: mat, pivotColumns, rowOperations };
};

const rankFromMatrix = (matrix: ValidMatrix): number => rrefExact(matrix).pivotColumns.length;

const getNullSpaceBasisVectors = (matrix: ValidMatrix, vectorLabel = 'n'): ExactVector[] => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return [];

    const { rref, pivotColumns } = rrefExact(matrix);
    const pivotSet = new Set(pivotColumns);
    const freeColumns = Array.from({ length: cols }, (_, c) => c).filter(c => !pivotSet.has(c));

    if (freeColumns.length === 0) return [];

    return freeColumns.map((freeCol, idx) => {
        const entries = Array.from({ length: cols }, (_, c) => (c === freeCol ? ONE : ZERO));
        pivotColumns.forEach((pivotCol, pivotRow) => {
            entries[pivotCol] = negateSF(rref[pivotRow][freeCol]);
        });
        return makeVector(entries, `${vectorLabel}_${idx + 1}`);
    });
};

const invertMatrixExact = (matrix: ValidMatrix): ValidMatrix => {
    const n = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (n === 0 || n !== cols) {
        throw new Error('Matrix inverse requires a non-empty square matrix.');
    }

    const augmented = matrix.map((row, r) => [...row, ...identityMatrix(n)[r]]);
    const { rref, pivotColumns } = rrefExact(augmented);

    const invertible = pivotColumns.length >= n &&
        Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => (r === c ? ONE : ZERO)).every((expected, c) => areSFEqual(rref[r][c], expected))
        ).every(Boolean);

    if (!invertible) {
        throw new Error('Matrix is not invertible.');
    }

    return rref.map(row => row.slice(n));
};

const extractBasisGreedy = (vectors: ExactVector[], label = 'B'): OrderedBasis => {
    const chosen: ExactVector[] = [];
    vectors.forEach(vector => {
        if (chosen.length === 0) {
            chosen.push(vector);
            return;
        }
        const before = rankFromMatrix(vectorsToColumnMatrix(chosen));
        const candidate = [...chosen, vector];
        const after = rankFromMatrix(vectorsToColumnMatrix(candidate));
        if (after > before) {
            chosen.push(vector);
        }
    });
    return makeOrderedBasis(chosen, label);
};

const canonicalCoordinateSolution = (
    basisMatrix: ValidMatrix,
    targetEntries: SymbolicFraction[],
    label = 'coord'
): { coordinates: ExactVector; unique: boolean } | null => {
    const rows = basisMatrix.length;
    const cols = basisMatrix[0]?.length ?? 0;
    if (rows !== targetEntries.length) {
        throw new Error('Coordinate solve requires basis and target in the same ambient space.');
    }

    const augmented = basisMatrix.map((row, r) => [...row, targetEntries[r]]);
    const { rref, pivotColumns } = rrefExact(augmented);

    for (let r = 0; r < rref.length; r += 1) {
        const coeffZero = rref[r].slice(0, cols).every(isZeroSF);
        if (coeffZero && !isZeroSF(rref[r][cols])) {
            return null;
        }
    }

    const pivotInCoeff = pivotColumns.filter(col => col < cols);
    const pivotMap = new Map<number, number>();
    pivotInCoeff.forEach((pivotCol, row) => pivotMap.set(pivotCol, row));

    const entries = Array.from({ length: cols }, () => ZERO);
    for (let c = 0; c < cols; c += 1) {
        const pivotRow = pivotMap.get(c);
        if (pivotRow !== undefined) {
            entries[c] = rref[pivotRow][cols];
        }
    }

    return {
        coordinates: makeVector(entries, label),
        unique: pivotInCoeff.length === cols,
    };
};

export const vectorToLatex = (vector: ExactVector): string => formatMatrixToLatex(vectorToColumnMatrix(vector));

export const vectorSetToLatex = (vectors: ExactVector[]): string =>
    vectors.map(vector => vectorToLatex(vector)).join(',\;');

export const computeVectorArithmetic = (
    u: ExactVector,
    v: ExactVector,
    scalar: SymbolicFraction
): VectorArithmeticResult => {
    if (u.entries.length !== v.entries.length) {
        throw new Error('Vector arithmetic requires vectors with the same dimension.');
    }

    const sum = makeVector(u.entries.map((entry, i) => addSF(entry, v.entries[i])), 'u+v');
    const difference = makeVector(u.entries.map((entry, i) => subtractSF(entry, v.entries[i])), 'u-v');
    const scaled = makeVector(u.entries.map(entry => multiplySF(scalar, entry)), 'a*u');

    const dot = u.entries.reduce((acc, entry, i) => addSF(acc, multiplySF(entry, v.entries[i])), ZERO);

    return { sum, difference, scaled, dot };
};

export const computeMatrixVectorProduct = (matrix: ValidMatrix, vector: ExactVector): MatrixVectorResult => {
    const resultEntries = matrixVectorMultiplyEntries(matrix, vector.entries);
    return {
        matrix,
        vector,
        resultVector: makeVector(resultEntries, 'A*x'),
    };
};

export const analyzeSpanBasisCoordinates = (
    vectorSet: ExactVectorSet,
    target: ExactVector,
    coordinateBasis?: OrderedBasis
): SpanBasisResult => {
    const setMatrix = vectorsToColumnMatrix(vectorSet.vectors);
    const targetCol = vectorToColumnMatrix(target);
    const augmented = setMatrix.map((row, r) => [...row, targetCol[r][0]]);

    const rankOfSet = rankFromMatrix(setMatrix);
    const rankOfAugmented = rankFromMatrix(augmented);
    const spanMember = rankOfSet === rankOfAugmented;
    const independent = rankOfSet === vectorSet.vectors.length;
    const extractedBasis = extractBasisGreedy(vectorSet.vectors, `${vectorSet.label}_basis`);

    let coordinates: ExactVector | undefined;
    let coordinatesUnique = false;
    const basisForCoordinates = coordinateBasis ?? extractedBasis;
    if (basisForCoordinates.vectors.length > 0 && target.entries.length === basisForCoordinates.ambientDimension) {
        const solved = canonicalCoordinateSolution(vectorsToColumnMatrix(basisForCoordinates.vectors), target.entries, `[${target.label}]_${basisForCoordinates.label}`);
        if (solved) {
            coordinates = solved.coordinates;
            coordinatesUnique = solved.unique;
        }
    }

    return {
        spanMember,
        rankOfSet,
        rankOfAugmented,
        independent,
        extractedBasis,
        coordinates,
        coordinatesUnique,
    };
};

export const computeFundamentalSubspaces = (matrix: ValidMatrix): FundamentalSubspacesResult => {
    const { rref, pivotColumns } = rrefExact(matrix);
    const m = matrix.length;
    const n = matrix[0]?.length ?? 0;

    const rowVectors = rref
        .filter(row => !isZeroRow(row))
        .map((row, i) => makeVector(row, `r_${i + 1}`));

    const colVectors = pivotColumns.map((pivotCol, i) =>
        makeVector(Array.from({ length: m }, (_, r) => matrix[r][pivotCol]), `c_${i + 1}`)
    );

    const nullVectors = getNullSpaceBasisVectors(matrix, 'n');

    const rank = pivotColumns.length;
    const nullity = n - rank;

    return {
        rank,
        nullity,
        rowBasis: makeOrderedBasis(rowVectors, 'Row(A)'),
        columnBasis: makeOrderedBasis(colVectors, 'Col(A)'),
        nullBasis: makeOrderedBasis(nullVectors, 'Nul(A)'),
    };
};

const multiplyMatrixByCoordinateVector = (matrix: ValidMatrix, coordinates: SymbolicFraction[]): SymbolicFraction[] => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (coordinates.length !== cols) {
        throw new Error('Coordinate vector length mismatch for matrix multiplication.');
    }

    return Array.from({ length: rows }, (_, r) => {
        let acc = ZERO;
        for (let c = 0; c < cols; c += 1) {
            acc = addSF(acc, multiplySF(matrix[r][c], coordinates[c]));
        }
        return acc;
    });
};

export const computeSubspaceOperations = (uBasis: OrderedBasis, wBasis: OrderedBasis): SubspaceOperationsResult => {
    if (uBasis.ambientDimension !== wBasis.ambientDimension) {
        throw new Error('Subspace operations require the same ambient dimension.');
    }

    const uMatrix = vectorsToColumnMatrix(uBasis.vectors);
    const wMatrix = vectorsToColumnMatrix(wBasis.vectors);

    const sumBasis = extractBasisGreedy([...uBasis.vectors, ...wBasis.vectors], `${uBasis.label}+${wBasis.label}`);

    const negW = wMatrix.map(row => row.map(negateSF));
    const stacked = uMatrix.map((row, r) => [...row, ...negW[r]]);
    const intersectionCoeffBasis = getNullSpaceBasisVectors(stacked, 'z');

    const uDim = uBasis.vectors.length;
    const intersectionVectors: ExactVector[] = intersectionCoeffBasis
        .map((coeffVector, index) => {
            const coeffsForU = coeffVector.entries.slice(0, uDim);
            const entries = multiplyMatrixByCoordinateVector(uMatrix, coeffsForU);
            return makeVector(entries, `i_${index + 1}`);
        })
        .filter(vector => vector.entries.some(entry => !isZeroSF(entry)));

    const intersectionBasis = extractBasisGreedy(intersectionVectors, `${uBasis.label}∩${wBasis.label}`);

    const directSum = intersectionBasis.vectors.length === 0 &&
        sumBasis.vectors.length === (uBasis.vectors.length + wBasis.vectors.length);

    return {
        sum: makeSubspace(sumBasis.vectors, `${uBasis.label}+${wBasis.label}`),
        intersection: makeSubspace(intersectionBasis.vectors, `${uBasis.label}∩${wBasis.label}`),
        directSum,
    };
};

export const analyzeLinearMapFromMatrix = (matrix: ValidMatrix, label = 'T'): LinearMapAnalysisResult => {
    const codomainDimension = matrix.length;
    const domainDimension = matrix[0]?.length ?? 0;

    const map: LinearMapObject = {
        kind: 'linearMap',
        id: nextExactId('map'),
        label,
        domainDimension,
        codomainDimension,
        definition: {
            mode: 'matrix',
            matrix,
        },
    };

    const subspaces = computeFundamentalSubspaces(matrix);

    const injective = subspaces.nullity === 0;
    const surjective = subspaces.rank === codomainDimension;
    const bijective = injective && surjective && domainDimension === codomainDimension;

    return {
        map,
        rank: subspaces.rank,
        nullity: subspaces.nullity,
        kernel: makeSubspace(subspaces.nullBasis.vectors, 'Ker(T)'),
        range: makeSubspace(subspaces.columnBasis.vectors, 'Range(T)'),
        injective,
        surjective,
        bijective,
    };
};

export const buildLinearMapFromBasisImages = (
    domainBasis: OrderedBasis,
    images: ExactVector[],
    label = 'T'
): LinearMapAnalysisResult => {
    if (domainBasis.vectors.length !== images.length) {
        throw new Error('Basis-images map requires one image vector per basis vector.');
    }
    if (domainBasis.vectors.length === 0) {
        throw new Error('Domain basis cannot be empty.');
    }

    const basisMatrix = vectorsToColumnMatrix(domainBasis.vectors);
    const imageMatrix = vectorsToColumnMatrix(images);
    const basisInverse = invertMatrixExact(basisMatrix);
    const matrix = matrixMultiplyExact(imageMatrix, basisInverse);

    const analysis = analyzeLinearMapFromMatrix(matrix, label);
    analysis.map.definition = {
        mode: 'basisImages',
        matrix,
        domainBasis,
        images,
    };
    return analysis;
};

export const basisRelativeRepresentation = (
    mapMatrix: ValidMatrix,
    domainBasis: OrderedBasis,
    codomainBasis: OrderedBasis
): ValidMatrix => {
    const b = vectorsToColumnMatrix(domainBasis.vectors);
    const c = vectorsToColumnMatrix(codomainBasis.vectors);
    const cInv = invertMatrixExact(c);
    return matrixMultiplyExact(matrixMultiplyExact(cInv, mapMatrix), b);
};

export const changeOfBasisMatrix = (fromBasis: OrderedBasis, toBasis: OrderedBasis): ValidMatrix => {
    if (fromBasis.ambientDimension !== toBasis.ambientDimension) {
        throw new Error('Change-of-basis requires two bases in the same ambient space.');
    }
    const from = vectorsToColumnMatrix(fromBasis.vectors);
    const to = vectorsToColumnMatrix(toBasis.vectors);
    const toInv = invertMatrixExact(to);
    return matrixMultiplyExact(toInv, from);
};

export const similarityTransform = (matrix: ValidMatrix, changeMatrix: ValidMatrix): ValidMatrix => {
    const pInv = invertMatrixExact(changeMatrix);
    return matrixMultiplyExact(matrixMultiplyExact(pInv, matrix), changeMatrix);
};

const getLastRrefFromCalculation = (calculation: CalculationResult): ValidMatrix | null => {
    const steps = calculation.gaussJordanSteps;
    for (let i = steps.length - 1; i >= 0; i -= 1) {
        const matrix = steps[i].matrix;
        if (matrix) return matrix;
    }
    return null;
};

const pivotAndFreeColumnsFromRref = (rref: ValidMatrix, coeffCols: number): { pivotColumns: number[]; freeColumns: number[] } => {
    const pivotColumns: number[] = [];

    rref.forEach(row => {
        for (let c = 0; c < coeffCols; c += 1) {
            if (!isZeroSF(row[c])) {
                pivotColumns.push(c);
                break;
            }
        }
    });

    const uniquePivots = Array.from(new Set(pivotColumns)).sort((a, b) => a - b);
    const freeColumns = Array.from({ length: coeffCols }, (_, c) => c).filter(c => !uniquePivots.includes(c));

    return { pivotColumns: uniquePivots, freeColumns };
};

export const runSolveReuse = (matrix: ValidMatrix, systemType: SystemType): SolveReuseResult => {
    const calculation = calculate(matrix, systemType, { summarized: false });
    const rrefMatrix = getLastRrefFromCalculation(calculation);
    const coeffCols = systemType === 'non-homogeneous' ? Math.max(0, (matrix[0]?.length ?? 0) - 1) : (matrix[0]?.length ?? 0);

    const { pivotColumns, freeColumns } = rrefMatrix
        ? pivotAndFreeColumnsFromRref(rrefMatrix, coeffCols)
        : { pivotColumns: [], freeColumns: [] };

    return {
        systemType,
        calculation,
        pivotColumns,
        freeColumns,
        rrefMatrix,
    };
};

export const matrixToPlainObject = (matrix: ValidMatrix): string[][] =>
    matrix.map(row => row.map(entry => stringifySymbolicFraction(entry)));

export const vectorToPlainObject = (vector: ExactVector): string[] => vector.entries.map(entry => stringifySymbolicFraction(entry));

export const scalarToLatex = (value: SymbolicFraction): string => formatSymbolicFractionToLatex(value);

export const matrixNamedLatex = (name: string, matrix: ValidMatrix): string => `${name} = ${formatMatrixToLatex(matrix)}`;
