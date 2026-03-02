import type { CalculationResult, SymbolicFraction, SystemType, ValidMatrix } from '../../types';

export type ExactObjectKind = 'vector' | 'vectorSet' | 'orderedBasis' | 'subspace' | 'linearMap';

export interface ExactVector {
    kind: 'vector';
    id: string;
    label: string;
    entries: SymbolicFraction[];
}

export interface ExactVectorSet {
    kind: 'vectorSet';
    id: string;
    label: string;
    vectors: ExactVector[];
}

export interface OrderedBasis {
    kind: 'orderedBasis';
    id: string;
    label: string;
    vectors: ExactVector[];
    ambientDimension: number;
}

export interface SubspaceObject {
    kind: 'subspace';
    id: string;
    label: string;
    ambientDimension: number;
    basis: OrderedBasis;
    generatorSet?: ExactVectorSet;
}

export type LinearMapDefinition =
    | {
          mode: 'matrix';
          matrix: ValidMatrix;
      }
    | {
          mode: 'basisImages';
          matrix: ValidMatrix;
          domainBasis: OrderedBasis;
          images: ExactVector[];
      };

export interface LinearMapObject {
    kind: 'linearMap';
    id: string;
    label: string;
    domainDimension: number;
    codomainDimension: number;
    definition: LinearMapDefinition;
}

export interface ExactWitness {
    claim: string;
    holds: boolean;
    certificateLatex: string[];
    notes?: string[];
}

export type ExactResultActionKind = 'copy-latex' | 'copy-json' | 'use-matrix' | 'save-matrix';

export interface ExactResultAction {
    id: string;
    kind: ExactResultActionKind;
    label: string;
    latex?: string;
    data?: unknown;
    matrix?: ValidMatrix;
    preferredName?: string;
}

export interface ExactSurfaceResult {
    id: string;
    title: string;
    summary: string;
    latexBlocks: string[];
    witness?: ExactWitness;
    actions: ExactResultAction[];
}

export interface VectorArithmeticResult {
    sum: ExactVector;
    difference: ExactVector;
    scaled: ExactVector;
    dot: SymbolicFraction;
}

export interface MatrixVectorResult {
    resultVector: ExactVector;
    matrix: ValidMatrix;
    vector: ExactVector;
}

export interface SpanBasisResult {
    spanMember: boolean;
    rankOfSet: number;
    rankOfAugmented: number;
    independent: boolean;
    extractedBasis: OrderedBasis;
    coordinates?: ExactVector;
    coordinatesUnique?: boolean;
}

export interface FundamentalSubspacesResult {
    rank: number;
    nullity: number;
    rowBasis: OrderedBasis;
    columnBasis: OrderedBasis;
    nullBasis: OrderedBasis;
}

export interface SubspaceOperationsResult {
    sum: SubspaceObject;
    intersection: SubspaceObject;
    directSum: boolean;
}

export interface LinearMapAnalysisResult {
    map: LinearMapObject;
    rank: number;
    nullity: number;
    kernel: SubspaceObject;
    range: SubspaceObject;
    injective: boolean;
    surjective: boolean;
    bijective: boolean;
}

export interface SolveReuseResult {
    systemType: SystemType;
    calculation: CalculationResult;
    pivotColumns: number[];
    freeColumns: number[];
    rrefMatrix: ValidMatrix | null;
}
