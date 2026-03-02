// --- Basic Numeric & Symbolic Structures ---

export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface Term {
    coefficient: Fraction;
    variables: Record<string, number>; // e.g., { a: 1, b: 2 } represents a*b^2
}

export type Polynomial = Term[];

export interface SymbolicFraction {
    numerator: Polynomial;
    denominator: Polynomial;
}

export interface SimplifyTraceStep {
  rule: string;
  before: SymbolicFraction;
  after: SymbolicFraction;
  note?: string;
}

export type NumericMatrix = number[][];
export type NumberFormatMode = 'fixed' | 'scientific' | 'fraction' | 'auto';

export interface NumberFormatOptions {
    digits?: number;
    mode?: NumberFormatMode;
    fractionMaxDenominator?: number;
}

// --- Matrix & System Types ---

export type Matrix = (SymbolicFraction | null)[][];
export type ValidMatrix = SymbolicFraction[][];

export type SystemType = 'homogeneous' | 'non-homogeneous';
export type AppMode = 'systemSolver' | 'matrixOperations' | 'analysis';
export type UiSurface = 'core' | 'advanced';

export type AnalysisMode = 'exact' | 'numeric';

export interface VariableAssumption {
    variable: string;
    constraint: 'nonzero' | 'positive' | 'negative' | 'integer';
}

export interface ReportOptions {
    includeCover: boolean;
    includeTOC: boolean;
    includeSteps: boolean;
    includeDetails: boolean;
    includeAssumptions: boolean;
    includeTutorNotes: boolean;
}

// --- Calculation Step & Detail Structures ---

export interface RowOperationStep {
  operation: string;
  matrixBefore?: ValidMatrix;
  matrix?: ValidMatrix; // Optional for summary mode, represents matrix AFTER operation
  description?: string;
}

export interface DeterminantRowOpStep {
    operation: string;
    elementaryMatrix: ValidMatrix;
    matrixBefore: ValidMatrix;
    matrixAfter: ValidMatrix;
    description: string;
}

export interface CofactorStep {
    position: string; // e.g., "C_{11}"
    calculation: string; // e.g., "(-1)^{1+1} \det(...) = ..."
}

export interface MatrixMultiplicationDetail {
    product: ValidMatrix;
    steps: {
        position: string; // e.g., "C_{11}"
        calculation: string; // LaTeX of the dot product calculation
    }[];
}

export interface MatrixOperationStep {
    operation: string;
    result: ValidMatrix;
    details?: MatrixMultiplicationDetail;
}

// --- Result Structures for Major Features ---

export interface DeterminantResult {
    value: SymbolicFraction;
    cofactorSteps: string[];
    rowOpSteps: DeterminantRowOpStep[];
    rowOpFinalCalculation: {
        description: string;
        equation: string;
    };
    summaryMessage?: string;
}

export interface AdjointMethodResult {
    determinantOfA: SymbolicFraction;
    cofactorMatrix: ValidMatrix;
    cofactorSteps: CofactorStep[];
    adjointMatrix: ValidMatrix;
    inverseMatrix: ValidMatrix;
    summaryMessage?: string;
}

export interface InverseResult {
    exists: boolean;
    reason?: string;
    inverseMatrix?: ValidMatrix; // Holds the inverse from Gauss-Jordan
    gaussJordanSteps?: RowOperationStep[];
    adjointMethod?: AdjointMethodResult;
    verification?: {
        a_times_ainv: MatrixMultiplicationDetail;
        ainv_times_a: MatrixMultiplicationDetail;
    };
    conditions?: SymbolicFraction[];
    summaryMessage?: string;
}

export interface CramersVariableSolution {
    variableName: string; // "x_1", "x_2", etc.
    matrixAi: ValidMatrix;
    determinantOfAi: SymbolicFraction;
    determinantStepsAi: string[];
    finalCalculation: string; // e.g., "x_1 = D_1 / D = ..."
}

export interface CramersRuleResult {
    isApplicable: boolean;
    reason?: string;
    determinantOfA?: SymbolicFraction;
    determinantStepsA?: string[];
    variableSolutions?: CramersVariableSolution[];
    summaryMessage?: string;
}

export interface NullSpaceResult {
    basis: ValidMatrix[];
    derivation: string[];
}

export interface SolutionResult {
    isConsistent: boolean;
    steps: string[];
    conditions: string[];
}

// --- Top-Level Result Types for Each App Mode ---

export interface CalculationResult {
  systemType: SystemType;
  conditions: SymbolicFraction[];
  gaussJordanSteps: RowOperationStep[];
  determinant: DeterminantResult | null;
  inverse: InverseResult | null;
  rowSpaceBasis: ValidMatrix[] | null;
  colSpaceBasis: ValidMatrix[] | null;
  nullSpace: NullSpaceResult | null;
  homogeneousSolutionSet: SolutionResult | null;
  solutionSetRef: SolutionResult | null;
  solutionSetRref: SolutionResult | null;
  cramersRule: CramersRuleResult | null;
  summaryMessage?: string;
}

export interface MatrixOperationsResult {
    steps: MatrixOperationStep[];
    finalResult: ValidMatrix;
    conditions: SymbolicFraction[];
}

// --- Analysis Results ---

export interface MatrixAnalysisMetrics {
    determinant?: number;
    norm1?: number;
    normInf?: number;
    normFro?: number;
    norm2?: number;
    conditionNumber?: number;
}

export interface ExactMatrixAnalysisResult {
    kind: 'analysis';
    mode: 'exact';
    rank: number;
    trace?: SymbolicFraction;
    warnings: string[];
    metrics?: MatrixAnalysisMetrics;
}

export interface NumericMatrixAnalysisResult {
    kind: 'analysis';
    mode: 'numeric';
    rank: number;
    trace?: number;
    lu?: { L: NumericMatrix; U: NumericMatrix; P: NumericMatrix; pivotSign: number };
    qr?: { Q: NumericMatrix; R: NumericMatrix };
    svd?: { U: NumericMatrix; S: NumericMatrix; Vt: NumericMatrix; singularValues: number[] };
    eigen?: { values: number[]; vectors?: NumericMatrix; symmetric: boolean; iterations: number; converged: boolean };
    warnings: string[];
    metrics?: MatrixAnalysisMetrics;
}

export type MatrixAnalysisResult = ExactMatrixAnalysisResult | NumericMatrixAnalysisResult;
export type AnyResult = CalculationResult | MatrixOperationsResult | MatrixAnalysisResult;

// --- Worker Types ---
export type WorkerRequestType =
    | 'systemSolver'
    | 'analysis'
    | 'matrixOperations'
    | 'batch'
    | 'details';

export interface MatrixWorkerRequest {
    id: string;
    type: WorkerRequestType;
    requestHash?: string;
    payload:
        | { matrix: ValidMatrix; systemType: SystemType }
        | { matrix: ValidMatrix; analysisMode: AnalysisMode; analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean } }
        | { expression: string; matrices: [string, ValidMatrix][] }
        | { mode: 'analysis'; analysisMode: AnalysisMode; analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean }; items: { id: string; name: string; matrix: ValidMatrix }[] }
        | { mode: 'expression'; expression: string; analysisMode: AnalysisMode; analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean }; items: { id: string; name: string; matrix: ValidMatrix }[] }
        | { section: string; appMode: AppMode; results: AnyResult; originalInputs: any };
}

export interface MatrixWorkerResponse {
    id: string;
    ok: boolean;
    result?: AnyResult | { id: string; name: string; result?: AnyResult; error?: string }[];
    error?: string;
}

// --- Shareable State Types ---
type SerializableMatrix = string;
type SerializableMatrixDefs = Record<string, { rows: number | ''; cols: number | ''; matrix: SerializableMatrix }>;

export interface SharedState {
    uiSurface?: UiSurface;
    appMode: AppMode;
    systemType?: SystemType;
    rows?: number | '';
    cols?: number | '';
    solverMatrix?: SerializableMatrix;
    expression?: string;
    matrixDefs?: SerializableMatrixDefs;
    analysisRows?: number | '';
    analysisCols?: number | '';
    analysisMatrix?: SerializableMatrix;
    analysisMode?: AnalysisMode;
    analysisOptions?: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean };
    numberFormat?: NumberFormatOptions;
    variableAssumptions?: VariableAssumption[];
}

export interface ProjectVersion {
    id: string;
    name: string;
    createdAt: number;
    state: SharedState;
}

// --- UI & Local Storage Types ---
export interface SavedMatrix {
    id: string;
    name: string;
    matrix: (string | null)[][];
    rows: number;
    cols: number;
    tags?: string[];
    folder?: string;
    createdAt?: number;
}

export interface ExerciseItem {
    prompt?: string;
    solution?: number[];
    [key: string]: unknown;
}

export interface ExercisePack {
    id: string;
    name?: string;
    exercises: ExerciseItem[];
}

export interface PluginCommandAction {
    type: 'setExpression' | 'setMode' | 'openTool';
    value?: string;
}

export interface PluginCommand {
    id: string;
    label?: string;
    action?: PluginCommandAction;
}

export interface Plugin {
    id: string;
    name?: string;
    commands?: PluginCommand[];
}

export interface MatrixRecipe {
    id: string;
    name: string;
    expression: string;
    builderNodes: OperationNode[];
    createdAt?: number;
}

export interface WorkspaceProfile {
    id: string;
    name: string;
}

// --- Operation Builder Types ---

export type OperandType = 'matrix' | 'result' | 'number';

export interface Operand {
    type: OperandType;
    value: string; // Matrix name ('A'), step ID, or number string for exponent
}

export interface OperationNode {
    id: string;
    operation: '+' | '-' | '*' | '^';
    left: Operand | null;
    right: Operand | null;
    resultName: string; // e.g., T1, T2, Final Result
    error?: string | null;
}

// --- Workspace / Library Contracts ---

export type WorkspaceSchemaVersion = 1 | 2 | 3;
export type LibraryObjectKind = 'matrix' | 'vector' | 'vectorSet' | 'basis' | 'linearMap' | 'workspace';
export type SavedOutputKind = 'systemSolver' | 'matrixOperations' | 'analysis' | 'batch' | 'workspace';

export interface WorkspaceSnapshot {
    format: 'mmatrix';
    schemaVersion: WorkspaceSchemaVersion;
    createdAt: number;
    updatedAt: number;
}
