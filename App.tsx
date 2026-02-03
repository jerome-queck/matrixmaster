import React, { useState, useCallback, useMemo, useEffect, useRef, startTransition } from 'react';
import * as LZString from 'lz-string';
import { MatrixInput } from './components/MatrixInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Modal } from './components/Modal';
import { LatexRenderer } from './components/LatexRenderer';
import { OperationBuilder } from './components/OperationBuilder';
import ReportView from './components/ReportView';
import DocumentationView from './components/DocumentationView';
import { parseInput, stringifySymbolicFraction, expressionToBuilderNodes, builderNodesToExpression, toNumericMatrix, formatMatrixToLatex, formatAugmentedMatrixToLatex, formatSymbolicFractionToLatex, areSFEqual, isZeroSF, symbolicFractionToNumber, formatNumberToLatex, formatNumericMatrixToLatex, formatNumericMatrixToCsv, calculateRank, numericConditionNumber, numericMatrixExp, numericMatrixLog, numericMatrixSqrt, numericJordanForm, numericJacobi, numericGaussSeidel, numericConjugateGradient, numericGMRES, numericLU, simplifySymbolicFractionWithTrace } from './services/matrixService';
import type { Matrix, CalculationResult, SystemType, SymbolicFraction, CramersRuleResult, ValidMatrix, AppMode, MatrixOperationsResult, DeterminantOfOperationResult, AnalysisMode, SharedState, SavedMatrix, OperationNode, NumberFormatOptions, VariableAssumption, MatrixRecipe, WorkspaceProfile, ReportOptions, AnyResult, DeterminantResult, InverseResult, MatrixAnalysisResult } from './types';
import { useMatrixWorker } from './hooks/useMatrixWorker';
import { useBatchRunner } from './hooks/useBatchRunner';

type AllResultTypes = AnyResult;

const defaultMatrix = (rows: number, cols: number): Matrix => Array(rows).fill(null).map(() => Array(cols).fill(null));

// --- Theme Customization ---
type CustomThemeColors = {
    bgColor: string; textColor: string; primaryTextColor: string; secondaryTextColor: string;
    borderColor: string; cardBgStart: string; cardBgEnd: string; buttonBg: string; inputBg: string;
};
const cssVarMap: Record<keyof CustomThemeColors, string> = {
    bgColor: '--bg-color', textColor: '--text-color', primaryTextColor: '--primary-text-color', secondaryTextColor: '--secondary-text-color',
    borderColor: '--border-color', cardBgStart: '--card-bg-start', cardBgEnd: '--card-bg-end', buttonBg: '--button-bg', inputBg: '--input-bg'
};
const defaultCustomColors: CustomThemeColors = {
    bgColor: '#0b0b0f', textColor: '#f2f2f7', primaryTextColor: '#0a84ff', secondaryTextColor: '#8e8e93',
    borderColor: '#2c2c2e', cardBgStart: '#1c1c1e', cardBgEnd: '#121217', buttonBg: '#0a84ff', inputBg: '#1c1c1e'
};
const defaultNumberFormat: NumberFormatOptions = {
    digits: 6,
    mode: 'fixed',
    fractionMaxDenominator: 1000
};
const defaultReportOptions: ReportOptions = {
    includeCover: true,
    includeTOC: true,
    includeSteps: true,
    includeDetails: false,
    includeAssumptions: true,
    includeTutorNotes: false
};

const EXPLANATIONS: Record<string, string> = {
    'Row Echelon Form (REF)': `A matrix is in Row Echelon Form if it satisfies three key properties. This form is typically achieved through the process of Gaussian Elimination.
1. All rows consisting entirely of zeros are at the bottom of the matrix.
2. In each non-zero row, the first non-zero entry (called the leading entry or pivot) is in a column to the right of the leading entry of the row above it. This creates a staircase-like pattern.
3. All entries in a column below a leading entry are zero.

The REF of a matrix is not unique; different sequences of row operations can lead to different REF matrices. However, they all share the same pivot positions. This form is useful because it simplifies a system of linear equations, allowing it to be easily solved using back-substitution.`,
    'Reduced Row Echelon Form (RREF)': `A matrix in Reduced Row Echelon Form (RREF) meets all the conditions of REF, plus two additional, stricter conditions. This form is achieved through Gauss-Jordan Elimination.
1. The leading entry (pivot) in each non-zero row is 1.
2. Each leading 1 is the only non-zero entry in its column.

Unlike REF, the RREF of a matrix is unique for any given matrix. This uniqueness makes it incredibly powerful. For a system of linear equations $Ax=b$, the RREF of the augmented matrix $[A|b]$ directly reveals the solution set without the need for back-substitution. It is the most simplified version of the system.`,
    'Determinant': `The determinant is a special scalar value that can be calculated from a square matrix. It encodes a wealth of information about the matrix and the linear transformation it represents.

- **Invertibility**: A matrix $A$ is invertible if and only if its determinant is non-zero ($det(A) \\neq 0$). If $det(A) = 0$, the matrix is called singular.
- **Geometric Interpretation**: For a 2x2 matrix, the absolute value of the determinant represents the area of the parallelogram formed by its column vectors. In 3D, it's the volume of the parallelepiped. In general, $|det(A)|$ is the volume scaling factor of the linear transformation described by $A$. The sign of the determinant indicates whether the transformation preserves or reverses orientation.
- **System of Equations**: For a system $Ax=b$, a non-zero determinant implies a unique solution exists. A zero determinant implies there are either no solutions or infinitely many solutions.
- **Properties**:
    - $det(A^T) = det(A)$
    - $det(AB) = det(A)det(B)$
    - $det(A^{-1}) = 1/det(A)$
    - Swapping two rows multiplies the determinant by -1.
    - Multiplying a row by a scalar $c$ multiplies the determinant by $c$.
    - Adding a multiple of one row to another does not change the determinant.`,
    'Matrix Inverse': `For an $n \\times n$ square matrix $A$, its inverse, denoted $A^{-1}$, is the unique matrix that, when multiplied by $A$, results in the $n \\times n$ identity matrix $I$.
$A A^{-1} = A^{-1} A = I$

A matrix only has an inverse if it is square and its determinant is non-zero.

- **Solving Systems**: The inverse provides a theoretical way to solve a system $Ax=b$. If $A$ is invertible, the unique solution is $x = A^{-1}b$.
- **Methods for Finding the Inverse**:
    1. **Gauss-Jordan Elimination**: Augment the matrix $A$ with the identity matrix, forming $[A|I]$. Perform row operations until $A$ is transformed into $I$. The matrix on the right side will then be $A^{-1}$, resulting in $[I|A^{-1}]$.
    2. **Adjoint Method**: The inverse can also be calculated using the formula $A^{-1} = \\frac{1}{det(A)} adj(A)$, where $adj(A)$ is the adjugate (or classical adjoint) of A, which is the transpose of the cofactor matrix of A.
- **Properties**:
    - $(A^{-1})^{-1} = A$
    - $(AB)^{-1} = B^{-1}A^{-1}$ (Note the reversed order)
    - $(A^T)^{-1} = (A^{-1})^T$`,
    'Cramer\'s Rule': `Cramer's Rule is a specific formula for finding the solution to a system of linear equations $Ax=b$ when the coefficient matrix $A$ is square and has a non-zero determinant.

The value for each variable $x_i$ in the solution vector is given by the ratio of two determinants:
$x_i = \\frac{det(A_i)}{det(A)}$

- $A$ is the original coefficient matrix.
- $A_i$ is the matrix created by replacing the $i$-th column of $A$ with the constant vector $b$.

While Cramer's Rule is an elegant formula that highlights the role of determinants, it is computationally very inefficient for systems larger than 3x3 compared to Gaussian elimination. Its primary value is theoretical.`,
    'Row Space': `The row space of a matrix $A$, denoted $Row(A)$, is the set of all possible linear combinations of its row vectors. It is a vector subspace of $R^n$, where $n$ is the number of columns in $A$.

- **Finding a Basis**: A standard way to find a basis for the row space is to perform row operations to bring the matrix to its Row Echelon Form (REF). The non-zero rows of the REF matrix form a basis for the row space of the original matrix $A$.
- **Key Property**: Elementary row operations do not change the row space of a matrix. This is why reducing to REF works.
- **Dimension**: The dimension of the row space is called the row rank of the matrix. A fundamental theorem of linear algebra states that the row rank is always equal to the column rank, and this value is simply called the rank of the matrix.`,
    'Column Space': `The column space of a matrix $A$, denoted $Col(A)$, is the set of all possible linear combinations of its column vectors. It is a vector subspace of $R^m$, where $m$ is the number of rows in $A$.

The column space is also the range of the linear transformation $T(x) = Ax$. It represents all possible output vectors $b$ for which the system $Ax=b$ has a solution.

- **Finding a Basis**: To find a basis for the column space, reduce matrix $A$ to Row Echelon Form. The columns in the *original matrix* $A$ that correspond to the pivot columns in the echelon form constitute a basis for $Col(A)$.
- **Consistency**: A system of linear equations $Ax=b$ is consistent (i.e., has at least one solution) if and only if the vector $b$ is in the column space of $A$.
- **Dimension**: The dimension of the column space is the column rank, which is equal to the rank of the matrix.`,
    'Null Space (Kernel)': `The null space of an $m \\times n$ matrix $A$, denoted $Nul(A)$, is the set of all vectors $x$ in $R^n$ that are mapped to the zero vector in $R^m$ by the linear transformation $T(x)=Ax$. In other words, it is the complete solution set to the homogeneous equation $Ax = 0$.

- **Properties**: The null space is a vector subspace of $R^n$.
- **Finding a Basis**: To find a basis for the null space, solve the homogeneous system $Ax=0$. This is done by finding the Reduced Row Echelon Form (RREF) of $A$, writing the pivot variables in terms of the free variables, and expressing the solution vector as a linear combination of vectors multiplied by the free variables. These vectors form the basis for $Nul(A)$.
- **Rank-Nullity Theorem**: This fundamental theorem connects the dimensions of the column space and the null space. For an $m \\times n$ matrix $A$:
$rank(A) + nullity(A) = n$
where $rank(A)$ is the dimension of the column space and $nullity(A)$ is the dimension of the null space.`
};

const INFO_CONTENT = {
    systemSolver: {
        title: 'System Solver',
        summary: 'Solve linear systems with row reduction, REF/RREF, and step-by-step operations.'
    },
    matrixOperations: {
        title: 'Matrix Operations',
        summary: 'Evaluate expressions like A * B or A^2 - C with optional step details.'
    },
    determinantOperation: {
        title: 'Determinant of Operation',
        summary: 'Compute determinant of a matrix expression quickly without full expansion.'
    },
    analysis: {
        title: 'Matrix Analysis',
        summary: 'Compute rank, trace, and numeric decompositions such as LU, QR, SVD, and eigen.'
    },
    analysisModes: {
        title: 'Exact vs Numeric',
        summary: 'Exact mode keeps symbolic fractions. Numeric mode enables decompositions and requires numeric entries.'
    },
    decompositions: {
        title: 'Decompositions',
        summary: 'Toggle LU, QR, SVD, and eigen calculations to control runtime and output.'
    },
    matrixInput: {
        title: 'Matrix Input',
        summary: 'Enter integers, fractions, or symbols. Save to and load from the library.'
    },
    library: {
        title: 'Matrix Library',
        summary: 'Store matrices with folders and tags, then search and reuse them across tools.'
    },
    history: {
        title: 'History & Snapshots',
        summary: 'Named snapshots support undo/redo and store cached determinant/inverse results.'
    },
    determinantCache: {
        title: 'Determinant/Inverse Cache',
        summary: 'Each snapshot stores cached determinant and inverse results for faster comparisons.'
    },
    exportImport: {
        title: 'Export and Import',
        summary: 'Export full app state to JSON or share files, and import CSV/TSV/LaTeX into matrices.'
    },
    clipboard: {
        title: 'Clipboard Formats',
        summary: 'Copy the active matrix as CSV, LaTeX, or JSON with a single click.'
    },
    compare: {
        title: 'Compare Matrices',
        summary: 'Side-by-side diff view highlights changed cells between matrices.'
    },
    presets: {
        title: 'Matrix Presets',
        summary: 'Generate identity, permutation, Jordan block, Hilbert, or random SPD matrices.'
    },
    sparse: {
        title: 'Sparse View',
        summary: 'Inspect CSR/CSC arrays and a sparsity heatmap with a configurable threshold.'
    },
    batch: {
        title: 'Batch Runner',
        summary: 'Run analysis or a single expression across saved matrices and export a combined report.'
    },
    recipes: {
        title: 'Matrix Recipes',
        summary: 'Save a matrix operation sequence as a reusable macro for new inputs.'
    },
    assumptions: {
        title: 'Variable Assumptions',
        summary: 'Define constraints (nonzero, positive, integer) that flow into steps and reports.'
    },
    numberFormat: {
        title: 'Precision and Rounding',
        summary: 'Control digits, fixed or scientific formatting, or fractionization for outputs and exports.'
    },
    report: {
        title: 'PDF Report',
        summary: 'Print a styled report with optional cover, TOC, steps, assumptions, and tutor notes.'
    },
    profiles: {
        title: 'Workspace Profiles',
        summary: 'Keep libraries, history, and settings isolated in multiple local profiles.'
    },
    help: {
        title: 'Offline Help Pack',
        summary: 'Bundled quick start, examples, and walkthroughs with zero network dependency.'
    },
    documentation: {
        title: 'Documentation',
        summary: 'Full in-app manual with a dedicated printable PDF.'
    },
    tutorMode: {
        title: 'Tutor Mode',
        summary: 'Adds concise explanations for each row operation in step views.'
    },
    timeline: {
        title: 'Step Timeline',
        summary: 'Play, bookmark, and jump between pivot steps during row operations.'
    }
} as const;

type FontSize = 'small' | 'medium' | 'large';
type BuilderMode = 'text' | 'visual';
type HistorySnapshot = { id: string; name: string; createdAt: number; state: SharedState };
type InfoKey = keyof typeof INFO_CONTENT;

const App: React.FC = () => {
    // Shared State
    const [appMode, setAppMode] = useState<AppMode>('systemSolver');
    const [results, setResults] = useState<AllResultTypes | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [shareButtonText, setShareButtonText] = useState('Share File');
    const [isShareOpen, setShareOpen] = useState(false);
    const [resultsKey, setResultsKey] = useState<number>(Date.now());
    const detailCacheRef = useRef<Map<string, { determinant?: DeterminantResult; inverse?: InverseResult }>>(new Map());
    const keyCounter = useRef(0);
    const nextKey = () => {
        keyCounter.current += 1;
        return keyCounter.current;
    };
    const bumpSolverMatrixKey = () => setSolverMatrixKey(prev => prev + 1);
    const bumpAnalysisMatrixKey = () => setAnalysisMatrixKey(prev => prev + 1);
    const openInfo = (key: InfoKey | string) => {
        if (!Object.prototype.hasOwnProperty.call(INFO_CONTENT, key)) return;
        setInfoState({ open: true, key: key as InfoKey });
    };
    const closeInfo = () => setInfoState({ open: false, key: null });
    const triggerPrint = (mode: 'report' | 'batch' | 'docs') => {
        setPrintMode(mode);
        setTimeout(() => window.print(), 50);
    };

    const InfoButton: React.FC<{ infoKey: InfoKey; className?: string }> = ({ infoKey, className }) => (
        <button
            type="button"
            onClick={() => openInfo(infoKey)}
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] info-dot ${className ?? ''}`}
            aria-label={`${INFO_CONTENT[infoKey].title} info`}
            title={INFO_CONTENT[infoKey].title}
        >
            i
        </button>
    );

    const { runWorkerRequest } = useMatrixWorker();

    // System Solver State
    const [rows, setRows] = useState<number | ''>(3);
    const [cols, setCols] = useState<number | ''>(3);
    const [systemType, setSystemType] = useState<SystemType>('homogeneous');
    const [solverMatrix, setSolverMatrix] = useState<Matrix>(defaultMatrix(3, 3));
    const [originalMatrix, setOriginalMatrix] = useState<ValidMatrix | null>(null);
    const [solverMatrixKey, setSolverMatrixKey] = useState<number>(Date.now());
    
    // Matrix Operations State
    const [expression, setExpression] = useState<string>('A * B');
    const [matrixDefs, setMatrixDefs] = useState<Record<string, { rows: number | ''; cols: number | ''; matrix: Matrix; key: number }>>({
        'A': { rows: 2, cols: 2, matrix: defaultMatrix(2, 2), key: Date.now() + 1 },
        'B': { rows: 2, cols: 2, matrix: defaultMatrix(2, 2), key: Date.now() + 2 }
    });
    const [builderMode, setBuilderMode] = useState<BuilderMode>('text');
    const [builderNodes, setBuilderNodes] = useState<OperationNode[]>([]);
    const [debouncedExpression, setDebouncedExpression] = useState<string>('A * B');

    // Analysis State
    const [analysisRows, setAnalysisRows] = useState<number | ''>(3);
    const [analysisCols, setAnalysisCols] = useState<number | ''>(3);
    const [analysisMatrix, setAnalysisMatrix] = useState<Matrix>(defaultMatrix(3, 3));
    const [analysisMatrixKey, setAnalysisMatrixKey] = useState<number>(Date.now());
    const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('numeric');
    const [analysisSource, setAnalysisSource] = useState<string>('custom');
    const [analysisOptions, setAnalysisOptions] = useState({
        computeLU: true,
        computeQR: true,
        computeSVD: true,
        computeEigen: true
    });
    
    // --- New UI/UX State ---
    const [library, setLibrary] = useState<SavedMatrix[]>([]);
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [matrixToSave, setMatrixToSave] = useState<{matrix: Matrix, rows: number, cols: number} | null>(null);
    const [isLoadModalOpen, setLoadModalOpen] = useState(false);
    const [loadTarget, setLoadTarget] = useState<'solver' | 'analysis' | string>('solver');
    const [useResultModal, setUseResultModal] = useState<{ open: boolean, matrix: ValidMatrix | null }>({ open: false, matrix: null });
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isHistoryOpen, setHistoryOpen] = useState(false);
    const [snapshotName, setSnapshotName] = useState('');
    const [history, setHistory] = useState<HistorySnapshot[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [autoSnapshotOnCalculate, setAutoSnapshotOnCalculate] = useState(true);
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const [isCompareModalOpen, setCompareModalOpen] = useState(false);
    const [exportMatrixKey, setExportMatrixKey] = useState('solver');
    const [importMatrixKey, setImportMatrixKey] = useState('solver');
    const [librarySearch, setLibrarySearch] = useState('');
    const [libraryFolderFilter, setLibraryFolderFilter] = useState('all');
    const [libraryView, setLibraryView] = useState<'list' | 'grid'>('grid');
    const [compareLeftKey, setCompareLeftKey] = useState('solver');
    const [compareRightKey, setCompareRightKey] = useState('analysis');
    const [theme, setTheme] = useState('dark');
    const [appVersion, setAppVersion] = useState<string>('Web');
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [updateStatus, setUpdateStatus] = useState<{ state: string; percent?: number; message?: string; version?: string }>({ state: 'idle' });
    const [updateToastVisible, setUpdateToastVisible] = useState(false);
    const [density, setDensity] = useState('comfortable');
    const [fontSize, setFontSize] = useState<FontSize>('medium');
    const [customThemeColors, setCustomThemeColors] = useState<CustomThemeColors>(defaultCustomColors);
    const [explainerState, setExplainerState] = useState({ isOpen: false, topic: '', content: '' });
    const [tutorMode, setTutorMode] = useState(false);
    const [numberFormat, setNumberFormat] = useState<NumberFormatOptions>(defaultNumberFormat);
    const [variableAssumptions, setVariableAssumptions] = useState<VariableAssumption[]>([]);
    const [recipes, setRecipes] = useState<MatrixRecipe[]>([]);
    const [reportOptions, setReportOptions] = useState<ReportOptions>(defaultReportOptions);

    // Workspace Profiles
    const [profiles, setProfiles] = useState<WorkspaceProfile[]>([]);
    const [activeProfile, setActiveProfile] = useState('default');
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [isProfilesOpen, setProfilesOpen] = useState(false);

    // Feature Modals
    const [isPresetsOpen, setPresetsOpen] = useState(false);
    const [isSparseOpen, setSparseOpen] = useState(false);
    const [isBatchOpen, setBatchOpen] = useState(false);
    const [isRecipesOpen, setRecipesOpen] = useState(false);
    const [isAssumptionsOpen, setAssumptionsOpen] = useState(false);
    const [isHelpOpen, setHelpOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);
    const [isToolsOpen, setToolsOpen] = useState(false);
    const [isDocsOpen, setDocsOpen] = useState(false);
    const [printMode, setPrintMode] = useState<'none' | 'report' | 'batch' | 'docs'>('none');
    const [infoState, setInfoState] = useState<{ open: boolean; key: keyof typeof INFO_CONTENT | null }>({ open: false, key: null });
    const [isCommandOpen, setCommandOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [splitRatio, setSplitRatio] = useState(0.55);
    const [isResizing, setIsResizing] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement | null>(null);
    const [isPracticeOpen, setPracticeOpen] = useState(false);
    const [practiceMatrix, setPracticeMatrix] = useState<ValidMatrix | null>(null);
    const [practiceB, setPracticeB] = useState<ValidMatrix | null>(null);
    const [practiceSolution, setPracticeSolution] = useState<number[]>([]);
    const [practiceGuess, setPracticeGuess] = useState<string[]>([]);
    const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
    const [isBlockOpen, setBlockOpen] = useState(false);
    const [blockTarget, setBlockTarget] = useState('analysis');
    const [blockKeys, setBlockKeys] = useState({ tl: 'A', tr: 'B', bl: 'C', br: 'D' });
    const [isSimplifierOpen, setSimplifierOpen] = useState(false);
    const [simplifyInput, setSimplifyInput] = useState('1/2');
    const [simplifyTrace, setSimplifyTrace] = useState<any[]>([]);
    const [simplifyOutput, setSimplifyOutput] = useState<string>('');
    const [isMatrixFunctionsOpen, setMatrixFunctionsOpen] = useState(false);
    const [matrixFuncTarget, setMatrixFuncTarget] = useState('analysis');
    const [matrixFuncType, setMatrixFuncType] = useState<'exp' | 'log' | 'sqrt'>('exp');
    const [matrixFuncResult, setMatrixFuncResult] = useState<number[][] | null>(null);
    const [matrixFuncError, setMatrixFuncError] = useState<string | null>(null);
    const [isJordanOpen, setJordanOpen] = useState(false);
    const [jordanTarget, setJordanTarget] = useState('analysis');
    const [jordanResult, setJordanResult] = useState<{ J: number[][]; P: number[][]; eigenvalues: number[]; warning?: string } | null>(null);
    const [isIterativeOpen, setIterativeOpen] = useState(false);
    const [iterativeTarget, setIterativeTarget] = useState('solver');
    const [iterativeMethod, setIterativeMethod] = useState<'jacobi' | 'gs' | 'cg' | 'gmres'>('jacobi');
    const [iterativeTol, setIterativeTol] = useState(1e-6);
    const [iterativeMaxIter, setIterativeMaxIter] = useState(50);
    const [iterativePrecond, setIterativePrecond] = useState<'none' | 'jacobi' | 'ilu'>('none');
    const [iterativeResult, setIterativeResult] = useState<{ x: number[]; residuals: number[] } | null>(null);
    const [iterativeError, setIterativeError] = useState<string | null>(null);
    const [isExerciseOpen, setExerciseOpen] = useState(false);
    const [exercisePacks, setExercisePacks] = useState<any[]>([]);
    const [activePackId, setActivePackId] = useState<string | null>(null);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
    const [exerciseAnswer, setExerciseAnswer] = useState<string[]>([]);
    const [exerciseFeedback, setExerciseFeedback] = useState<string | null>(null);
    const [isPluginsOpen, setPluginsOpen] = useState(false);
    const [plugins, setPlugins] = useState<any[]>([]);
    const [isVersionsOpen, setVersionsOpen] = useState(false);
    const [projectVersions, setProjectVersions] = useState<any[]>([]);
    const [versionName, setVersionName] = useState('');
    const [isStepCompareOpen, setStepCompareOpen] = useState(false);
    const [stepCompareResult, setStepCompareResult] = useState<string | null>(null);

    // Presets
    const [presetTarget, setPresetTarget] = useState('analysis');
    const [presetType, setPresetType] = useState<'identity' | 'permutation' | 'jordan' | 'hilbert' | 'spd'>('identity');
    const [presetRows, setPresetRows] = useState<number>(3);
    const [presetCols, setPresetCols] = useState<number>(3);
    const [presetJordanEigen, setPresetJordanEigen] = useState<number>(1);

    // Sparse
    const [sparseTarget, setSparseTarget] = useState('analysis');
    const [sparseFormat, setSparseFormat] = useState<'csr' | 'csc'>('csr');
    const [sparseEpsilon, setSparseEpsilon] = useState<number>(1e-8);

    // Clipboard
    const [clipboardTarget, setClipboardTarget] = useState('analysis');
    const [clipboardFormat, setClipboardFormat] = useState<'csv' | 'latex' | 'json'>('csv');

    const [recipeName, setRecipeName] = useState('');
    const [assumptionVar, setAssumptionVar] = useState('');
    const [assumptionConstraint, setAssumptionConstraint] = useState<VariableAssumption['constraint']>('nonzero');

    // Profiles
    const [newProfileName, setNewProfileName] = useState('');


    // --- State Restoration & Local Storage ---
    const PROFILE_LIST_KEY = 'matrix-master-profiles';
    const ACTIVE_PROFILE_KEY = 'matrix-master-active-profile';
    const profileStorageKey = (profileId: string, key: string) => `matrix-master:${profileId}:${key}`;

    const migrateLegacyStorage = (profileId: string) => {
        const legacyMap: Record<string, string> = {
            'matrix-master-theme': 'theme',
            'matrix-master-density': 'density',
            'matrix-master-font-size': 'fontSize',
            'matrix-master-builder-mode': 'builderMode',
            'matrix-master-tutor-mode': 'tutorMode',
            'matrix-master-auto-snapshot': 'autoSnapshot',
            'matrix-master-custom-theme': 'customTheme',
            'matrix-master-library': 'library'
        };

        Object.entries(legacyMap).forEach(([legacyKey, newKey]) => {
            const legacyValue = localStorage.getItem(legacyKey);
            const targetKey = profileStorageKey(profileId, newKey);
            if (legacyValue && !localStorage.getItem(targetKey)) {
                localStorage.setItem(targetKey, legacyValue);
            }
        });
    };

    const loadProfile = (profileId: string) => {
        setProfileLoaded(false);
        const getItem = (key: string) => localStorage.getItem(profileStorageKey(profileId, key));

        setTheme(getItem('theme') || 'dark');
        setDensity(getItem('density') || 'comfortable');
        setFontSize((getItem('fontSize') || 'medium') as FontSize);
        setBuilderMode((getItem('builderMode') || 'text') as BuilderMode);
        setTutorMode(getItem('tutorMode') === 'true');
        const savedAutoSnapshot = getItem('autoSnapshot');
        if (savedAutoSnapshot !== null) setAutoSnapshotOnCalculate(savedAutoSnapshot === 'true');

        try {
            const savedCustomColors = getItem('customTheme');
            if (savedCustomColors) setCustomThemeColors(JSON.parse(savedCustomColors));
        } catch (e) { console.error("Failed to load custom theme colors", e); }

        try {
            const savedLibrary = getItem('library');
            if (savedLibrary) setLibrary(JSON.parse(savedLibrary));
            else setLibrary([]);
        } catch (e) { console.error("Failed to load matrix library", e); setLibrary([]); }

        try {
            const savedHistory = getItem('history');
            const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
            setHistory(parsedHistory);
            const savedIndex = getItem('historyIndex');
            if (savedIndex !== null) {
                const idx = parseInt(savedIndex, 10);
                setHistoryIndex(Number.isFinite(idx) ? Math.min(idx, parsedHistory.length - 1) : (parsedHistory.length > 0 ? parsedHistory.length - 1 : -1));
            } else {
                setHistoryIndex(parsedHistory.length > 0 ? parsedHistory.length - 1 : -1);
            }
        } catch (e) { console.error("Failed to load history", e); setHistory([]); setHistoryIndex(-1); }

        try {
            const savedRecipes = getItem('recipes');
            if (savedRecipes) setRecipes(JSON.parse(savedRecipes));
            else setRecipes([]);
        } catch (e) { console.error("Failed to load recipes", e); setRecipes([]); }

        try {
            const savedAssumptions = getItem('assumptions');
            if (savedAssumptions) setVariableAssumptions(JSON.parse(savedAssumptions));
            else setVariableAssumptions([]);
        } catch (e) { console.error("Failed to load assumptions", e); setVariableAssumptions([]); }

        try {
            const savedFormat = getItem('numberFormat');
            if (savedFormat) setNumberFormat({ ...defaultNumberFormat, ...JSON.parse(savedFormat) });
            else setNumberFormat(defaultNumberFormat);
        } catch (e) { console.error("Failed to load number format", e); setNumberFormat(defaultNumberFormat); }

        try {
            const savedReport = getItem('reportOptions');
            if (savedReport) setReportOptions({ ...defaultReportOptions, ...JSON.parse(savedReport) });
            else setReportOptions(defaultReportOptions);
        } catch (e) { console.error("Failed to load report options", e); setReportOptions(defaultReportOptions); }

        try {
            const savedPlugins = getItem('plugins');
            if (savedPlugins) setPlugins(JSON.parse(savedPlugins));
            else setPlugins([]);
        } catch (e) { console.error("Failed to load plugins", e); setPlugins([]); }

        try {
            const savedVersions = getItem('projectVersions');
            if (savedVersions) setProjectVersions(JSON.parse(savedVersions));
            else setProjectVersions([]);
        } catch (e) { console.error("Failed to load project versions", e); setProjectVersions([]); }

        try {
            const savedExercises = getItem('exercisePacks');
            if (savedExercises) setExercisePacks(JSON.parse(savedExercises));
            else setExercisePacks([]);
        } catch (e) { console.error("Failed to load exercise packs", e); setExercisePacks([]); }

        try {
            const savedSplit = getItem('layoutSplit');
            if (savedSplit) {
                const parsed = parseFloat(savedSplit);
                if (Number.isFinite(parsed)) setSplitRatio(Math.min(0.75, Math.max(0.25, parsed)));
            }
        } catch (e) { console.error("Failed to load layout split", e); }

        setProfileLoaded(true);
    };

    useEffect(() => {
        const storedProfiles = localStorage.getItem(PROFILE_LIST_KEY);
        let parsedProfiles: WorkspaceProfile[] = [];
        if (storedProfiles) {
            try {
                parsedProfiles = JSON.parse(storedProfiles);
            } catch (e) { console.error("Failed to parse profiles", e); }
        }
        if (parsedProfiles.length === 0) {
            parsedProfiles = [{ id: 'default', name: 'Default' }];
            localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(parsedProfiles));
        }
        setProfiles(parsedProfiles);

        const storedActive = localStorage.getItem(ACTIVE_PROFILE_KEY) || parsedProfiles[0].id;
        setActiveProfile(storedActive);
        migrateLegacyStorage(storedActive);
        loadProfile(storedActive);

        // Load from URL hash (profile-agnostic)
        const hash = window.location.hash;
        if (hash.startsWith('#data=')) {
            try {
                const encoded = hash.substring(6);
                if (!encoded) return;

                const jsonString = LZString.decompressFromEncodedURIComponent(encoded);
                if (!jsonString) throw new Error("Could not decompress data from URL.");
                const state: SharedState = JSON.parse(jsonString);
                handleReset();
                applySharedState(state);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (e) {
                console.error("Failed to load state from URL:", e);
                setError("Could not load state from the provided link. It might be corrupted.");
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }
    }, []);


    useEffect(() => {
        // Apply theme and density to HTML element
        document.documentElement.setAttribute('data-density', density);

        document.body.setAttribute('data-theme', theme);
        if (theme === 'custom') {
            document.documentElement.removeAttribute('data-theme');
            for (const [key, value] of Object.entries(customThemeColors)) {
                document.documentElement.style.setProperty(cssVarMap[key as keyof CustomThemeColors], value);
            }
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            // Clean up custom styles when switching back to a default theme
            for (const cssVar of Object.values(cssVarMap)) {
                document.documentElement.style.removeProperty(cssVar);
            }
        }

        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'density'), density);
        localStorage.setItem(profileStorageKey(activeProfile, 'theme'), theme);
        if (theme === 'custom') {
            localStorage.setItem(profileStorageKey(activeProfile, 'customTheme'), JSON.stringify(customThemeColors));
        }
    }, [theme, density, customThemeColors, activeProfile, profileLoaded]);

    useEffect(() => {
        if (printMode === 'none') {
            document.body.removeAttribute('data-print-mode');
            return;
        }
        document.body.setAttribute('data-print-mode', printMode);
    }, [printMode]);

    useEffect(() => {
        if (window.electronAPI?.getAppVersion) {
            window.electronAPI.getAppVersion()
                .then(setAppVersion)
                .catch(() => setAppVersion('Desktop'));
        }
    }, []);

    useEffect(() => {
        if (!window.electronAPI?.onUpdateStatus) return;
        const unsubscribe = window.electronAPI.onUpdateStatus((payload: any) => {
            setUpdateStatus(payload || { state: 'idle' });
            if (payload?.version) setLatestVersion(payload.version);
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (updateStatus.state === 'available' || updateStatus.state === 'ready') {
            setUpdateToastVisible(true);
            const timer = setTimeout(() => setUpdateToastVisible(false), 10000);
            return () => clearTimeout(timer);
        }
        return;
    }, [updateStatus.state]);

    const handleCheckForUpdates = () => {
        window.electronAPI?.checkForUpdates?.().catch(() => undefined);
    };

    const handleDownloadUpdate = () => {
        window.electronAPI?.downloadUpdate?.().catch(() => undefined);
    };

    const handleInstallUpdate = () => {
        window.electronAPI?.installUpdate?.().catch(() => undefined);
    };

    useEffect(() => {
        const handleAfterPrint = () => setPrintMode('none');
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    useEffect(() => {
        // Apply font size
        const sizeMap: Record<FontSize, string> = { small: '90%', medium: '100%', large: '110%' };
        document.documentElement.style.fontSize = sizeMap[fontSize] || '100%';
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'fontSize'), fontSize);
    }, [fontSize, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'builderMode'), builderMode);
    }, [builderMode, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'tutorMode'), String(tutorMode));
    }, [tutorMode, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'autoSnapshot'), String(autoSnapshotOnCalculate));
    }, [autoSnapshotOnCalculate, activeProfile, profileLoaded]);

    useEffect(() => {
        // Save library to local storage on change
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'library'), JSON.stringify(library));
    }, [library, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'history'), JSON.stringify(history));
    }, [history, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'historyIndex'), String(historyIndex));
    }, [historyIndex, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'recipes'), JSON.stringify(recipes));
    }, [recipes, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'assumptions'), JSON.stringify(variableAssumptions));
    }, [variableAssumptions, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'numberFormat'), JSON.stringify(numberFormat));
    }, [numberFormat, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'reportOptions'), JSON.stringify(reportOptions));
    }, [reportOptions, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'plugins'), JSON.stringify(plugins));
    }, [plugins, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'projectVersions'), JSON.stringify(projectVersions));
    }, [projectVersions, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'exercisePacks'), JSON.stringify(exercisePacks));
    }, [exercisePacks, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'layoutSplit'), String(splitRatio));
    }, [splitRatio, activeProfile, profileLoaded]);

    useEffect(() => {
        if (!isResizing) return;
        const handleMove = (event: MouseEvent) => {
            const container = splitContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const next = (event.clientX - rect.left) / rect.width;
            const clamped = Math.min(0.75, Math.max(0.25, next));
            setSplitRatio(clamped);
        };
        const handleUp = () => setIsResizing(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const pack = exercisePacks.find(p => p.id === activePackId);
        const exercise = pack?.exercises?.[activeExerciseIndex];
        const size = exercise?.solution?.length || 0;
        setExerciseAnswer(Array.from({ length: size }, () => ''));
        setExerciseFeedback(null);
    }, [activePackId, activeExerciseIndex, exercisePacks]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if ((event.metaKey || event.ctrlKey) && key === 'k') {
                event.preventDefault();
                setCommandOpen(true);
                return;
            }
            if ((event.metaKey || event.ctrlKey) && key === 'enter') {
                event.preventDefault();
                handleCalculate();
                return;
            }
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && key === 'r') {
                event.preventDefault();
                handleReset();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCalculate, handleReset]);

    // --- Derived State & Effects ---

    const extractMatrixNames = useCallback((expr: string) => {
        return [...new Set(expr.match(/[A-Z]/g) || [])].sort();
    }, []);

    const {
        batchMode,
        setBatchMode,
        batchExpression,
        setBatchExpression,
        batchSelectedIds,
        setBatchSelectedIds,
        batchResults,
        batchRunning,
        handleRunBatch
    } = useBatchRunner({
        library,
        analysisMode,
        analysisOptions,
        extractMatrixNames,
        parseSavedMatrixToValid,
        runWorkerRequest,
        setError
    });

    const matrixNamesInExpression = useMemo(() => {
        return extractMatrixNames(expression);
    }, [expression, extractMatrixNames]);

    const filteredLibrary = useMemo(() => {
        const search = librarySearch.trim().toLowerCase();
        return library.filter(item => {
            const matchesFolder = libraryFolderFilter === 'all' || (item.folder || 'Unsorted') === libraryFolderFilter;
            if (!matchesFolder) return false;
            if (!search) return true;
            const tagMatch = item.tags?.some(tag => tag.toLowerCase().includes(search)) ?? false;
            return item.name.toLowerCase().includes(search) || (item.folder || '').toLowerCase().includes(search) || tagMatch;
        });
    }, [library, librarySearch, libraryFolderFilter]);

    const libraryFolders = useMemo(() => {
        const folders = new Set<string>();
        library.forEach(item => folders.add(item.folder || 'Unsorted'));
        return Array.from(folders.values()).sort();
    }, [library]);

    useEffect(() => {
        setMatrixDefs(prevDefs => {
            const newDefs: typeof prevDefs = {};
            const existingNames = Object.keys(prevDefs);
            const newNames = new Set(matrixNamesInExpression);

            for(const name of existingNames) {
                if (newNames.has(name)) {
                    newDefs[name] = prevDefs[name];
                }
            }
            
            for (const name of matrixNamesInExpression) {
                if (!newDefs[name]) {
                    const defaultDim = 2;
                    newDefs[name] = {
                        rows: defaultDim,
                        cols: defaultDim,
                        matrix: defaultMatrix(defaultDim, defaultDim),
                        key: nextKey()
                    };
                }
            }
            return newDefs;
        });
    }, [matrixNamesInExpression]);

    useEffect(() => {
        if (['identity', 'permutation', 'jordan', 'hilbert', 'spd'].includes(presetType)) {
            setPresetCols(presetRows);
        }
    }, [presetType, presetRows]);
    
    // Sync expression and builder nodes with a small debounce to reduce churn
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedExpression(expression), 150);
        return () => clearTimeout(timer);
    }, [expression]);

    useEffect(() => {
        if (builderMode !== 'visual') return;
        const nodes = expressionToBuilderNodes(expression);
        if (nodes.length > 0 || expression.trim() === '') {
            setBuilderNodes(nodes);
        }
    }, [builderMode]);

    useEffect(() => {
        if (builderMode !== 'text') return;
        const newNodes = expressionToBuilderNodes(debouncedExpression);
        if (newNodes.length === 0 && debouncedExpression.trim() !== '') {
            return;
        }
        setBuilderNodes(newNodes);
    }, [debouncedExpression, builderMode]);

    useEffect(() => {
        if (builderMode !== 'visual') return;
        if (builderNodes.length === 0) return;
        const newExpression = builderNodesToExpression(builderNodes);
        if (newExpression !== expression) {
            const timer = setTimeout(() => setExpression(newExpression.toUpperCase()), 150);
            return () => clearTimeout(timer);
        }
    }, [builderNodes, expression, builderMode]);


    const numRows = typeof rows === 'number' && rows > 0 ? rows : 1;
    const numCols = typeof cols === 'number' && cols > 0 ? cols : 1;

    const totalCols = useMemo(() => {
        const baseCols = typeof cols === 'number' && cols > 0 ? cols : 1;
        return systemType === 'non-homogeneous' ? baseCols + 1 : baseCols;
    }, [cols, systemType]);

    useEffect(() => {
        setSolverMatrix(prevMatrix => {
            const currentRows = prevMatrix.length;
            const currentCols = prevMatrix.length > 0 ? prevMatrix[0].length : 0;
            const targetRows = typeof rows === 'number' && rows > 0 ? rows : 1;
            const baseCols = typeof cols === 'number' && cols > 0 ? cols : 1;
            const targetCols = systemType === 'non-homogeneous' ? baseCols + 1 : baseCols;

            if (currentRows === targetRows && currentCols === targetCols) {
                return prevMatrix;
            }

            const newMatrix = defaultMatrix(targetRows, targetCols);
            for (let r = 0; r < Math.min(targetRows, currentRows); r++) {
                for (let c = 0; c < Math.min(targetCols, currentCols); c++) {
                    newMatrix[r][c] = prevMatrix[r][c];
                }
            }
            return newMatrix;
        });
    }, [rows, cols, systemType]);

    useEffect(() => {
        setAnalysisMatrix(prevMatrix => {
            const currentRows = prevMatrix.length;
            const currentCols = prevMatrix.length > 0 ? prevMatrix[0].length : 0;
            const targetRows = typeof analysisRows === 'number' && analysisRows > 0 ? analysisRows : 1;
            const targetCols = typeof analysisCols === 'number' && analysisCols > 0 ? analysisCols : 1;

            if (currentRows === targetRows && currentCols === targetCols) {
                return prevMatrix;
            }

            const newMatrix = defaultMatrix(targetRows, targetCols);
            for (let r = 0; r < Math.min(targetRows, currentRows); r++) {
                for (let c = 0; c < Math.min(targetCols, currentCols); c++) {
                    newMatrix[r][c] = prevMatrix[r][c];
                }
            }
            return newMatrix;
        });
    }, [analysisRows, analysisCols]);
    
    useEffect(() => {
        if (results && 'conditions' in results && Array.isArray(results.conditions) && results.conditions.length > 0) {
             setOpenSections(prev => ({ ...prev, "Assumptions Made During Calculation": true }));
        }
    }, [results]);

    const matrixHasNull = (matrix: Matrix) => {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === null) return true;
            }
        }
        return false;
    };

    function parseSavedMatrix(saved: SavedMatrix): Matrix {
        return saved.matrix.map(row => row.map(cell => (cell ? parseInput(cell) : null)));
    }

    function parseSavedMatrixToValid(saved: SavedMatrix): ValidMatrix {
        const matrix = parseSavedMatrix(saved);
        if (matrixHasNull(matrix)) {
            throw new Error(`Matrix ${saved.name} contains empty cells.`);
        }
        return matrix as ValidMatrix;
    }

    const generatePracticeSystem = (size: number) => {
        const toSF = (value: number) => parseInput(String(value));
        const randInt = () => {
            const val = Math.floor(Math.random() * 9) - 4;
            return val === 0 ? 1 : val;
        };
        let matrix: ValidMatrix = [];
        let solution: number[] = [];
        let bVector: number[] = [];

        while (true) {
            matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => toSF(randInt())));
            const rank = calculateRank(matrix);
            if (rank === size) {
                solution = Array.from({ length: size }, () => randInt());
                bVector = matrix.map(row => row.reduce((sum, cell, idx) => sum + (symbolicFractionToNumber(cell) || 0) * solution[idx], 0));
                break;
            }
        }

        const bMatrix: ValidMatrix = bVector.map(value => [toSF(value)]);
        setPracticeMatrix(matrix);
        setPracticeB(bMatrix);
        setPracticeSolution(solution);
        setPracticeGuess(Array.from({ length: size }, () => ''));
        setPracticeFeedback(null);
    };

    const handleCheckPractice = () => {
        if (!practiceSolution.length) return;
        try {
            const parsed = practiceGuess.map(val => symbolicFractionToNumber(parseInput(val.trim() || '0')));
            if (parsed.some(v => v === null)) {
                setPracticeFeedback('All entries must be numeric.');
                return;
            }
            const matches = parsed.every((v, idx) => Math.abs((v || 0) - practiceSolution[idx]) < 1e-9);
            setPracticeFeedback(matches ? 'Correct! Nice work.' : 'Not quite—check your arithmetic and try again.');
        } catch (e) {
            setPracticeFeedback(e instanceof Error ? e.message : 'Invalid input.');
        }
    };

    const handleLoadPracticeToSolver = () => {
        if (!practiceMatrix || !practiceB) return;
        const size = practiceMatrix.length;
        const augmented: Matrix = practiceMatrix.map((row, r) => [...row, practiceB[r][0]]);
        setSystemType('non-homogeneous');
        setRows(size);
        setCols(size);
        setSolverMatrix(augmented);
        bumpSolverMatrixKey();
        setPracticeFeedback('Loaded into System Solver.');
    };

    const handleSimplify = () => {
        try {
            const sf = parseInput(simplifyInput);
            const { result, steps } = simplifySymbolicFractionWithTrace(sf);
            setSimplifyOutput(formatSymbolicFractionToLatex(result));
            setSimplifyTrace(steps);
        } catch (e) {
            setSimplifyOutput('Error');
            setSimplifyTrace([]);
            setError(e instanceof Error ? e.message : 'Failed to simplify.');
        }
    };

    const handleComputeMatrixFunction = () => {
        try {
            const matrix = resolveMatrixByKey(matrixFuncTarget);
            if (!matrix) throw new Error('Select a matrix.');
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            let result: number[][];
            if (matrixFuncType === 'exp') result = numericMatrixExp(numeric);
            else if (matrixFuncType === 'log') result = numericMatrixLog(numeric);
            else result = numericMatrixSqrt(numeric);
            setMatrixFuncResult(result);
            setMatrixFuncError(null);
        } catch (e) {
            setMatrixFuncResult(null);
            setMatrixFuncError(e instanceof Error ? e.message : 'Failed to compute matrix function.');
        }
    };

    const handleComputeJordan = () => {
        try {
            const matrix = resolveMatrixByKey(jordanTarget);
            if (!matrix) throw new Error('Select a matrix.');
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            const result = numericJordanForm(numeric);
            setJordanResult(result);
        } catch (e) {
            setJordanResult(null);
            setError(e instanceof Error ? e.message : 'Failed to compute Jordan form.');
        }
    };

    const applyPreconditioner = (A: number[][], b: number[]) => {
        if (iterativePrecond === 'none') return { A, b };
        if (iterativePrecond === 'jacobi') {
            const diag = A.map((row, i) => row[i] || 1);
            const A2 = A.map((row, i) => row.map(v => v / diag[i]));
            const b2 = b.map((v, i) => v / diag[i]);
            return { A: A2, b: b2 };
        }
        // Simple ILU0 approximation via LU
        const { L, U } = numericLU(A);
        const solveLower = (y: number[]) => {
            const x = Array(y.length).fill(0);
            for (let i = 0; i < y.length; i++) {
                let sum = y[i];
                for (let j = 0; j < i; j++) sum -= L[i][j] * x[j];
                x[i] = sum / (L[i][i] || 1);
            }
            return x;
        };
        const solveUpper = (y: number[]) => {
            const x = Array(y.length).fill(0);
            for (let i = y.length - 1; i >= 0; i--) {
                let sum = y[i];
                for (let j = i + 1; j < y.length; j++) sum -= U[i][j] * x[j];
                x[i] = sum / (U[i][i] || 1);
            }
            return x;
        };
        const applyMInv = (vec: number[]) => solveUpper(solveLower(vec));
        const A2 = A.map(row => applyMInv(row));
        const b2 = applyMInv(b);
        return { A: A2, b: b2 };
    };

    const handleRunIterative = () => {
        try {
            const matrix = resolveMatrixByKey(iterativeTarget);
            if (!matrix) throw new Error('Select a matrix.');
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            let b: number[] = [];
            if (systemType === 'non-homogeneous' && iterativeTarget === 'solver') {
                const cols = numeric[0]?.length || 0;
                b = numeric.map(row => row[cols - 1]);
            } else {
                b = numeric.map(() => 1);
            }
            const { A, b: b2 } = applyPreconditioner(numeric, b);
            let result;
            if (iterativeMethod === 'jacobi') result = numericJacobi(A, b2, iterativeTol, iterativeMaxIter);
            else if (iterativeMethod === 'gs') result = numericGaussSeidel(A, b2, iterativeTol, iterativeMaxIter);
            else if (iterativeMethod === 'cg') result = numericConjugateGradient(A, b2, iterativeTol, iterativeMaxIter);
            else result = numericGMRES(A, b2, iterativeTol, iterativeMaxIter);
            setIterativeResult(result);
            setIterativeError(null);
        } catch (e) {
            setIterativeResult(null);
            setIterativeError(e instanceof Error ? e.message : 'Iterative solver failed.');
        }
    };

    const handleImportExercisePack = async (file: File) => {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.id || !Array.isArray(parsed.exercises)) {
            throw new Error('Invalid exercise pack.');
        }
        setExercisePacks(prev => [...prev.filter(p => p.id !== parsed.id), parsed]);
        setActivePackId(parsed.id);
        setActiveExerciseIndex(0);
        setExerciseAnswer([]);
        setExerciseFeedback(null);
    };

    const handleCheckExercise = () => {
        const pack = exercisePacks.find(p => p.id === activePackId);
        if (!pack) return;
        const exercise = pack.exercises[activeExerciseIndex];
        if (!exercise) return;
        const target = exercise.solution || [];
        const parsed = exerciseAnswer.map(val => {
            try { return symbolicFractionToNumber(parseInput(val.trim() || '0')) || 0; } catch { return NaN; }
        });
        if (parsed.some(v => !Number.isFinite(v))) {
            setExerciseFeedback('Invalid answer format.');
            return;
        }
        const correct = parsed.every((v, i) => Math.abs(v - target[i]) < 1e-6);
        setExerciseFeedback(correct ? 'Correct!' : 'Incorrect. Try again.');
    };

    const handleImportPlugin = async (file: File) => {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.id || !Array.isArray(parsed.commands)) {
            throw new Error('Invalid plugin format.');
        }
        setPlugins(prev => [...prev.filter(p => p.id !== parsed.id), parsed]);
    };

    const handleSaveVersion = () => {
        const trimmed = versionName.trim();
        if (!trimmed) return;
        const state = buildSharedState();
        const entry = { id: `ver_${Date.now()}`, name: trimmed, createdAt: Date.now(), state };
        setProjectVersions(prev => [entry, ...prev]);
        setVersionName('');
    };

    const handleRestoreVersion = (id: string) => {
        const entry = projectVersions.find(v => v.id === id);
        if (!entry) return;
        handleReset();
        applySharedState(entry.state);
    };

    const formatUpdateStatus = (status: { state: string; percent?: number; message?: string; version?: string }) => {
        switch (status.state) {
            case 'checking':
                return 'Checking for updates...';
            case 'available':
                return status.version ? `Update available (${status.version})` : 'Update available';
            case 'downloading':
                return typeof status.percent === 'number' ? `Downloading ${status.percent.toFixed(0)}%` : 'Downloading update...';
            case 'ready':
                return 'Update ready — restart to apply';
            case 'up-to-date':
                return 'Up to date';
            case 'error':
                return status.message || 'Update error';
            default:
                return 'Idle';
        }
    };

    const handleCompareSteps = async (file: File) => {
        if (!results || !('gaussJordanSteps' in results)) {
            setStepCompareResult('No solver steps available.');
            return;
        }
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.steps)) {
            setStepCompareResult('Invalid steps file.');
            return;
        }
        const solverSteps = (results as CalculationResult).gaussJordanSteps || [];
        const mismatches: number[] = [];
        parsed.steps.forEach((step: any, idx: number) => {
            const expected = solverSteps[idx]?.matrix;
            if (!expected) return;
            const same = JSON.stringify(expected) === JSON.stringify(step.matrix);
            if (!same) mismatches.push(idx + 1);
        });
        setStepCompareResult(mismatches.length === 0 ? 'All steps match!' : `Mismatched steps: ${mismatches.join(', ')}`);
    };

    const buildBlockMatrix = (tl: Matrix, tr: Matrix, bl: Matrix, br: Matrix): Matrix => {
        if (matrixHasNull(tl) || matrixHasNull(tr) || matrixHasNull(bl) || matrixHasNull(br)) {
            throw new Error('All block matrices must be fully filled.');
        }
        const topRows = tl.length;
        const bottomRows = bl.length;
        const leftCols = tl[0]?.length || 0;
        const rightCols = tr[0]?.length || 0;
        if (topRows !== tr.length) throw new Error('Top blocks must have the same number of rows.');
        if (bottomRows !== br.length) throw new Error('Bottom blocks must have the same number of rows.');
        if (leftCols !== bl[0]?.length) throw new Error('Left blocks must have the same number of columns.');
        if (rightCols !== br[0]?.length) throw new Error('Right blocks must have the same number of columns.');
        const result: Matrix = [];
        for (let r = 0; r < topRows; r++) {
            result.push([...tl[r], ...tr[r]]);
        }
        for (let r = 0; r < bottomRows; r++) {
            result.push([...bl[r], ...br[r]]);
        }
        return result;
    };

    const handleApplyBlockMatrix = () => {
        try {
            const tl = resolveMatrixByKey(blockKeys.tl);
            const tr = resolveMatrixByKey(blockKeys.tr);
            const bl = resolveMatrixByKey(blockKeys.bl);
            const br = resolveMatrixByKey(blockKeys.br);
            if (!tl || !tr || !bl || !br) throw new Error('Select all four blocks.');
            const matrix = buildBlockMatrix(tl, tr, bl, br);
            applyMatrixToTarget(matrix, blockTarget);
            setBlockOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to build block matrix.');
        }
    };

    const serializeMatrixToString = (matrix: Matrix): string => {
        return matrix.map(row => row.map(cell => stringifySymbolicFraction(cell)).join(',')).join('\n');
    };

    const buildDetailCacheKey = (matrix: Matrix, systemType: SystemType) => {
        return `${systemType}|${serializeMatrixToString(matrix)}`;
    };

    const parseMatrixFromString = (matrixStr: string, numRows: number, numCols: number): Matrix => {
        const newMatrix = defaultMatrix(numRows, numCols);
        const rowsData = matrixStr.split('\n');
        for (let r = 0; r < Math.min(numRows, rowsData.length); r++) {
            const colsData = rowsData[r].split(',');
            for (let c = 0; c < Math.min(numCols, colsData.length); c++) {
                const val = colsData[c];
                if (val) {
                    try {
                        newMatrix[r][c] = parseInput(val);
                    } catch (e) { console.warn(`Failed to parse cell [${r},${c}] with value \"${val}\"`, e); }
                }
            }
        }
        return newMatrix;
    };

    const buildSharedState = (): SharedState => {
        const serializableDefs: SharedState['matrixDefs'] = {};
        for (const name in matrixDefs) {
            const def = matrixDefs[name];
            serializableDefs[name] = {
                rows: def.rows,
                cols: def.cols,
                matrix: serializeMatrixToString(def.matrix)
            };
        }

        return {
            appMode,
            systemType,
            rows,
            cols,
            solverMatrix: serializeMatrixToString(solverMatrix),
            expression,
            matrixDefs: serializableDefs,
            analysisRows,
            analysisCols,
            analysisMatrix: serializeMatrixToString(analysisMatrix),
            analysisMode,
            analysisOptions,
            numberFormat,
            variableAssumptions
        };
    };

    const applySharedState = (state: SharedState) => {
        if (!state) return;
        setAppMode(state.appMode || 'systemSolver');
        const loadedSystemType = state.systemType || 'homogeneous';
        setSystemType(loadedSystemType);
        const loadedRows = state.rows ?? 3;
        const loadedCols = state.cols ?? 3;
        setRows(loadedRows);
        setCols(loadedCols);
        if (state.solverMatrix) {
            const numRows = typeof loadedRows === 'number' ? loadedRows : 3;
            const baseCols = typeof loadedCols === 'number' ? loadedCols : 3;
            const totalCols = loadedSystemType === 'non-homogeneous' ? baseCols + 1 : baseCols;
            setSolverMatrix(parseMatrixFromString(state.solverMatrix, numRows, totalCols));
            bumpSolverMatrixKey();
        }

        if (state.expression) setExpression(state.expression);
        if (state.matrixDefs) {
            const parsedDefs: typeof matrixDefs = {};
            for (const name in state.matrixDefs) {
                const def = state.matrixDefs[name];
                const numRows = Number(def.rows);
                const numCols = Number(def.cols);
                if (!isNaN(numRows) && !isNaN(numCols) && numRows > 0 && numCols > 0) {
                    parsedDefs[name] = {
                        rows: def.rows,
                        cols: def.cols,
                        matrix: parseMatrixFromString(def.matrix, numRows, numCols),
                        key: nextKey()
                    };
                }
            }
            setMatrixDefs(parsedDefs);
        }

        if (state.analysisRows !== undefined) setAnalysisRows(state.analysisRows);
        if (state.analysisCols !== undefined) setAnalysisCols(state.analysisCols);
        if (state.analysisMatrix) {
            const numRows = typeof state.analysisRows === 'number' ? state.analysisRows : 3;
            const numCols = typeof state.analysisCols === 'number' ? state.analysisCols : 3;
            setAnalysisMatrix(parseMatrixFromString(state.analysisMatrix, numRows, numCols));
            bumpAnalysisMatrixKey();
        }
        if (state.analysisMode) setAnalysisMode(state.analysisMode);
        if (state.analysisOptions) setAnalysisOptions(state.analysisOptions);
        if (state.numberFormat) setNumberFormat({ ...defaultNumberFormat, ...state.numberFormat });
        if (state.variableAssumptions) setVariableAssumptions(state.variableAssumptions);
    };

    const persistProfiles = (nextProfiles: WorkspaceProfile[]) => {
        setProfiles(nextProfiles);
        localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(nextProfiles));
    };

    const handleSwitchProfile = (profileId: string) => {
        setActiveProfile(profileId);
        localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
        loadProfile(profileId);
    };

    const handleCreateProfile = () => {
        const name = newProfileName.trim();
        if (!name) {
            setError('Profile name cannot be empty.');
            return;
        }
        const id = `profile_${Date.now()}`;
        const nextProfiles = [...profiles, { id, name }];
        persistProfiles(nextProfiles);
        setNewProfileName('');
        handleSwitchProfile(id);
    };

    const handleDeleteProfile = (profileId: string) => {
        if (profiles.length <= 1) {
            setError('At least one profile must remain.');
            return;
        }
        const nextProfiles = profiles.filter(p => p.id !== profileId);
        persistProfiles(nextProfiles);
        if (activeProfile === profileId) {
            const fallback = nextProfiles[0]?.id || 'default';
            handleSwitchProfile(fallback);
        }
    };

    const createSnapshot = (name?: string) => {
        const trimmedName = name?.trim() || `Snapshot ${new Date().toLocaleString()}`;
        const snapshot: HistorySnapshot = {
            id: `h_${Date.now()}`,
            name: trimmedName,
            createdAt: Date.now(),
            state: buildSharedState()
        };
        setHistory(prev => {
            const next = [...prev.slice(0, historyIndex + 1), snapshot];
            setHistoryIndex(next.length - 1);
            return next;
        });
        setSnapshotName('');
    };

    const applySnapshotAtIndex = (index: number) => {
        const snapshot = history[index];
        if (!snapshot) return;
        setHistoryIndex(index);
        setResults(null);
        setError(null);
        applySharedState(snapshot.state);
    };

    const handleUndoSnapshot = () => {
        if (historyIndex <= 0) return;
        applySnapshotAtIndex(historyIndex - 1);
    };

    const handleRedoSnapshot = () => {
        if (historyIndex >= history.length - 1) return;
        applySnapshotAtIndex(historyIndex + 1);
    };

    const deleteSnapshot = (id: string) => {
        setHistory(prev => {
            const indexToRemove = prev.findIndex(s => s.id === id);
            if (indexToRemove === -1) return prev;
            const next = prev.filter(s => s.id !== id);
            if (next.length === 0) {
                setHistoryIndex(-1);
            } else if (historyIndex >= indexToRemove) {
                setHistoryIndex(Math.max(0, historyIndex - 1));
            }
            return next;
        });
    };

    const getSnapshotCacheSummary = (snapshot: HistorySnapshot) => {
        if (!snapshot.state?.solverMatrix) return null;
        const system = snapshot.state.systemType || 'homogeneous';
        const rows = typeof snapshot.state.rows === 'number' ? snapshot.state.rows : 3;
        const baseCols = typeof snapshot.state.cols === 'number' ? snapshot.state.cols : 3;
        const totalCols = system === 'non-homogeneous' ? baseCols + 1 : baseCols;
        const matrix = parseMatrixFromString(snapshot.state.solverMatrix, rows, totalCols);
        const cacheKey = buildDetailCacheKey(matrix, system);
        return detailCacheRef.current.get(cacheKey) || null;
    };

    const getResultMatrix = (): ValidMatrix | null => {
        if (!results) return null;
        if ('finalResult' in results) return results.finalResult;
        if ('operationResult' in results) return results.operationResult.finalResult;
        return null;
    };

    const resolveMatrixByKey = (key: string): Matrix | null => {
        if (key === 'solver') return solverMatrix;
        if (key === 'analysis') return analysisMatrix;
        if (key === 'result') return getResultMatrix();
        if (matrixDefs[key]) return matrixDefs[key].matrix;
        return null;
    };

    const getMatrixOptions = (): { key: string; label: string }[] => {
        const options: { key: string; label: string }[] = [
            { key: 'solver', label: 'System Solver Matrix' },
            { key: 'analysis', label: 'Analysis Matrix' }
        ];
        Object.keys(matrixDefs).forEach(name => {
            options.push({ key: name, label: `Matrix ${name}` });
        });
        if (getResultMatrix()) options.push({ key: 'result', label: 'Last Result Matrix' });
        return options;
    };

    const buildDiffMap = (left: Matrix, right: Matrix): boolean[][] => {
        const rows = Math.max(left.length, right.length);
        const cols = Math.max(left[0]?.length || 0, right[0]?.length || 0);
        const diff: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const l = left[r]?.[c];
                const d = right[r]?.[c];
                if (!l || !d) {
                    diff[r][c] = true;
                } else {
                    diff[r][c] = !areSFEqual(l, d);
                }
            }
        }
        return diff;
    };

    const renderMatrixPreview = (matrix: Matrix, diff?: boolean[][]) => {
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        return (
            <div className="overflow-x-auto">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {matrix.map((row, r) => row.map((cell, c) => {
                        const isDiff = diff?.[r]?.[c];
                        return (
                            <div key={`${r}-${c}`} className={`px-2 py-1 text-xs rounded border ${isDiff ? 'bg-red-100 border-red-300 text-red-800' : 'glass-input text-ink'}`}>
                                {stringifySymbolicFraction(cell)}
                            </div>
                        );
                    }))}
                </div>
            </div>
        );
    };

    const isZeroCell = (cell: SymbolicFraction | null, eps = 0) => {
        if (!cell) return true;
        if (isZeroSF(cell)) return true;
        const numeric = symbolicFractionToNumber(cell);
        if (numeric !== null) return Math.abs(numeric) <= eps;
        return false;
    };

    const buildSparseCSR = (matrix: Matrix, eps: number) => {
        const values: string[] = [];
        const colIndex: number[] = [];
        const rowPtr: number[] = [0];
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < (matrix[r]?.length || 0); c++) {
                const cell = matrix[r][c];
                if (!isZeroCell(cell, eps)) {
                    values.push(stringifySymbolicFraction(cell));
                    colIndex.push(c);
                }
            }
            rowPtr.push(values.length);
        }
        return { values, colIndex, rowPtr };
    };

    const buildSparseCSC = (matrix: Matrix, eps: number) => {
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        const values: string[] = [];
        const rowIndex: number[] = [];
        const colPtr: number[] = [0];
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const cell = matrix[r]?.[c];
                if (!isZeroCell(cell, eps)) {
                    values.push(stringifySymbolicFraction(cell));
                    rowIndex.push(r);
                }
            }
            colPtr.push(values.length);
        }
        return { values, rowIndex, colPtr };
    };

    const renderSparsityHeatmap = (matrix: Matrix, eps: number) => {
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        const numericValues: number[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = matrix[r]?.[c];
                if (isZeroCell(cell, eps)) {
                    numericValues.push(0);
                } else {
                    const num = cell ? symbolicFractionToNumber(cell) : null;
                    numericValues.push(num !== null ? Math.abs(num) : 1);
                }
            }
        }
        const maxVal = Math.max(...numericValues, 1);
        return (
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {numericValues.map((val, idx) => {
                    const intensity = val === 0 ? 0 : Math.min(1, val / maxVal);
                    const color = val === 0 ? 'rgba(148, 163, 184, 0.25)' : `rgba(14, 116, 144, ${0.2 + 0.6 * intensity})`;
                    return (
                        <div key={idx} className="h-6 w-6 rounded" style={{ backgroundColor: color }} />
                    );
                })}
            </div>
        );
    };

    const generatePresetMatrix = (preset: typeof presetType, rows: number, cols: number, eigenValue = 1): Matrix => {
        if (['identity', 'permutation', 'jordan', 'hilbert', 'spd'].includes(preset) && rows !== cols) {
            throw new Error('Selected preset requires a square matrix.');
        }
        const n = rows;
        const m = defaultMatrix(rows, cols);

        const setValue = (r: number, c: number, value: string) => {
            m[r][c] = parseInput(value);
        };

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                setValue(r, c, '0');
            }
        }

        if (preset === 'identity') {
            for (let i = 0; i < n; i++) setValue(i, i, '1');
            return m;
        }

        if (preset === 'permutation') {
            const perm = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
            for (let r = 0; r < n; r++) setValue(r, perm[r], '1');
            return m;
        }

        if (preset === 'jordan') {
            for (let i = 0; i < n; i++) {
                setValue(i, i, eigenValue.toString());
                if (i < n - 1) setValue(i, i + 1, '1');
            }
            return m;
        }

        if (preset === 'hilbert') {
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    setValue(r, c, `1/${r + c + 1}`);
                }
            }
            return m;
        }

        if (preset === 'spd') {
            const rand = () => Math.floor(Math.random() * 3);
            const a: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, rand));
            const at: number[][] = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => a[c][r]));
            const b: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) sum += at[r][k] * a[k][c];
                    b[r][c] = sum + (r === c ? n : 0);
                }
            }
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    setValue(r, c, b[r][c].toString());
                }
            }
            return m;
        }

        return m;
    };

    const downloadFile = (filename: string, content: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const buildMatrixLatex = (key: string) => {
        const matrix = resolveMatrixByKey(key);
        if (!matrix) throw new Error("Matrix not found.");
        if (matrixHasNull(matrix)) throw new Error("Fill all cells in the selected matrix before exporting.");
        try {
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            return formatNumericMatrixToLatex(numeric, numberFormat);
        } catch {
            return formatMatrixToLatex(matrix as ValidMatrix);
        }
    };

    const exportMatrixAsCsv = (key: string) => {
        const matrix = resolveMatrixByKey(key);
        if (!matrix) throw new Error("Matrix not found.");
        if (matrixHasNull(matrix)) throw new Error("Fill all cells in the selected matrix before exporting.");
        let csv = '';
        try {
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            csv = formatNumericMatrixToCsv(numeric, numberFormat);
        } catch {
            csv = matrix.map(row => row.map(cell => stringifySymbolicFraction(cell)).join(',')).join('\n');
        }
        downloadFile(`matrix-${key}.csv`, csv, 'text/csv');
    };

    const exportMatrixAsLatex = (key: string) => {
        const latex = buildMatrixLatex(key);
        downloadFile(`matrix-${key}.tex`, latex, 'text/plain');
    };

    const copyMatrixLatex = async (key: string) => {
        const latex = buildMatrixLatex(key);
        await navigator.clipboard.writeText(latex);
    };

    const copyMatrixToClipboard = async () => {
        const matrix = resolveMatrixByKey(clipboardTarget);
        if (!matrix) throw new Error("Matrix not found.");
        if (matrixHasNull(matrix)) throw new Error("Fill all cells in the selected matrix before copying.");

        let payload = '';
        if (clipboardFormat === 'csv') {
            try {
                const numeric = toNumericMatrix(matrix as ValidMatrix);
                payload = formatNumericMatrixToCsv(numeric, numberFormat);
            } catch {
                payload = matrix.map(row => row.map(cell => stringifySymbolicFraction(cell)).join(',')).join('\n');
            }
        } else if (clipboardFormat === 'latex') {
            payload = buildMatrixLatex(clipboardTarget);
        } else {
            payload = JSON.stringify(matrix.map(row => row.map(cell => stringifySymbolicFraction(cell))));
        }

        await navigator.clipboard.writeText(payload);
    };

    const exportStateAsJson = (asShareFile: boolean) => {
        const payload = {
            version: 2,
            state: buildSharedState(),
            library,
            recipes,
            assumptions: variableAssumptions,
            history,
            settings: {
                theme,
                density,
                fontSize,
                customThemeColors,
                builderMode,
                tutorMode,
                autoSnapshotOnCalculate,
                numberFormat,
                reportOptions
            }
        };
        const json = JSON.stringify(payload, null, 2);
        const filename = asShareFile ? 'matrix-master-share.mmatrix' : 'matrix-master-state.json';
        downloadFile(filename, json, 'application/json');
    };

    const applyMatrixToTarget = (matrix: Matrix, target: string) => {
        const numRows = matrix.length;
        const numCols = matrix[0]?.length || 0;
        if (target === 'solver') {
            setRows(numRows);
            if (systemType === 'non-homogeneous') {
                setCols(numCols > 1 ? numCols - 1 : 1);
            } else {
                setCols(numCols);
            }
            setSolverMatrix(matrix);
            bumpSolverMatrixKey();
            return;
        }
        if (target === 'analysis') {
            setAnalysisRows(numRows);
            setAnalysisCols(numCols);
            setAnalysisMatrix(matrix);
            bumpAnalysisMatrixKey();
            return;
        }
        if (matrixDefs[target]) {
            setMatrixDefs(prev => ({
                ...prev,
                [target]: {
                    rows: numRows,
                    cols: numCols,
                    matrix,
                    key: nextKey()
                }
            }));
            return;
        }
        throw new Error("Invalid import target.");
    };

    const handleImportFile = async (file: File) => {
        const text = await file.text();
        const isCsv = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv');
        const isLatex = file.name.toLowerCase().endsWith('.tex') || text.includes('\\begin{bmatrix}') || text.includes('\\begin{array}');
        if (isCsv) {
            const rowsData = text.trim().split(/\r?\n/).filter(Boolean);
            const parsed = rowsData.map(row => row.split(/[\t,]/));
            const numRows = parsed.length;
            const numCols = Math.max(...parsed.map(row => row.length));
            const newMatrix = defaultMatrix(numRows || 1, numCols || 1);
            for (let r = 0; r < numRows; r++) {
                for (let c = 0; c < numCols; c++) {
                    const value = parsed[r][c]?.trim();
                    if (value) newMatrix[r][c] = parseInput(value);
                }
            }
            applyMatrixToTarget(newMatrix, importMatrixKey);
            return;
        }
        if (isLatex) {
            const cleaned = text
                .replace(/\\left|\\right/g, '')
                .replace(/\\begin\\{[^}]+\\}/g, '')
                .replace(/\\end\\{[^}]+\\}/g, '')
                .replace(/\$/g, '')
                .trim();
            const rowStrings = cleaned.split(/\\\\/).map(row => row.trim()).filter(Boolean);
            const parsedRows = rowStrings.map(row => row.split('&').map(cell => cell.trim()));
            const numRows = parsedRows.length;
            const numCols = Math.max(...parsedRows.map(row => row.length));
            const newMatrix = defaultMatrix(numRows || 1, numCols || 1);
            for (let r = 0; r < numRows; r++) {
                for (let c = 0; c < numCols; c++) {
                    const value = parsedRows[r][c];
                    if (value) newMatrix[r][c] = parseInput(value);
                }
            }
            applyMatrixToTarget(newMatrix, importMatrixKey);
            return;
        }

        try {
            const parsed = JSON.parse(text);
            if (parsed?.state) {
                handleReset();
                applySharedState(parsed.state as SharedState);
                if (Array.isArray(parsed.library)) setLibrary(parsed.library);
                if (Array.isArray(parsed.recipes)) setRecipes(parsed.recipes);
                if (Array.isArray(parsed.assumptions)) setVariableAssumptions(parsed.assumptions);
                if (Array.isArray(parsed.history)) setHistory(parsed.history);
                if (parsed.settings) {
                    if (parsed.settings.theme) setTheme(parsed.settings.theme);
                    if (parsed.settings.density) setDensity(parsed.settings.density);
                    if (parsed.settings.fontSize) setFontSize(parsed.settings.fontSize);
                    if (parsed.settings.customThemeColors) setCustomThemeColors(parsed.settings.customThemeColors);
                    if (parsed.settings.builderMode) setBuilderMode(parsed.settings.builderMode);
                    if (parsed.settings.tutorMode !== undefined) setTutorMode(!!parsed.settings.tutorMode);
                    if (parsed.settings.autoSnapshotOnCalculate !== undefined) setAutoSnapshotOnCalculate(!!parsed.settings.autoSnapshotOnCalculate);
                    if (parsed.settings.numberFormat) setNumberFormat({ ...defaultNumberFormat, ...parsed.settings.numberFormat });
                    if (parsed.settings.reportOptions) setReportOptions({ ...defaultReportOptions, ...parsed.settings.reportOptions });
                }
            } else if (parsed?.appMode) {
                handleReset();
                applySharedState(parsed as SharedState);
            } else {
                throw new Error("Unrecognized JSON format.");
            }
        } catch (err) {
            throw new Error("Failed to import file. Ensure the file is a valid Matrix Master export.");
        }
    };

    const handleModeChange = (mode: AppMode) => {
        setAppMode(mode);
        handleReset();
    };

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // --- System Solver Handlers ---
    const handleClearMatrix = () => {
        const targetRows = typeof rows === 'number' && rows > 0 ? rows : 1;
        setSolverMatrix(defaultMatrix(targetRows, totalCols));
        bumpSolverMatrixKey();
    };
    
    const handleRawMatrixChange = useCallback((newMatrix: Matrix) => {
        setSolverMatrix(newMatrix);
    }, []);

    const handleRandomizeSolverMatrix = () => {
        const targetRows = typeof rows === 'number' && rows > 0 ? rows : 1;
        const newMatrix = Array(targetRows).fill(null).map(() => 
            Array(totalCols).fill(null).map(() => parseInput(String(Math.floor(Math.random() * 19) - 9)))
        );
        setSolverMatrix(newMatrix);
        bumpSolverMatrixKey();
    };

    // --- Matrix Ops Handlers ---
    const updateMatrixDef = (name: string, newDim: { rows?: number | ''; cols?: number | '' }) => {
        setMatrixDefs(prev => {
            const current = prev[name];
            const safeCurrent = current || { rows: 2, cols: 2, matrix: defaultMatrix(2,2), key: nextKey() };
            const newRowsState = newDim.rows !== undefined ? newDim.rows : safeCurrent.rows;
            const newColsState = newDim.cols !== undefined ? newDim.cols : safeCurrent.cols;
            const numRows = typeof newRowsState === 'number' && newRowsState > 0 ? newRowsState : 1;
            const numCols = typeof newColsState === 'number' && newColsState > 0 ? newColsState : 1;
            const oldMatrix = safeCurrent.matrix;
            const oldNumRows = oldMatrix.length;
            const oldNumCols = oldMatrix.length > 0 ? oldMatrix[0].length : 0;
            let newMatrix = oldMatrix;
            if (numRows !== oldNumRows || numCols !== oldNumCols) {
                const resizedMatrix = defaultMatrix(numRows, numCols);
                for (let r = 0; r < Math.min(numRows, oldNumRows); r++) {
                    for (let c = 0; c < Math.min(numCols, oldNumCols); c++) {
                        resizedMatrix[r][c] = oldMatrix[r][c];
                    }
                }
                newMatrix = resizedMatrix;
            }
            return { ...prev, [name]: { ...safeCurrent, rows: newRowsState, cols: newColsState, matrix: newMatrix } };
        });
    };

    const handleOpsMatrixChange = useCallback((name: string, matrix: Matrix) => {
        setMatrixDefs(prev => ({ ...prev, [name]: { ...prev[name], matrix } }));
    }, []);

    const handleRandomizeOpsMatrix = (name: string) => {
        const def = matrixDefs[name];
        if (!def) return;
        const numRows = typeof def.rows === 'number' && def.rows > 0 ? def.rows : 1;
        const numCols = typeof def.cols === 'number' && def.cols > 0 ? def.cols : 1;
        const newMatrix = Array(numRows).fill(null).map(() => 
            Array(numCols).fill(null).map(() => parseInput(String(Math.floor(Math.random() * 19) - 9)))
        );
        setMatrixDefs(prev => ({ ...prev, [name]: { ...prev[name], matrix: newMatrix, key: nextKey() } }));
    };

    // --- Analysis Handlers ---
    const handleAnalysisMatrixChange = useCallback((newMatrix: Matrix) => {
        setAnalysisMatrix(newMatrix);
    }, []);

    const handleRandomizeAnalysisMatrix = () => {
        const targetRows = typeof analysisRows === 'number' && analysisRows > 0 ? analysisRows : 1;
        const targetCols = typeof analysisCols === 'number' && analysisCols > 0 ? analysisCols : 1;
        const newMatrix = Array(targetRows).fill(null).map(() =>
            Array(targetCols).fill(null).map(() => parseInput(String(Math.floor(Math.random() * 19) - 9)))
        );
        setAnalysisMatrix(newMatrix);
        bumpAnalysisMatrixKey();
    };

    const handleClearAnalysisMatrix = () => {
        const targetRows = typeof analysisRows === 'number' && analysisRows > 0 ? analysisRows : 1;
        const targetCols = typeof analysisCols === 'number' && analysisCols > 0 ? analysisCols : 1;
        setAnalysisMatrix(defaultMatrix(targetRows, targetCols));
        bumpAnalysisMatrixKey();
    };

    const handleLoadAnalysisFromMatrix = (matrix: ValidMatrix) => {
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;
        setAnalysisRows(rows);
        setAnalysisCols(cols);
        setAnalysisMatrix(matrix);
        bumpAnalysisMatrixKey();
    };

    const handleApplyPreset = () => {
        try {
            const targetRows = Math.max(1, presetRows);
            const targetCols = Math.max(1, presetCols);
            const matrix = generatePresetMatrix(presetType, targetRows, targetCols, presetJordanEigen);
            applyMatrixToTarget(matrix, presetTarget);
            setPresetsOpen(false);
        } catch (e) {
            if (e instanceof Error) setError(e.message);
            else setError('Failed to apply preset.');
        }
    };

    const handleSaveRecipe = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Recipe name cannot be empty.');
            return;
        }
        const recipe: MatrixRecipe = {
            id: `recipe_${Date.now()}`,
            name: trimmed,
            expression,
            builderNodes,
            createdAt: Date.now()
        };
        setRecipes(prev => [...prev, recipe]);
    };

    const handleApplyRecipe = (recipe: MatrixRecipe) => {
        setExpression(recipe.expression);
        setBuilderNodes(recipe.builderNodes);
        setBuilderMode('visual');
        setRecipesOpen(false);
    };

    const handleDeleteRecipe = (id: string) => {
        setRecipes(prev => prev.filter(r => r.id !== id));
    };

    const handleAddAssumption = () => {
        const variable = assumptionVar.trim();
        if (!variable) {
            setError('Variable name is required.');
            return;
        }
        const next = [...variableAssumptions, { variable, constraint: assumptionConstraint }];
        setVariableAssumptions(next);
        setAssumptionVar('');
    };

    const handleRemoveAssumption = (index: number) => {
        setVariableAssumptions(prev => prev.filter((_, i) => i !== index));
    };

    const exportBatchReport = () => {
        const payload = {
            generatedAt: new Date().toISOString(),
            mode: batchMode,
            expression: batchMode === 'expression' ? batchExpression : undefined,
            analysisMode,
            options: analysisOptions,
            results: batchResults
        };
        downloadFile('batch-report.json', JSON.stringify(payload, null, 2), 'application/json');
    };

    const buildStepsBundle = () => {
        if (!results) {
            setError('No results to export.');
            return null;
        }

        const sections: { title: string; blocks: string[] }[] = [];
        const addSection = (title: string, blocks: string[]) => {
            if (blocks.length > 0) sections.push({ title, blocks });
        };
        const escapeTexText = (input: string) => input.replace(/[&%$#_{}]/g, (m) => `\\${m}`);
        const formatOpLatex = (op: string) => {
            const looksLikeLatex = /[\\_^{}]/.test(op);
            return looksLikeLatex ? op : `\\text{${escapeTexText(op)}}`;
        };

        if (results && 'systemType' in results) {
            const systemResult = results as CalculationResult;
            const formatter = (m: ValidMatrix) => systemResult.systemType === 'non-homogeneous' ? formatAugmentedMatrixToLatex(m, systemResult.systemType) : formatMatrixToLatex(m);
            const steps = systemResult.gaussJordanSteps.map(step => {
                const op = step.operation || 'Step';
                const matrix = step.matrix ? formatter(step.matrix) : '';
                return matrix ? `${formatOpLatex(op)}\\\\${matrix}` : formatOpLatex(op);
            });
            addSection('System Solver Steps', steps);
            if (systemResult.determinant) addSection('Determinant', [`\\det(A) = ${formatSymbolicFractionToLatex(systemResult.determinant.value)}`]);
            if (systemResult.inverse?.inverseMatrix) addSection('Inverse', [`A^{-1} = ${formatMatrixToLatex(systemResult.inverse.inverseMatrix)}`]);
        } else if ('finalResult' in results) {
            const opsResult = results as MatrixOperationsResult;
            const steps = opsResult.steps.map(step => `${formatOpLatex(step.operation)}\\\\${formatMatrixToLatex(step.result)}`);
            addSection('Matrix Operation Steps', steps);
        } else if ('operationResult' in results) {
            const detOps = results as DeterminantOfOperationResult;
            const steps = detOps.operationResult.steps.map(step => `${formatOpLatex(step.operation)}\\\\${formatMatrixToLatex(step.result)}`);
            addSection('Operation Steps', steps);
            addSection('Determinant', [`\\det(A) = ${formatSymbolicFractionToLatex(detOps.determinant.value)}`]);
        } else if ('kind' in results && results.kind === 'analysis') {
            const analysis = results as MatrixAnalysisResult;
            const blocks = [`\\text{Rank: } ${analysis.rank}`];
            if (analysis.trace !== undefined) {
                const traceLatex = analysis.mode === 'numeric' ? formatNumberToLatex(analysis.trace, numberFormat) : formatSymbolicFractionToLatex(analysis.trace);
                blocks.push(`\\operatorname{tr}(A) = ${traceLatex}`);
            }
            addSection('Analysis Summary', blocks);
        }

        const md = sections.map(section => `## ${section.title}\n\n${section.blocks.map(block => `$$${block}$$`).join('\n\n')}`).join('\n\n');
        const texBody = sections.map(section => `\\section*{${section.title}}\n${section.blocks.map(block => `\\[\n${block}\n\\]`).join('\n\n')}`).join('\n\n');
        const texDoc = `\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage[margin=1in]{geometry}\n\\begin{document}\n${texBody}\n\\end{document}\n`;
        const latexBlock = sections
            .map(section => `% ${section.title}\n${section.blocks.map(block => `\\[\n${block}\n\\]`).join('\n\n')}`)
            .join('\n\n');

        return { md, texDoc, latexBlock };
    };

    const exportStepsBundle = () => {
        const bundle = buildStepsBundle();
        if (!bundle) return;
        downloadFile('matrix-steps.md', bundle.md, 'text/markdown');
        downloadFile('matrix-steps.tex', bundle.texDoc, 'text/plain');
    };

    const exportStepsLatexFile = () => {
        const bundle = buildStepsBundle();
        if (!bundle) return;
        downloadFile('matrix-steps.tex', bundle.texDoc, 'text/plain');
    };

    const copyStepsLatex = async () => {
        const bundle = buildStepsBundle();
        if (!bundle) return;
        await navigator.clipboard.writeText(bundle.latexBlock);
    };

    // --- Universal Handlers ---
    const handleShare = () => {
        setShareOpen(true);
    };

    async function handleCalculate() {
        setResultsKey(prev => prev + 1);
        setError(null);
        setIsLoading(true);
        setResults(null);
        setOpenSections({});
        try {
            if (autoSnapshotOnCalculate) {
                createSnapshot(`Auto ${new Date().toLocaleString()}`);
            }
            if (appMode === 'systemSolver') {
                if (!solverMatrix) throw new Error("Please create a matrix first.");
                if (matrixHasNull(solverMatrix)) throw new Error("Please fill in all matrix cells.");
                const validMatrix = solverMatrix as ValidMatrix;
                setOriginalMatrix(validMatrix);
                const result = await runWorkerRequest('systemSolver', { matrix: validMatrix, systemType }, 'calculate');
                startTransition(() => setResults(result as AnyResult));
            } else if (appMode === 'analysis') {
                if (!analysisMatrix) throw new Error("Please create a matrix first.");
                if (matrixHasNull(analysisMatrix)) throw new Error("Please fill in all matrix cells.");
                const validMatrix = analysisMatrix as ValidMatrix;
                const result = await runWorkerRequest('analysis', { matrix: validMatrix, analysisMode, analysisOptions }, 'calculate');
                startTransition(() => setResults(result as AnyResult));
            } else {
                const matrices = new Map<string, ValidMatrix>();
                for (const name in matrixDefs) {
                    if (!matrixNamesInExpression.includes(name)) continue;
                    const def = matrixDefs[name];
                    if (matrixHasNull(def.matrix)) throw new Error(`Please fill all cells for Matrix ${name}.`);
                    matrices.set(name, def.matrix as ValidMatrix);
                }
                if (matrices.size !== matrixNamesInExpression.length) {
                    throw new Error("One or more matrices in the expression are not defined.");
                }
                const entries = Array.from(matrices.entries());
                if (appMode === 'matrixOperations') {
                    const result = await runWorkerRequest('matrixOperations', { expression, matrices: entries }, 'calculate');
                    startTransition(() => setResults(result as AnyResult));
                } else if (appMode === 'determinantOfOperation') {
                    const result = await runWorkerRequest('determinantOfOperation', { expression, matrices: entries }, 'calculate');
                    startTransition(() => setResults(result as AnyResult));
                }
            }
        } catch (e) {
            if (e instanceof Error) setError(e.message);
            else setError("An unknown error occurred during calculation.");
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleRequestDetails = async (section: string, payload?: any) => {
        setError(null);
        setLoadingDetails(section);
        try {
            if (!results) throw new Error("Cannot request details without initial results.");

            let originalInputs: any;
            if (appMode === 'systemSolver') {
                if (!originalMatrix) throw new Error("Original matrix not found for detail calculation.");
                const cacheKey = buildDetailCacheKey(originalMatrix, systemType);
                const cached = detailCacheRef.current.get(cacheKey);
                if (cached && (section === 'Determinant' || section === 'Matrix Inverse')) {
                    const updated = { ...(results as CalculationResult) } as CalculationResult;
                    if (section === 'Determinant' && cached.determinant) {
                        updated.determinant = cached.determinant;
                        startTransition(() => setResults(updated));
                        setOpenSections(prev => ({ ...prev, [section]: true }));
                        setLoadingDetails(null);
                        return;
                    }
                    if (section === 'Matrix Inverse' && cached.inverse) {
                        updated.inverse = cached.inverse;
                        startTransition(() => setResults(updated));
                        setOpenSections(prev => ({ ...prev, [section]: true }));
                        setLoadingDetails(null);
                        return;
                    }
                }
                originalInputs = { matrix: originalMatrix, systemType, bVector: payload };
            } else {
                const matrices = new Map<string, ValidMatrix>();
                for (const name in matrixDefs) {
                    if (matrixNamesInExpression.includes(name)) {
                        matrices.set(name, matrixDefs[name].matrix as ValidMatrix);
                    }
                }
                originalInputs = { expression, matrices };
            }

            const newResults = await runWorkerRequest('details', {
                section,
                appMode,
                results,
                originalInputs
            }, 'details');
            if (appMode === 'systemSolver' && originalMatrix) {
                const cacheKey = buildDetailCacheKey(originalMatrix, systemType);
                const entry = detailCacheRef.current.get(cacheKey) || {};
                if (section === 'Determinant' && (newResults as CalculationResult).determinant) {
                    entry.determinant = (newResults as CalculationResult).determinant as DeterminantResult;
                }
                if (section === 'Matrix Inverse' && (newResults as CalculationResult).inverse) {
                    entry.inverse = (newResults as CalculationResult).inverse as InverseResult;
                }
                detailCacheRef.current.set(cacheKey, entry);
            }
            startTransition(() => setResults(newResults as AnyResult));
            setOpenSections(prev => ({ ...prev, [section]: true }));
        } catch (e) {
            if (e instanceof Error) setError(e.message);
            else setError(`An unknown error occurred while calculating details for ${section}.`);
        } finally {
            setLoadingDetails(null);
        }
    };
    
    function handleReset() {
        setResultsKey(prev => prev + 1);
        setResults(null); setError(null);
        setRows(3); setCols(3); setSystemType('homogeneous');
        const newSolverMatrix = defaultMatrix(3, 3);
        setSolverMatrix(newSolverMatrix); bumpSolverMatrixKey();
        setOriginalMatrix(null);
        setExpression('A * B');
        setMatrixDefs({
            'A': { rows: 2, cols: 2, matrix: defaultMatrix(2, 2), key: nextKey() },
            'B': { rows: 2, cols: 2, matrix: defaultMatrix(2, 2), key: nextKey() }
        });
        setAnalysisRows(3);
        setAnalysisCols(3);
        setAnalysisMatrix(defaultMatrix(3, 3));
        bumpAnalysisMatrixKey();
        setAnalysisMode('numeric');
        setAnalysisOptions({
            computeLU: true,
            computeQR: true,
            computeSVD: true,
            computeEigen: true
        });
        setOpenSections({});
    }

    const handleRequestExplanation = (topic: string) => {
        const content = EXPLANATIONS[topic] || "An explanation for this topic is not available at the moment.";
        setExplainerState({ isOpen: true, topic, content });
    };
    
    // --- Library and Workflow Handlers ---
    const handleOpenSaveModal = (matrix: Matrix, rows: number | '', cols: number | '') => {
        const numRows = typeof rows === 'number' ? rows : 0;
        const numCols = typeof cols === 'number' ? cols : 0;
        setMatrixToSave({ matrix, rows: numRows, cols: numCols });
        setSaveModalOpen(true);
    };

    const handleSaveToLibrary = (name: string, folder: string, tagsInput: string) => {
        if (!name.trim() || !matrixToSave) return;
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const newSavedMatrix: SavedMatrix = {
            id: `m_${Date.now()}`,
            name,
            matrix: matrixToSave.matrix.map(row => row.map(cell => stringifySymbolicFraction(cell))),
            rows: matrixToSave.rows,
            cols: matrixToSave.cols,
            tags: tags.length > 0 ? tags : undefined,
            folder: folder.trim() || undefined,
            createdAt: Date.now()
        };
        setLibrary(prev => [...prev, newSavedMatrix]);
        setSaveModalOpen(false);
        setMatrixToSave(null);
    };

    const handleDeleteFromLibrary = (id: string) => {
        setLibrary(prev => prev.filter(item => item.id !== id));
    };

    const handleLoadFromLibrary = (savedMatrix: SavedMatrix) => {
        const parsedMatrix = savedMatrix.matrix.map(row => row.map(cell => cell === null ? null : parseInput(cell)));
        if (loadTarget === 'solver') {
            setRows(savedMatrix.rows);
            if (systemType === 'non-homogeneous') {
                if (savedMatrix.cols > 1) setCols(savedMatrix.cols - 1);
                else setCols(1);
            } else {
                setCols(savedMatrix.cols);
            }
            setSolverMatrix(parsedMatrix);
            bumpSolverMatrixKey();
        } else if (loadTarget === 'analysis') {
            setAnalysisRows(savedMatrix.rows);
            setAnalysisCols(savedMatrix.cols);
            setAnalysisMatrix(parsedMatrix);
            bumpAnalysisMatrixKey();
        } else {
            setMatrixDefs(prev => ({
                ...prev,
                [loadTarget]: {
                    rows: savedMatrix.rows,
                    cols: savedMatrix.cols,
                    matrix: parsedMatrix,
                    key: nextKey()
                }
            }));
        }
        setLoadModalOpen(false);
    };

    const handleUseResult = (matrix: ValidMatrix) => {
        setUseResultModal({ open: true, matrix });
    };


    const handleSetMatrixFromUsedResult = (target: 'solver' | 'analysis' | string) => {
        if (!useResultModal.matrix) return;
        const resultMatrix = useResultModal.matrix;
        const resultRows = resultMatrix.length;
        const resultCols = resultMatrix[0]?.length || 0;

        if (target === 'solver') {
            setAppMode('systemSolver');
            setRows(resultRows);
            setSystemType('homogeneous'); // Default to homogeneous
            setCols(resultCols);
            setSolverMatrix(resultMatrix);
            bumpSolverMatrixKey();
        } else if (target === 'analysis') {
            setAppMode('analysis');
            setAnalysisRows(resultRows);
            setAnalysisCols(resultCols);
            setAnalysisMatrix(resultMatrix);
            bumpAnalysisMatrixKey();
        } else {
            setAppMode('matrixOperations');
            if (!matrixNamesInExpression.includes(target)) {
                setExpression(prev => `${prev} * ${target}`);
            }
            setMatrixDefs(prev => ({
                ...prev,
                [target]: {
                    rows: resultRows,
                    cols: resultCols,
                    matrix: resultMatrix,
                    key: nextKey()
                }
            }));
        }
        setUseResultModal({ open: false, matrix: null });
    };

    // --- Render Logic ---
    const renderExplanationContent = (content: string) => {
        if (!content) return null;
    
        const parseInlineFormatting = (text: string, keyPrefix: string): React.ReactNode[] => {
            const elements: React.ReactNode[] = [];
            let remaining = text;
            let i = 0;
    
            while (remaining.length > 0) {
                const match = remaining.match(/(\$(.*?)\$|\*\*(.*?)\*\*)/);
    
                if (!match || match.index === undefined) {
                    elements.push(<span key={`${keyPrefix}-${i++}`}>{remaining}</span>);
                    break;
                }
                
                const before = remaining.substring(0, match.index);
                if (before) {
                    elements.push(<span key={`${keyPrefix}-${i++}`}>{before}</span>);
                }
    
                const isLatex = match[0].startsWith('$');
                const content = isLatex ? match[2] : match[3];
    
                if (content === undefined) {
                     elements.push(<span key={`${keyPrefix}-${i++}`}>{match[0]}</span>);
                     remaining = remaining.substring(match.index + match[0].length);
                     continue;
                }
    
                if (isLatex) {
                    elements.push(<LatexRenderer key={`${keyPrefix}-${i++}`} latex={content} displayMode={false} />);
                } else {
                    elements.push(<strong key={`${keyPrefix}-${i++}`} className="font-semibold" style={{ color: 'var(--primary-text-color)' }}>{content}</strong>);
                }
    
                remaining = remaining.substring(match.index + match[0].length);
            }
            return elements;
        };
    
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let currentList: { type: 'ol' | 'ul'; items: React.ReactNode[] } | null = null;
        
        const flushList = () => {
            if (currentList) {
                const ListComponent = currentList.type;
                elements.push(
                    <ListComponent key={`list-${elements.length}`} className={`${ListComponent === 'ul' ? 'list-disc' : 'list-decimal'} list-inside space-y-2 pl-4`}>
                        {currentList.items}
                    </ListComponent>
                );
                currentList = null;
            }
        };
        
        lines.forEach((line, index) => {
            const olMatch = line.match(/^(\s*)(\d+)\.\s(.*)/);
            const ulMatch = line.match(/^(\s*)([-*])\s(.*)/);
            
            if (olMatch) {
                if (!currentList || currentList.type !== 'ol') {
                    flushList();
                    currentList = { type: 'ol', items: [] };
                }
                const indent = olMatch[1].length;
                const content = olMatch[3];
                currentList.items.push(<li key={index} style={{ marginLeft: `${indent * 0.5}rem` }}>{parseInlineFormatting(content, `li-${index}`)}</li>);
            } else if (ulMatch) {
                if (!currentList || currentList.type !== 'ul') {
                    flushList();
                    currentList = { type: 'ul', items: [] };
                }
                const indent = ulMatch[1].length;
                const content = ulMatch[3];
                currentList.items.push(<li key={index} style={{ marginLeft: `${indent * 0.5}rem` }}>{parseInlineFormatting(content, `li-${index}`)}</li>);
            } else if (line.trim() === '') {
                flushList();
                // Add a visual break for paragraph separation
                if (elements.length > 0 && !(elements[elements.length - 1] as any)?.type?.endsWith('List')) {
                     elements.push(<div key={`break-${index}`} className="h-4" />);
                }
            } else {
                flushList();
                elements.push(<p key={index}>{parseInlineFormatting(line, `p-${index}`)}</p>);
            }
        });
        
        flushList();
        
        return elements.length > 0 ? elements : null;
    };
    
    const renderSystemSolverSetup = () => (
        <>
            <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>System Type</h2>
                    <InfoButton infoKey="systemSolver" />
                </div>
                <div className="flex glass-panel rounded-2xl p-1 max-w-md mx-auto">
                    <button onClick={() => setSystemType('homogeneous')} className={`flex-1 py-2 rounded-xl transition-colors text-sm font-medium glass-tab ${systemType === 'homogeneous' ? 'tab active' : ''}`}>Homogeneous (Ax = 0)</button>
                    <button onClick={() => setSystemType('non-homogeneous')} className={`flex-1 py-2 rounded-xl transition-colors text-sm font-medium glass-tab ${systemType === 'non-homogeneous' ? 'tab active' : ''}`}>Non-Homogeneous (Ax = b)</button>
                </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end justify-center mb-6">
                <div>
                    <label htmlFor="sys-rows" className="block text-sm text-center font-medium text-secondary mb-1">Rows (m)</label>
                    <input id="sys-rows" type="number" value={rows} onChange={(e) => { const val = e.target.value; setRows(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (rows === '') setRows(1); }} className="w-24 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                    <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => setRows(prev => typeof prev === 'number' ? prev + 1 : 1)} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Row</button>
                        <button onClick={() => setRows(prev => Math.max(1, typeof prev === 'number' ? prev - 1 : 1))} className="text-xs px-2 py-1 rounded-lg glass-btn">- Row</button>
                    </div>
                </div>
                <div>
                    <label htmlFor="sys-cols" className="block text-sm text-center font-medium text-secondary mb-1">{systemType === 'homogeneous' ? 'Cols (n)' : 'Coeff. Cols (n)'}</label>
                    <input id="sys-cols" type="number" value={cols} onChange={(e) => { const val = e.target.value; setCols(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (cols === '') setCols(1); }} className="w-24 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                    <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => setCols(prev => typeof prev === 'number' ? prev + 1 : 1)} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Col</button>
                        <button onClick={() => setCols(prev => Math.max(1, typeof prev === 'number' ? prev - 1 : 1))} className="text-xs px-2 py-1 rounded-lg glass-btn">- Col</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRandomizeSolverMatrix} className="glass-btn font-bold py-2 px-4 rounded-lg">Randomize</button>
                    <button style={{ backgroundColor: 'var(--button-bg)' }} onClick={handleClearMatrix} className="hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Clear</button>
                </div>
            </div>
            {solverMatrix && (
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>{systemType === 'homogeneous' ? 'Enter Matrix A' : 'Enter Augmented Matrix [A | b]'}</h2>
                        <InfoButton infoKey="matrixInput" />
                    </div>
                    <p className="text-sm text-secondary mb-4 max-w-lg mx-auto">You can use integers (5), fractions (2/3), and symbolic constants (a, k, 5b-3).</p>
                    <MatrixInput key={solverMatrixKey} rows={numRows} cols={totalCols} matrix={solverMatrix} systemType={systemType} onMatrixChange={handleRawMatrixChange} onSave={() => handleOpenSaveModal(solverMatrix, numRows, totalCols)} onLoad={() => { setLoadTarget('solver'); setLoadModalOpen(true); }} />
                </div>
            )}
        </>
    );

    const renderMatrixOpsSetup = () => (
        <>
            <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>Matrix Expression</h2>
                    <InfoButton infoKey="matrixOperations" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="flex glass-panel rounded-2xl p-1 w-full max-w-sm">
                         <button onClick={() => setBuilderMode('text')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${builderMode === 'text' ? 'tab active' : ''}`}>Text</button>
                         <button onClick={() => setBuilderMode('visual')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${builderMode === 'visual' ? 'tab active' : ''}`}>Visual</button>
                    </div>
                </div>
            </div>

            {builderMode === 'text' ? (
                <div className="text-center">
                    <div className="overflow-x-auto glass-panel rounded-2xl p-1">
                        <input type="text" value={expression} onChange={e => setExpression(e.target.value.toUpperCase())} className="block w-full glass-input px-3 py-2 text-ink focus:outline-none font-mono text-lg min-w-max" placeholder="e.g. A^2 * B - C"/>
                    </div>
                    <p className="text-sm text-secondary mt-2">Use capital letters for matrix names. Supported operators: +, -, *, ^. Use parentheses for grouping.</p>
                </div>
            ) : (
                <OperationBuilder 
                    nodes={builderNodes}
                    onNodesChange={setBuilderNodes}
                    matrixDefs={matrixDefs}
                    setExpression={setExpression}
                />
            )}

            <div className="space-y-6 mt-6">
                {matrixNamesInExpression.map(name => {
                    const def = matrixDefs[name];
                    if (!def) return null;
                    const numDefRows = typeof def.rows === 'number' && def.rows > 0 ? def.rows : 1;
                    const numDefCols = typeof def.cols === 'number' && def.cols > 0 ? def.cols : 1;
                    return (
                        <div key={name} className="p-4 glass-panel rounded-2xl">
                            <div className="flex flex-wrap gap-x-6 gap-y-3 items-end mb-4">
                                <div className="flex items-center gap-2 mr-auto">
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text-color)' }}>Matrix {name}</h3>
                                    <InfoButton infoKey="matrixInput" />
                                </div>
                                <div>
                                    <label htmlFor={`rows-${name}`} className="block text-sm text-center font-medium text-secondary mb-1">Rows</label>
                                    <input id={`rows-${name}`} type="number" value={def.rows} onChange={(e) => { const v = e.target.value; updateMatrixDef(name, { rows: v === '' ? '' : Math.max(1, parseInt(v) || 1) }); }} onBlur={() => { if (def.rows === '') updateMatrixDef(name, { rows: 1 }); }} className="w-20 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                                    <div className="flex justify-center gap-2 mt-2">
                                        <button onClick={() => updateMatrixDef(name, { rows: Math.max(1, (typeof def.rows === 'number' ? def.rows : 1) + 1) })} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Row</button>
                                        <button onClick={() => updateMatrixDef(name, { rows: Math.max(1, (typeof def.rows === 'number' ? def.rows : 1) - 1) })} className="text-xs px-2 py-1 rounded-lg glass-btn">- Row</button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor={`cols-${name}`} className="block text-sm text-center font-medium text-secondary mb-1">Cols</label>
                                    <input id={`cols-${name}`} type="number" value={def.cols} onChange={(e) => { const v = e.target.value; updateMatrixDef(name, { cols: v === '' ? '' : Math.max(1, parseInt(v) || 1) }); }} onBlur={() => { if (def.cols === '') updateMatrixDef(name, { cols: 1 }); }} className="w-20 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                                    <div className="flex justify-center gap-2 mt-2">
                                        <button onClick={() => updateMatrixDef(name, { cols: Math.max(1, (typeof def.cols === 'number' ? def.cols : 1) + 1) })} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Col</button>
                                        <button onClick={() => updateMatrixDef(name, { cols: Math.max(1, (typeof def.cols === 'number' ? def.cols : 1) - 1) })} className="text-xs px-2 py-1 rounded-lg glass-btn">- Col</button>
                                    </div>
                                </div>
                                <button onClick={() => handleRandomizeOpsMatrix(name)} className="glass-btn font-bold py-2 px-4 rounded-lg">Randomize</button>
                            </div>
                            <MatrixInput key={def.key} rows={numDefRows} cols={numDefCols} matrix={def.matrix} systemType="homogeneous" onMatrixChange={(m) => handleOpsMatrixChange(name, m)} onSave={() => handleOpenSaveModal(def.matrix, def.rows, def.cols)} onLoad={() => { setLoadTarget(name); setLoadModalOpen(true); }}/>
                        </div>
                    );
                })}
            </div>
        </>
    );

    const renderAnalysisSetup = () => (
        <>
            <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>Matrix Analysis</h2>
                    <InfoButton infoKey="analysis" />
                </div>
                <div className="flex glass-panel rounded-2xl p-1 max-w-sm mx-auto">
                    <button onClick={() => setAnalysisMode('exact')} className={`flex-1 py-2 rounded-xl transition-colors text-sm font-medium glass-tab ${analysisMode === 'exact' ? 'tab active' : ''}`}>Exact</button>
                    <button onClick={() => setAnalysisMode('numeric')} className={`flex-1 py-2 rounded-xl transition-colors text-sm font-medium glass-tab ${analysisMode === 'numeric' ? 'tab active' : ''}`}>Numeric</button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-secondary">
                    <span>Exact vs Numeric</span>
                    <InfoButton infoKey="analysisModes" className="w-4 h-4 text-[10px]" />
                </div>
                {analysisMode === 'exact' && (
                    <p className="text-sm text-secondary mt-2">Exact mode computes rank and trace only. Numeric mode unlocks LU, QR, SVD, and eigen analysis.</p>
                )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end justify-center mb-6">
                <div>
                    <label htmlFor="analysis-rows" className="block text-sm text-center font-medium text-secondary mb-1">Rows (m)</label>
                    <input id="analysis-rows" type="number" value={analysisRows} onChange={(e) => { const val = e.target.value; setAnalysisRows(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (analysisRows === '') setAnalysisRows(1); }} className="w-24 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                    <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => setAnalysisRows(prev => typeof prev === 'number' ? prev + 1 : 1)} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Row</button>
                        <button onClick={() => setAnalysisRows(prev => Math.max(1, typeof prev === 'number' ? prev - 1 : 1))} className="text-xs px-2 py-1 rounded-lg glass-btn">- Row</button>
                    </div>
                </div>
                <div>
                    <label htmlFor="analysis-cols" className="block text-sm text-center font-medium text-secondary mb-1">Cols (n)</label>
                    <input id="analysis-cols" type="number" value={analysisCols} onChange={(e) => { const val = e.target.value; setAnalysisCols(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (analysisCols === '') setAnalysisCols(1); }} className="w-24 glass-input rounded-md px-3 py-2 focus:outline-none" min="1"/>
                    <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => setAnalysisCols(prev => typeof prev === 'number' ? prev + 1 : 1)} className="text-xs px-2 py-1 rounded-lg glass-btn">+ Col</button>
                        <button onClick={() => setAnalysisCols(prev => Math.max(1, typeof prev === 'number' ? prev - 1 : 1))} className="text-xs px-2 py-1 rounded-lg glass-btn">- Col</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRandomizeAnalysisMatrix} className="glass-btn font-bold py-2 px-4 rounded-lg">Randomize</button>
                    <button style={{ backgroundColor: 'var(--button-bg)' }} onClick={handleClearAnalysisMatrix} className="hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Clear</button>
                </div>
                <div className="min-w-[220px]">
                    <label htmlFor="analysis-source" className="block text-sm text-center font-medium text-secondary mb-1">Load From</label>
                    <select
                        id="analysis-source"
                        value={analysisSource}
                        onChange={(e) => {
                            const value = e.target.value;
                            setAnalysisSource(value);
                            if (value === 'custom') return;
                            if (value === 'solver') {
                                if (!matrixHasNull(solverMatrix)) handleLoadAnalysisFromMatrix(solverMatrix as ValidMatrix);
                                else setError("System solver matrix has empty cells.");
                            } else if (matrixDefs[value]) {
                                if (!matrixHasNull(matrixDefs[value].matrix)) handleLoadAnalysisFromMatrix(matrixDefs[value].matrix as ValidMatrix);
                                else setError(`Matrix ${value} has empty cells.`);
                            }
                        }}
                        className="w-full glass-input rounded-md px-3 py-2 focus:outline-none"
                    >
                        <option value="custom">Custom Matrix</option>
                        <option value="solver">System Solver Matrix</option>
                        {Object.keys(matrixDefs).map(name => (
                            <option key={name} value={name}>Matrix {name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {analysisMode === 'numeric' && (
                <div className="mb-6 max-w-xl mx-auto">
                    <div className="flex items-center justify-center gap-2 text-sm text-secondary mb-2">
                        <span>Decomposition Options</span>
                        <InfoButton infoKey="decompositions" className="w-4 h-4 text-[10px]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={analysisOptions.computeLU} onChange={(e) => setAnalysisOptions(prev => ({ ...prev, computeLU: e.target.checked }))} />
                        LU decomposition (P, L, U)
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={analysisOptions.computeQR} onChange={(e) => setAnalysisOptions(prev => ({ ...prev, computeQR: e.target.checked }))} />
                        QR decomposition (Q, R)
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={analysisOptions.computeSVD} onChange={(e) => setAnalysisOptions(prev => ({ ...prev, computeSVD: e.target.checked }))} />
                        SVD (U, S, Vᵀ)
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={analysisOptions.computeEigen} onChange={(e) => setAnalysisOptions(prev => ({ ...prev, computeEigen: e.target.checked }))} />
                        Eigenvalues / Eigenvectors
                    </label>
                </div>
                </div>
            )}

            <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>Analysis Matrix</h2>
                    <InfoButton infoKey="matrixInput" />
                </div>
                <p className="text-sm text-secondary mb-4 max-w-lg mx-auto">Use integers, fractions, or symbolic constants. Numeric mode requires all entries to be numeric constants.</p>
                <MatrixInput key={analysisMatrixKey} rows={typeof analysisRows === 'number' && analysisRows > 0 ? analysisRows : 1} cols={typeof analysisCols === 'number' && analysisCols > 0 ? analysisCols : 1} matrix={analysisMatrix} systemType="homogeneous" onMatrixChange={handleAnalysisMatrixChange} onSave={() => handleOpenSaveModal(analysisMatrix, analysisRows, analysisCols)} onLoad={() => { setLoadTarget('analysis'); setLoadModalOpen(true); }} />
            </div>
        </>
    );

    const renderBatchReport = () => {
        if (batchResults.length === 0) return null;
        return (
            <div className="print-only report-root report-batch">
                <div className="report-cover page-break">
                    <h1>Batch Report</h1>
                    <p>{new Date().toLocaleString()}</p>
                    <p className="report-subtitle">{batchMode === 'analysis' ? 'Matrix Analysis' : 'Matrix Operations'}</p>
                </div>
                <div className="report-body">
                    {batchResults.map(item => (
                        <section key={item.id} className="report-section">
                            <h2 className="report-section-title">{item.name}</h2>
                            {item.error && <p>Error: {item.error}</p>}
                            {item.result && 'kind' in item.result && item.result.kind === 'analysis' && (
                                <div>
                                    <p>Rank: {item.result.rank}</p>
                                    {item.result.trace !== undefined && (
                                        <LatexRenderer latex={`\\operatorname{tr}(A) = ${typeof item.result.trace === 'number' ? formatNumberToLatex(item.result.trace, numberFormat) : ''}`} displayMode={false} />
                                    )}
                                </div>
                            )}
                            {item.result && 'finalResult' in item.result && (
                                <LatexRenderer latex={formatMatrixToLatex(item.result.finalResult)} />
                            )}
                            {item.result && 'operationResult' in item.result && (
                                <LatexRenderer latex={formatMatrixToLatex(item.result.operationResult.finalResult)} />
                            )}
                        </section>
                    ))}
                </div>
            </div>
        );
    };

    const commands = [
        { id: 'calculate', label: appMode === 'analysis' ? 'Analyze' : 'Calculate', action: handleCalculate },
        { id: 'reset', label: 'Reset Workspace', action: handleReset },
        { id: 'history', label: 'Open History', action: () => setHistoryOpen(true) },
        { id: 'settings', label: 'Open Settings', action: () => setSettingsOpen(true) },
        { id: 'tools', label: 'Open Tools', action: () => setToolsOpen(true) },
        { id: 'export', label: 'Export / Import', action: () => setExportModalOpen(true) },
        { id: 'report', label: 'Open Report', action: () => setReportOpen(true) },
        { id: 'docs', label: 'Open Documentation', action: () => setDocsOpen(true) },
        { id: 'mode-system', label: 'Switch to System Solver', action: () => handleModeChange('systemSolver') },
        { id: 'mode-ops', label: 'Switch to Matrix Operations', action: () => handleModeChange('matrixOperations') },
        { id: 'mode-det', label: 'Switch to Determinant of Operation', action: () => handleModeChange('determinantOfOperation') },
        { id: 'mode-analysis', label: 'Switch to Analysis', action: () => handleModeChange('analysis') },
        { id: 'tutor-on', label: 'Tutor Mode On', action: () => setTutorMode(true) },
        { id: 'tutor-off', label: 'Tutor Mode Off', action: () => setTutorMode(false) }
    ];
    const pluginCommands = plugins.flatMap(plugin => (plugin.commands || []).map((cmd: any) => {
        const action = () => {
            if (cmd.action?.type === 'setExpression') {
                setExpression(String(cmd.action.value || '').toUpperCase());
                setBuilderMode('text');
            } else if (cmd.action?.type === 'setMode') {
                handleModeChange(cmd.action.value as AppMode);
            } else if (cmd.action?.type === 'openTool') {
                const target = cmd.action.value;
                if (target === 'practice') setPracticeOpen(true);
                if (target === 'functions') setMatrixFunctionsOpen(true);
                if (target === 'iterative') setIterativeOpen(true);
                if (target === 'simplifier') setSimplifierOpen(true);
                if (target === 'jordan') setJordanOpen(true);
                if (target === 'versions') setVersionsOpen(true);
                if (target === 'plugins') setPluginsOpen(true);
                if (target === 'exercises') setExerciseOpen(true);
            }
        };
        return { id: `plugin-${plugin.id}-${cmd.id}`, label: cmd.label || `${plugin.name} command`, action };
    }));
    const filteredCommands = [...commands, ...pluginCommands].filter(cmd => cmd.label.toLowerCase().includes(commandQuery.toLowerCase()));

    const inputPanel = (
        <div className="no-print">
            {appMode === 'systemSolver' ? renderSystemSolverSetup() : appMode === 'analysis' ? renderAnalysisSetup() : renderMatrixOpsSetup()}

            {(appMode === 'systemSolver' && solverMatrix) || (appMode === 'analysis' && analysisMatrix) || (appMode !== 'systemSolver' && appMode !== 'analysis' && matrixNamesInExpression.length > 0) ? (
                <div className={`grid grid-cols-1 ${appMode === 'analysis' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4 mt-6`}>
                    <button onClick={handleCalculate} disabled={isLoading} className="flex items-center justify-center glass-btn glass-btn-primary font-bold py-3 px-6 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>{isLoading ? (appMode === 'analysis' ? 'Analyzing...' : 'Calculating...') : (appMode === 'analysis' ? 'Analyze' : 'Calculate')}</button>
                    {appMode !== 'analysis' && (
                        <button onClick={handleShare} className="flex items-center justify-center glass-btn font-bold py-3 px-6 rounded-2xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>{shareButtonText}</button>
                    )}
                    <button onClick={handleReset} className="flex items-center justify-center glass-btn glass-btn-danger font-bold py-3 px-6 rounded-2xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566z" clipRule="evenodd" /></svg>Reset</button>
                </div>
            ) : null}

            {error && <div className="mt-6 p-4 bg-red-400/20 border border-red-500/30 text-red-800 rounded-lg"><p className="font-bold">Error:</p><p>{error}</p></div>}
            {isLoading && <div className="flex justify-center items-center mt-8"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div></div>}
        </div>
    );

    const resultsPanel = results ? (
        <div className="print-area">
            <ResultsDisplay key={resultsKey} results={results} appMode={appMode} originalMatrix={originalMatrix} analysisMatrix={analysisMatrix as ValidMatrix} tutorMode={tutorMode} numberFormat={numberFormat} variableAssumptions={variableAssumptions} openSections={openSections} onToggleSection={toggleSection} onRequestDetails={handleRequestDetails} onUseResult={handleUseResult} loadingDetails={loadingDetails} onExplain={handleRequestExplanation} onInfo={openInfo} />
        </div>
    ) : null;

    return (
        <div className="min-h-screen flex flex-col items-center p-4 lg:p-8 transition-colors duration-300 relative">
            <div className="aurora-bg" aria-hidden="true">
                <div className="aurora-layer layer-1" />
                <div className="aurora-layer layer-2" />
                <div className="aurora-layer layer-3" />
            </div>
            <div className="w-full max-w-7xl relative z-10">
                <header className="header-panel text-center mb-8 relative no-print glass-panel rounded-3xl px-6 py-6">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold aurora-title">Matrix Master</h1>
                    <p className="sm:text-lg text-secondary mt-2">A Comprehensive Linear Algebra Calculator</p>
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button onClick={() => setHistoryOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open history"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 00-7.938 7H1a1 1 0 000 2h3a1 1 0 001-1V7a1 1 0 10-2 0v.057A6 6 0 1110 16a1 1 0 100 2A8 8 0 1010 2z" /><path d="M10 5a1 1 0 011 1v3.382l2.447 1.224a1 1 0 11-.894 1.788l-3-1.5A1 1 0 019 11V6a1 1 0 011-1z" /></svg></button>
                        <button onClick={() => setExportModalOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Export or import"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 14a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1zM13 5V3a1 1 0 112 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0V7h-2a1 1 0 110-2h2z" /><path d="M3 6a2 2 0 012-2h3a1 1 0 110 2H5v8h10v-3a1 1 0 112 0v3a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /></svg></button>
                        <button onClick={() => setCompareModalOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Compare matrices"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 5a2 2 0 012-2h2a1 1 0 110 2H6v10h2a1 1 0 110 2H6a2 2 0 01-2-2V5z" /><path d="M16 5a2 2 0 00-2-2h-2a1 1 0 100 2h2v10h-2a1 1 0 100 2h2a2 2 0 002-2V5z" /><path d="M7 10a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg></button>
                        <button onClick={() => setReportOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Print report"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6z" /><path fillRule="evenodd" d="M4 9a2 2 0 00-2 2v3a2 2 0 002 2h2v-2H4v-3h12v3h-2v2h2a2 2 0 002-2v-3a2 2 0 00-2-2H4z" clipRule="evenodd" /><path d="M6 12h8v6H6v-6z" /></svg></button>
                        <button onClick={() => setToolsOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open tools"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046a1 1 0 00-1.2.49l-.902 1.61a6.946 6.946 0 00-1.643.95l-1.8-.6a1 1 0 00-1.182.47l-1.2 2.078a1 1 0 00.272 1.272l1.477 1.134a7.01 7.01 0 000 1.9l-1.477 1.134a1 1 0 00-.272 1.272l1.2 2.078a1 1 0 001.182.47l1.8-.6c.508.39 1.058.715 1.643.95l.902 1.61a1 1 0 001.2.49l2.4-.8a1 1 0 00.68-1.02l-.16-1.94a7.04 7.04 0 001.32-1.32l1.94.16a1 1 0 001.02-.68l.8-2.4a1 1 0 00-.49-1.2l-1.61-.902a6.946 6.946 0 00-.95-1.643l.6-1.8a1 1 0 00-.47-1.182l-2.078-1.2a1 1 0 00-1.272.272l-1.134 1.477a7.01 7.01 0 00-1.9 0L12.3 1.318a1 1 0 00-1-0.272zM10 7a3 3 0 110 6 3 3 0 010-6z" /></svg></button>
                        <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open settings"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    </div>
                </header>
                {(updateStatus.state === 'available' || updateStatus.state === 'ready') && updateToastVisible && (
                    <div className="no-print fixed top-5 right-5 z-50">
                        <div className="glass-panel rounded-xl px-4 py-3 flex items-start gap-3 border border-[var(--glass-border)] shadow-lg max-w-sm">
                            <div className="flex-1 text-sm text-secondary">
                                <div className="font-semibold text-ink">Update available</div>
                                <div>
                                    {updateStatus.state === 'ready'
                                        ? 'Update downloaded. Restart to apply.'
                                        : (latestVersion ? `Version ${latestVersion} is ready to download.` : 'A new version is ready to download.')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {updateStatus.state === 'available' && (
                                    <button onClick={handleDownloadUpdate} className="px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs">Download</button>
                                )}
                                {updateStatus.state === 'ready' && (
                                    <button onClick={handleInstallUpdate} className="px-2 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs">Restart</button>
                                )}
                                <button onClick={() => setUpdateToastVisible(false)} className="px-2 py-1 rounded-lg glass-btn text-xs">Dismiss</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="no-print mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => setCommandOpen(true)} className="ios-action-card">
                        <div className="ios-action-kicker">Quick Action</div>
                        <div className="ios-action-title">Command Palette</div>
                        <div className="ios-action-subtitle">Search anything fast. Cmd/Ctrl + K.</div>
                    </button>
                    <button onClick={() => setIterativeOpen(true)} className="ios-action-card">
                        <div className="ios-action-kicker">Core Mode</div>
                        <div className="ios-action-title">Iterative Solvers</div>
                        <div className="ios-action-subtitle">Run Jacobi, GS, CG, GMRES with preconditioning.</div>
                    </button>
                    <button onClick={() => setSimplifierOpen(true)} className="ios-action-card">
                        <div className="ios-action-kicker">Core Tool</div>
                        <div className="ios-action-title">Symbolic Simplifier</div>
                        <div className="ios-action-subtitle">Trace rule-by-rule algebra cleanup.</div>
                    </button>
                </div>

                <div className="flex glass-panel rounded-2xl p-1 mb-6 no-print">
                    <button onClick={() => handleModeChange('systemSolver')} className={`tab glass-tab flex-1 py-2 rounded-xl transition-colors text-sm font-medium ${appMode === 'systemSolver' ? 'active' : ''}`}>System Solver</button>
                    <button onClick={() => handleModeChange('matrixOperations')} className={`tab glass-tab flex-1 py-2 rounded-xl transition-colors text-sm font-medium ${appMode === 'matrixOperations' ? 'active' : ''}`}>Matrix Operations</button>
                    <button onClick={() => handleModeChange('determinantOfOperation')} className={`tab glass-tab flex-1 py-2 rounded-xl transition-colors text-sm font-medium ${appMode === 'determinantOfOperation' ? 'active' : ''}`}>Determinant of Operation</button>
                    <button onClick={() => handleModeChange('analysis')} className={`tab glass-tab flex-1 py-2 rounded-xl transition-colors text-sm font-medium ${appMode === 'analysis' ? 'active' : ''}`}>Analysis</button>
                </div>
                <div className="flex justify-end mb-4 no-print">
                    {appMode === 'systemSolver' && <InfoButton infoKey="systemSolver" />}
                    {appMode === 'matrixOperations' && <InfoButton infoKey="matrixOperations" />}
                    {appMode === 'determinantOfOperation' && <InfoButton infoKey="determinantOperation" />}
                    {appMode === 'analysis' && <InfoButton infoKey="analysis" />}
                </div>

                <main className="glass-shell rounded-3xl p-4 sm:p-6 border border-transparent">
                    {results ? (
                        <div
                            ref={splitContainerRef}
                            className="split-layout gap-0"
                            style={{
                                ['--split-left' as any]: `${splitRatio * 100}%`,
                                ['--split-right' as any]: `${(1 - splitRatio) * 100}%`
                            }}
                        >
                            <div className="no-print pr-4 min-w-0">
                                {inputPanel}
                            </div>
                            <div className="hidden lg:block no-print">
                                <div
                                    onMouseDown={() => setIsResizing(true)}
                                    className={`split-divider h-full ${isResizing ? 'is-active' : ''}`}
                                    aria-label="Resize panels"
                                    role="separator"
                                />
                            </div>
                            <div className="min-w-0">
                                {resultsPanel}
                            </div>
                        </div>
                    ) : (
                        <>
                            {inputPanel}
                            {resultsPanel}
                        </>
                    )}
                    {results && (
                        <ReportView
                            results={results}
                            appMode={appMode}
                            originalMatrix={originalMatrix}
                            analysisMatrix={analysisMatrix as ValidMatrix}
                            numberFormat={numberFormat}
                            variableAssumptions={variableAssumptions}
                            reportOptions={reportOptions}
                        />
                    )}
                    {renderBatchReport()}
                    <DocumentationView className="print-only doc-print" />
                </main>
            </div>
            {/* --- Modals --- */}
            <Modal title="Command Palette" isOpen={isCommandOpen} onClose={() => { setCommandOpen(false); setCommandQuery(''); }}>
                <div className="space-y-3">
                    <input
                        autoFocus
                        value={commandQuery}
                        onChange={(e) => setCommandQuery(e.target.value)}
                        placeholder="Type a command..."
                        className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="max-h-72 overflow-y-auto space-y-2">
                        {filteredCommands.length === 0 && (
                            <div className="text-sm text-secondary">No matching commands.</div>
                        )}
                        {filteredCommands.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => { cmd.action(); setCommandOpen(false); setCommandQuery(''); }}
                                className="w-full text-left px-3 py-2 rounded-lg glass-btn hover:bg-white/10"
                            >
                                {cmd.label}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-secondary">Shortcuts: Ctrl/Cmd+K, Ctrl/Cmd+Enter, Ctrl/Cmd+Shift+R</div>
                </div>
            </Modal>
            <Modal title="Save Matrix to Library" isOpen={isSaveModalOpen} onClose={() => setSaveModalOpen(false)}>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveToLibrary(e.currentTarget.matrixName.value, e.currentTarget.folderName.value, e.currentTarget.tags.value); }} className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Store matrices with folders and tags.</span>
                        <InfoButton infoKey="library" />
                    </div>
                    <label className="block"><span className="text-secondary">Matrix Name:</span>
                        <input name="matrixName" type="text" required className="mt-1 block w-full rounded-md glass-input shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-ink" placeholder="e.g. Homework 5, Q1"/>
                    </label>
                    <label className="block"><span className="text-secondary">Folder (optional):</span>
                        <input name="folderName" type="text" className="mt-1 block w-full rounded-md glass-input shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-ink" placeholder="e.g. Linear Algebra"/>
                    </label>
                    <label className="block"><span className="text-secondary">Tags (comma-separated):</span>
                        <input name="tags" type="text" className="mt-1 block w-full rounded-md glass-input shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-ink" placeholder="e.g. homework, exam, practice"/>
                    </label>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setSaveModalOpen(false)} className="py-2 px-4 rounded-lg glass-btn">Cancel</button><button type="submit" style={{backgroundColor: 'var(--button-bg)'}} className="py-2 px-4 rounded-lg text-white hover:opacity-90">Save</button></div>
                </form>
            </Modal>
            <Modal title="Load Matrix from Library" isOpen={isLoadModalOpen} onClose={() => setLoadModalOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Search, filter, and reuse saved matrices.</span>
                        <InfoButton infoKey="library" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search by name, folder, or tag..." className="flex-1 rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        <select value={libraryFolderFilter} onChange={e => setLibraryFolderFilter(e.target.value)} className="rounded-md glass-input px-2 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            <option value="all">All folders</option>
                            {libraryFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                        </select>
                        <div className="flex glass-panel rounded-2xl p-1">
                            <button onClick={() => setLibraryView('grid')} className={`px-3 py-1 rounded-xl text-xs glass-tab ${libraryView === 'grid' ? 'tab active' : ''}`}>Grid</button>
                            <button onClick={() => setLibraryView('list')} className={`px-3 py-1 rounded-xl text-xs glass-tab ${libraryView === 'list' ? 'tab active' : ''}`}>List</button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredLibrary.length > 0 ? (
                            libraryView === 'list' ? (
                                filteredLibrary.map(sm => (
                                    <div key={sm.id} className="flex items-center justify-between p-3 glass-input/50 rounded-lg">
                                        <div>
                                            <h4 className="font-semibold text-ink">{sm.name}</h4>
                                            <p className="text-xs text-secondary">{sm.rows}x{sm.cols} • {(sm.folder || 'Unsorted')}</p>
                                            {sm.tags && sm.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{sm.tags.map(tag => <span key={tag} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>)}</div>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleDeleteFromLibrary(sm.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label={`Delete ${sm.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                            <button onClick={() => handleLoadFromLibrary(sm)} style={{backgroundColor: 'var(--button-bg)'}} className="py-1 px-3 rounded-lg text-white text-sm hover:opacity-90">Load</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {filteredLibrary.map(sm => (
                                        <div key={sm.id} className="p-3 rounded-xl glass-input/50 border border-slate-200 dark:border-slate-600 flex flex-col gap-3">
                                            <div>
                                                <h4 className="font-semibold text-ink">{sm.name}</h4>
                                                <p className="text-xs text-secondary">{sm.rows}x{sm.cols} • {(sm.folder || 'Unsorted')}</p>
                                            </div>
                                            <div className="text-[11px] text-secondary bg-white/60 rounded-lg px-2 py-2 font-mono overflow-x-auto">
                                                {sm.matrix?.slice(0, 2).map((row, idx) => (
                                                    <div key={idx} className="whitespace-nowrap">
                                                        {row.map(cell => (cell ?? '•')).join('  ')}
                                                    </div>
                                                ))}
                                                {sm.rows > 2 && <div className="text-secondary">…</div>}
                                            </div>
                                            {sm.tags && sm.tags.length > 0 && <div className="flex flex-wrap gap-1">{sm.tags.map(tag => <span key={tag} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>)}</div>}
                                            <div className="flex items-center justify-between">
                                                <button onClick={() => handleDeleteFromLibrary(sm.id)} className="text-xs text-red-500 hover:text-red-600">Delete</button>
                                                <button onClick={() => handleLoadFromLibrary(sm)} style={{backgroundColor: 'var(--button-bg)'}} className="py-1 px-3 rounded-lg text-white text-xs hover:opacity-90">Load</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <p className="text-sm text-secondary">No matrices found.</p>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal title="Use Result As..." isOpen={useResultModal.open} onClose={() => setUseResultModal({ open: false, matrix: null })}>
                <div className="space-y-3">
                    <p className="text-secondary">Where would you like to send the resulting matrix?</p>
                    <button onClick={() => handleSetMatrixFromUsedResult('solver')} className="w-full text-left p-3 rounded-lg glass-btn">System Solver Matrix</button>
                    <button onClick={() => handleSetMatrixFromUsedResult('analysis')} className="w-full text-left p-3 rounded-lg glass-btn">Analysis Matrix</button>
                    <p className="text-sm text-secondary pt-2">Or, use in a new matrix operation:</p>
                    <div className="flex flex-wrap gap-2">{['C', 'D', 'E', 'F'].filter(n => !matrixNamesInExpression.includes(n)).map(name => <button key={name} onClick={() => handleSetMatrixFromUsedResult(name)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Use as Matrix {name}</button>)}</div>
                </div>
            </Modal>
            <Modal title="Export / Import" isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)}>
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Export matrices, app state, and clipboard formats.</span>
                        <InfoButton infoKey="exportImport" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-secondary">Export Matrix</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <select value={exportMatrixKey} onChange={e => setExportMatrixKey(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => { try { exportMatrixAsCsv(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export CSV</button>
                            <button onClick={() => { try { exportMatrixAsLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export LaTeX</button>
                            <button onClick={async () => { try { await copyMatrixLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Copy LaTeX</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-secondary">Export Steps</h3>
                        </div>
                        <button onClick={exportStepsBundle} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Export Markdown + LaTeX</button>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-secondary">Copy to Clipboard</h3>
                            <InfoButton infoKey="clipboard" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select value={clipboardTarget} onChange={e => setClipboardTarget(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                            <select value={clipboardFormat} onChange={e => setClipboardFormat(e.target.value as 'csv' | 'latex' | 'json')} className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                <option value="csv">CSV</option>
                                <option value="latex">LaTeX</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>
                        <button onClick={async () => { try { await copyMatrixToClipboard(); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Copy</button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-secondary">Export App State</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => exportStateAsJson(false)} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export JSON</button>
                            <button onClick={() => exportStateAsJson(true)} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Share File</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { try { exportMatrixAsLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Share Matrix LaTeX</button>
                            <button onClick={async () => { try { await copyMatrixLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Copy Matrix LaTeX</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportStepsLatexFile} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export Steps LaTeX</button>
                            <button onClick={async () => { try { await copyStepsLatex(); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Copy Steps LaTeX</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-secondary">Import</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <select value={importMatrixKey} onChange={e => setImportMatrixKey(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {getMatrixOptions().filter(opt => opt.key !== 'result').map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                        <input type="file" accept=".json,.mmatrix,.csv,.tsv,.tex" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await handleImportFile(file); setExportModalOpen(false); } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); } finally { e.currentTarget.value = ''; } }} className="block w-full text-sm text-secondary" />
                        <p className="text-xs text-secondary">CSV/TSV/LaTeX imports into the selected matrix target. JSON/mmatrix restores full app state.</p>
                    </div>
                </div>
            </Modal>
            <Modal title="Share" isOpen={isShareOpen} onClose={() => setShareOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-secondary">Share files and LaTeX exports from the current workspace.</p>
                    <div className="flex gap-2">
                        <button onClick={() => { try { exportStateAsJson(true); setShareOpen(false); setShareButtonText('Downloaded!'); setTimeout(() => setShareButtonText('Share File'), 2000); } catch (e) { setError(e instanceof Error ? e.message : 'Share failed.'); } }} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Share File</button>
                        <button onClick={() => { try { exportStateAsJson(false); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export JSON</button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-secondary">Matrix Target</label>
                        <select value={exportMatrixKey} onChange={e => setExportMatrixKey(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => { try { exportMatrixAsLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export Matrix LaTeX</button>
                            <button onClick={async () => { try { await copyMatrixLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Copy Matrix LaTeX</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportStepsLatexFile} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export Steps LaTeX</button>
                        <button onClick={async () => { try { await copyStepsLatex(); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Copy Steps LaTeX</button>
                    </div>
                </div>
            </Modal>
            <Modal title="Tools" isOpen={isToolsOpen} onClose={() => setToolsOpen(false)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setPresetsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Matrix Presets</button>
                        <InfoButton infoKey="presets" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSparseOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Sparse View (CSR/CSC)</button>
                        <InfoButton infoKey="sparse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setBatchOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Batch Runner</button>
                        <InfoButton infoKey="batch" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setRecipesOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Matrix Recipes</button>
                        <InfoButton infoKey="recipes" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setAssumptionsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Variable Assumptions</button>
                        <InfoButton infoKey="assumptions" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setProfilesOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Workspace Profiles</button>
                        <InfoButton infoKey="profiles" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSimplifierOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Symbolic Simplifier</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setMatrixFunctionsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Matrix Functions</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setJordanOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Jordan Form</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIterativeOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Iterative Solvers</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setExerciseOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Exercise Packs</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setPluginsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Plugins</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setVersionsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Project Versions</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setStepCompareOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Step Compare</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setPracticeOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Guided Practice</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setBlockOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Block Matrix Builder</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setHelpOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Offline Help Pack</button>
                        <InfoButton infoKey="help" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setDocsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg glass-btn">Documentation</button>
                        <InfoButton infoKey="documentation" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setReportOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">PDF Report</button>
                        <InfoButton infoKey="report" />
                    </div>
                </div>
            </Modal>
            <Modal title="Matrix Presets" isOpen={isPresetsOpen} onClose={() => setPresetsOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Generate common matrices and apply them to a target.</span>
                        <InfoButton infoKey="presets" />
                    </div>
                    <div>
                        <label className="text-sm text-secondary">Target Matrix</label>
                        <select value={presetTarget} onChange={e => setPresetTarget(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                            {getMatrixOptions().filter(opt => opt.key !== 'result').map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-sm text-secondary">Preset Type
                            <select value={presetType} onChange={e => setPresetType(e.target.value as typeof presetType)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                <option value="identity">Identity</option>
                                <option value="permutation">Permutation</option>
                                <option value="jordan">Jordan Block</option>
                                <option value="hilbert">Hilbert</option>
                                <option value="spd">Random SPD</option>
                            </select>
                        </label>
                        <label className="text-sm text-secondary">Eigenvalue (Jordan)
                            <input type="number" value={presetJordanEigen} onChange={e => setPresetJordanEigen(parseInt(e.target.value) || 1)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink" />
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-secondary">Rows
                            <input type="number" min="1" value={presetRows} onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); setPresetRows(v); if (['identity','permutation','jordan','hilbert','spd'].includes(presetType)) setPresetCols(v); }} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink" />
                        </label>
                        <label className="text-sm text-secondary">Cols
                            <input type="number" min="1" value={presetCols} onChange={e => setPresetCols(Math.max(1, parseInt(e.target.value) || 1))} disabled={['identity','permutation','jordan','hilbert','spd'].includes(presetType)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink disabled:opacity-60" />
                        </label>
                    </div>
                    <button onClick={handleApplyPreset} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Apply Preset</button>
                </div>
            </Modal>
            <Modal title="Guided Practice" isOpen={isPracticeOpen} onClose={() => setPracticeOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-secondary">Generate a random linear system and solve for x. Check your answer or load into the solver.</p>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => generatePracticeSystem(2)} className="px-3 py-2 rounded-lg glass-btn text-sm">New 2x2</button>
                        <button onClick={() => generatePracticeSystem(3)} className="px-3 py-2 rounded-lg glass-btn text-sm">New 3x3</button>
                        <button onClick={handleLoadPracticeToSolver} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm" disabled={!practiceMatrix}>Load to Solver</button>
                    </div>
                    {practiceMatrix && practiceB && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="glass-input/50 rounded-lg p-2">
                                    <div className="text-xs text-secondary mb-1">Matrix A</div>
                                    <LatexRenderer latex={formatMatrixToLatex(practiceMatrix)} />
                                </div>
                                <div className="glass-input/50 rounded-lg p-2">
                                    <div className="text-xs text-secondary mb-1">Vector b</div>
                                    <LatexRenderer latex={formatMatrixToLatex(practiceB)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-secondary">Enter solution vector x:</div>
                                <div className="flex flex-wrap gap-2">
                                    {practiceGuess.map((val, idx) => (
                                        <input
                                            key={idx}
                                            value={val}
                                            onChange={(e) => {
                                                const next = [...practiceGuess];
                                                next[idx] = e.target.value;
                                                setPracticeGuess(next);
                                            }}
                                            className="w-24 rounded-md glass-input px-2 py-1 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder={`x${idx + 1}`}
                                        />
                                    ))}
                                </div>
                                <button onClick={handleCheckPractice} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm">Check Answer</button>
                                {practiceFeedback && <div className="text-sm text-secondary">{practiceFeedback}</div>}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Block Matrix Builder" isOpen={isBlockOpen} onClose={() => setBlockOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-secondary">Combine four matrices into a 2×2 block matrix.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-secondary">Top Left (A)
                            <select value={blockKeys.tl} onChange={e => setBlockKeys(prev => ({ ...prev, tl: e.target.value }))} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </label>
                        <label className="text-sm text-secondary">Top Right (B)
                            <select value={blockKeys.tr} onChange={e => setBlockKeys(prev => ({ ...prev, tr: e.target.value }))} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </label>
                        <label className="text-sm text-secondary">Bottom Left (C)
                            <select value={blockKeys.bl} onChange={e => setBlockKeys(prev => ({ ...prev, bl: e.target.value }))} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </label>
                        <label className="text-sm text-secondary">Bottom Right (D)
                            <select value={blockKeys.br} onChange={e => setBlockKeys(prev => ({ ...prev, br: e.target.value }))} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </label>
                    </div>
                    <div>
                        <label className="text-sm text-secondary">Apply To</label>
                        <select value={blockTarget} onChange={e => setBlockTarget(e.target.value)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                            {getMatrixOptions().filter(opt => opt.key !== 'result').map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>
                    <button onClick={handleApplyBlockMatrix} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Build Block Matrix</button>
                </div>
            </Modal>
            <Modal title="Symbolic Simplifier" isOpen={isSimplifierOpen} onClose={() => setSimplifierOpen(false)}>
                <div className="space-y-4">
                    <div className="text-sm text-secondary">Simplify a symbolic fraction and inspect the rule trace.</div>
                    <input value={simplifyInput} onChange={e => setSimplifyInput(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink" />
                    <button onClick={handleSimplify} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Simplify</button>
                    {simplifyOutput && (
                        <div className="glass-input/50 rounded-lg p-3">
                            <div className="text-xs text-secondary mb-1">Result</div>
                            <LatexRenderer latex={simplifyOutput} />
                        </div>
                    )}
                    {simplifyTrace.length > 0 && (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {simplifyTrace.map((step: any, idx: number) => (
                                <div key={idx} className="p-2 rounded-lg glass-input/50">
                                    <div className="text-xs font-semibold text-secondary">{step.rule}</div>
                                    <div className="text-[11px] text-secondary">{step.note}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <LatexRenderer latex={formatSymbolicFractionToLatex(step.before)} />
                                        <LatexRenderer latex={formatSymbolicFractionToLatex(step.after)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Matrix Functions" isOpen={isMatrixFunctionsOpen} onClose={() => setMatrixFunctionsOpen(false)}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-secondary">Matrix</label>
                            <select value={matrixFuncTarget} onChange={e => setMatrixFuncTarget(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-secondary">Function</label>
                            <select value={matrixFuncType} onChange={e => setMatrixFuncType(e.target.value as any)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                <option value="exp">exp(A)</option>
                                <option value="log">log(A)</option>
                                <option value="sqrt">sqrt(A)</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleComputeMatrixFunction} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Compute</button>
                    {matrixFuncError && <div className="text-sm text-red-500">{matrixFuncError}</div>}
                    {matrixFuncResult && (
                        <div className="glass-input/50 rounded-lg p-3">
                            <LatexRenderer latex={formatNumericMatrixToLatex(matrixFuncResult, numberFormat)} />
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Jordan Form" isOpen={isJordanOpen} onClose={() => setJordanOpen(false)}>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-secondary">Matrix</label>
                        <select value={jordanTarget} onChange={e => setJordanTarget(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                            {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>
                    <button onClick={handleComputeJordan} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Compute</button>
                    {jordanResult && (
                        <div className="space-y-2">
                            {jordanResult.warning && <div className="text-sm text-yellow-600">{jordanResult.warning}</div>}
                            <LatexRenderer latex={`J = ${formatNumericMatrixToLatex(jordanResult.J, numberFormat)}`} />
                            <LatexRenderer latex={`P = ${formatNumericMatrixToLatex(jordanResult.P, numberFormat)}`} />
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Iterative Solvers" isOpen={isIterativeOpen} onClose={() => setIterativeOpen(false)}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-secondary">Matrix</label>
                            <select value={iterativeTarget} onChange={e => setIterativeTarget(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-secondary">Method</label>
                            <select value={iterativeMethod} onChange={e => setIterativeMethod(e.target.value as any)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                <option value="jacobi">Jacobi</option>
                                <option value="gs">Gauss-Seidel</option>
                                <option value="cg">Conjugate Gradient</option>
                                <option value="gmres">GMRES</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="text-sm text-secondary">Tolerance
                            <input type="number" value={iterativeTol} onChange={e => setIterativeTol(parseFloat(e.target.value) || 1e-6)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink" />
                        </label>
                        <label className="text-sm text-secondary">Max Iter
                            <input type="number" value={iterativeMaxIter} onChange={e => setIterativeMaxIter(parseInt(e.target.value) || 50)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink" />
                        </label>
                        <label className="text-sm text-secondary">Preconditioner
                            <select value={iterativePrecond} onChange={e => setIterativePrecond(e.target.value as any)} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                <option value="none">None</option>
                                <option value="jacobi">Jacobi</option>
                                <option value="ilu">ILU0</option>
                            </select>
                        </label>
                    </div>
                    <button onClick={handleRunIterative} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Run Solver</button>
                    {iterativeError && <div className="text-sm text-red-500">{iterativeError}</div>}
                    {iterativeResult && (
                        <div className="space-y-2">
                            <div className="text-sm text-secondary">x = [{iterativeResult.x.map(v => v.toFixed(4)).join(', ')}]</div>
                            <div className="text-xs text-secondary">Residuals: {iterativeResult.residuals.slice(0, 10).map(v => v.toExponential(2)).join(', ')}{iterativeResult.residuals.length > 10 ? '…' : ''}</div>
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Exercise Packs" isOpen={isExerciseOpen} onClose={() => setExerciseOpen(false)}>
                <div className="space-y-4">
                    <div className="text-sm text-secondary">Load offline exercise packs (JSON) and auto-grade solutions.</div>
                    <input type="file" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await handleImportExercisePack(file); } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); } finally { e.currentTarget.value = ''; } }} />
                    <select value={activePackId || ''} onChange={e => setActivePackId(e.target.value)} className="w-full rounded-md glass-input px-3 py-2 text-ink">
                        <option value="">Select Pack</option>
                        {exercisePacks.map(pack => <option key={pack.id} value={pack.id}>{pack.title || pack.id}</option>)}
                    </select>
                    {activePackId && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setActiveExerciseIndex(i => Math.max(0, i - 1))} className="px-2 py-1 rounded-lg glass-btn">Prev</button>
                                <button onClick={() => setActiveExerciseIndex(i => i + 1)} className="px-2 py-1 rounded-lg glass-btn">Next</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(exercisePacks.find(p => p.id === activePackId)?.exercises?.[activeExerciseIndex]?.prompt || 'Solve Ax=b.')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {exerciseAnswer.map((val, idx) => (
                                    <input key={idx} value={val} onChange={e => { const next = [...exerciseAnswer]; next[idx] = e.target.value; setExerciseAnswer(next); }} className="w-20 rounded-md glass-input px-2 py-1 text-ink" placeholder={`x${idx + 1}`} />
                                ))}
                            </div>
                            <button onClick={handleCheckExercise} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm">Check</button>
                            {exerciseFeedback && <div className="text-sm text-secondary">{exerciseFeedback}</div>}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Plugins" isOpen={isPluginsOpen} onClose={() => setPluginsOpen(false)}>
                <div className="space-y-4">
                    <div className="text-sm text-secondary">Import offline plugins (JSON) that register new commands or macros.</div>
                    <input type="file" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await handleImportPlugin(file); } catch (err) { setError(err instanceof Error ? err.message : 'Plugin import failed.'); } finally { e.currentTarget.value = ''; } }} />
                    <div className="space-y-2">
                        {plugins.map(plugin => (
                            <div key={plugin.id} className="p-2 rounded-lg glass-input/50">
                                <div className="font-semibold text-ink">{plugin.name || plugin.id}</div>
                                <div className="text-xs text-secondary">{(plugin.commands || []).length} commands</div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Project Versions" isOpen={isVersionsOpen} onClose={() => setVersionsOpen(false)}>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input value={versionName} onChange={e => setVersionName(e.target.value)} placeholder="Version name" className="flex-1 rounded-md glass-input px-3 py-2 text-ink" />
                        <button onClick={handleSaveVersion} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {projectVersions.map(version => (
                            <div key={version.id} className="flex items-center justify-between p-2 rounded-lg glass-input/50">
                                <div>
                                    <div className="font-medium text-ink">{version.name}</div>
                                    <div className="text-xs text-secondary">{new Date(version.createdAt).toLocaleString()}</div>
                                </div>
                                <button onClick={() => handleRestoreVersion(version.id)} className="px-2 py-1 rounded-lg glass-btn text-xs">Restore</button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Step Compare" isOpen={isStepCompareOpen} onClose={() => setStepCompareOpen(false)}>
                <div className="space-y-4">
                    <div className="text-sm text-secondary">Upload a JSON file with {`{\"steps\":[{\"matrix\":[...]}]}`} to compare against solver steps.</div>
                    <input type="file" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await handleCompareSteps(file); e.currentTarget.value = ''; }} />
                    {stepCompareResult && <div className="text-sm text-ink">{stepCompareResult}</div>}
                </div>
            </Modal>
            <Modal title="Sparse Matrix View" isOpen={isSparseOpen} onClose={() => setSparseOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Inspect CSR/CSC arrays and a sparsity heatmap.</span>
                        <InfoButton infoKey="sparse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm text-secondary">Matrix</label>
                            <select value={sparseTarget} onChange={e => setSparseTarget(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-secondary">Format</label>
                            <select value={sparseFormat} onChange={e => setSparseFormat(e.target.value as 'csr' | 'csc')} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink">
                                <option value="csr">CSR</option>
                                <option value="csc">CSC</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-secondary">Zero Threshold</label>
                            <input type="number" value={sparseEpsilon} onChange={e => setSparseEpsilon(Number(e.target.value) || 0)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink" />
                        </div>
                    </div>
                    {(() => {
                        const matrix = resolveMatrixByKey(sparseTarget);
                        if (!matrix) return <p className="text-sm text-secondary">Select a matrix to inspect.</p>;
                        const rows = matrix.length;
                        const cols = matrix[0]?.length || 0;
                        const nonZeros = matrix.flat().filter(cell => !isZeroCell(cell, sparseEpsilon)).length;
                        const density = rows * cols > 0 ? (nonZeros / (rows * cols)) : 0;
                        const csr = buildSparseCSR(matrix, sparseEpsilon);
                        const csc = buildSparseCSC(matrix, sparseEpsilon);
                        const data = sparseFormat === 'csr' ? csr : csc;
                        return (
                            <div className="space-y-3">
                                <div className="text-sm text-secondary">Non-zeros: {nonZeros} · Density: {(density * 100).toFixed(2)}%</div>
                                <div>
                                    <div className="text-sm font-semibold text-secondary mb-2">Sparsity Heatmap</div>
                                    {renderSparsityHeatmap(matrix, sparseEpsilon)}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-2 glass-panel rounded">
                                        <div className="font-semibold mb-1">Values</div>
                                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data.values)}</pre>
                                    </div>
                                    <div className="p-2 glass-panel rounded">
                                        <div className="font-semibold mb-1">{sparseFormat === 'csr' ? 'Column Index' : 'Row Index'}</div>
                                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sparseFormat === 'csr' ? csr.colIndex : csc.rowIndex)}</pre>
                                    </div>
                                    <div className="p-2 glass-panel rounded sm:col-span-2">
                                        <div className="font-semibold mb-1">{sparseFormat === 'csr' ? 'Row Pointer' : 'Column Pointer'}</div>
                                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sparseFormat === 'csr' ? csr.rowPtr : csc.colPtr)}</pre>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </Modal>
            <Modal title="Batch Runner" isOpen={isBatchOpen} onClose={() => setBatchOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Run the same analysis or expression across saved matrices.</span>
                        <InfoButton infoKey="batch" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-sm text-secondary">Mode
                            <select value={batchMode} onChange={e => setBatchMode(e.target.value as 'analysis' | 'expression')} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink">
                                <option value="analysis">Analysis (uses current analysis settings)</option>
                                <option value="expression">Matrix Operation (A-only)</option>
                            </select>
                        </label>
                        {batchMode === 'expression' && (
                            <label className="text-sm text-secondary">Expression
                                <input value={batchExpression} onChange={e => setBatchExpression(e.target.value.toUpperCase())} className="mt-1 w-full rounded-md glass-input px-3 py-2 text-ink" />
                            </label>
                        )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {library.length === 0 && <p className="text-sm text-secondary">No matrices saved in the library.</p>}
                        {library.map(item => (
                            <label key={item.id} className="flex items-center gap-2 text-sm text-secondary">
                                <input
                                    type="checkbox"
                                    checked={batchSelectedIds.includes(item.id)}
                                    onChange={() => setBatchSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                />
                                {item.name} ({item.rows}x{item.cols})
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleRunBatch} disabled={batchRunning} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm disabled:opacity-50">{batchRunning ? 'Running...' : 'Run Batch'}</button>
                        <button onClick={exportBatchReport} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Export JSON</button>
                        <button onClick={() => triggerPrint('batch')} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Print</button>
                    </div>
                    {batchResults.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {batchResults.map(item => (
                                <div key={item.id} className="p-2 rounded-lg glass-input/50 text-sm">
                                    <div className="font-medium text-ink">{item.name}</div>
                                    {item.error && <div className="text-red-500">{item.error}</div>}
                                    {item.result && 'kind' in item.result && item.result.kind === 'analysis' && (
                                        <div className="text-xs text-secondary">Rank: {item.result.rank}</div>
                                    )}
                                    {item.result && 'finalResult' in item.result && (
                                        <div className="text-xs text-secondary">Operation result available</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Matrix Recipes" isOpen={isRecipesOpen} onClose={() => setRecipesOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Save operation sequences as reusable macros.</span>
                        <InfoButton infoKey="recipes" />
                    </div>
                    <div className="flex gap-2">
                        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Recipe name" className="flex-1 rounded-md glass-input px-3 py-2 text-ink" />
                        <button onClick={() => { handleSaveRecipe(recipeName); setRecipeName(''); }} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Save</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recipes.length === 0 && <p className="text-sm text-secondary">No recipes saved yet.</p>}
                        {recipes.map(recipe => (
                            <div key={recipe.id} className="flex items-center justify-between p-2 rounded-lg glass-input/50">
                                <div className="min-w-0">
                                    <div className="font-medium text-ink truncate">{recipe.name}</div>
                                    <div className="text-xs text-secondary truncate">{recipe.expression}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApplyRecipe(recipe)} className="py-1 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs">Apply</button>
                                    <button onClick={() => handleDeleteRecipe(recipe.id)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Variable Assumptions" isOpen={isAssumptionsOpen} onClose={() => setAssumptionsOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Set symbolic constraints that flow into steps and reports.</span>
                        <InfoButton infoKey="assumptions" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <input value={assumptionVar} onChange={e => setAssumptionVar(e.target.value)} placeholder="Variable (e.g., a)" className="rounded-md glass-input px-3 py-2 text-ink" />
                        <select value={assumptionConstraint} onChange={e => setAssumptionConstraint(e.target.value as VariableAssumption['constraint'])} className="rounded-md glass-input px-3 py-2 text-ink">
                            <option value="nonzero">nonzero</option>
                            <option value="positive">positive</option>
                            <option value="negative">negative</option>
                            <option value="integer">integer</option>
                        </select>
                        <button onClick={handleAddAssumption} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Add</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {variableAssumptions.length === 0 && <p className="text-sm text-secondary">No assumptions set.</p>}
                        {variableAssumptions.map((assumption, idx) => (
                            <div key={`${assumption.variable}-${idx}`} className="flex items-center justify-between p-2 rounded-lg glass-input/50">
                                <div className="text-sm text-ink">{assumption.variable} is {assumption.constraint}</div>
                                <button onClick={() => handleRemoveAssumption(idx)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Workspace Profiles" isOpen={isProfilesOpen} onClose={() => setProfilesOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Profiles keep libraries, history, and settings isolated.</span>
                        <InfoButton infoKey="profiles" />
                    </div>
                    <div className="flex gap-2">
                        <input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="New profile name" className="flex-1 rounded-md glass-input px-3 py-2 text-ink" />
                        <button onClick={handleCreateProfile} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Create</button>
                    </div>
                    <div className="space-y-2">
                        {profiles.map(profile => (
                            <div key={profile.id} className={`flex items-center justify-between p-2 rounded-lg border ${activeProfile === profile.id ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--glass-border)] glass-panel'}`}>
                                <div className="font-medium text-ink">{profile.name}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSwitchProfile(profile.id)} className="py-1 px-3 rounded-lg glass-btn text-xs">Switch</button>
                                    <button onClick={() => handleDeleteProfile(profile.id)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Offline Help Pack" isOpen={isHelpOpen} onClose={() => setHelpOpen(false)}>
                <div className="space-y-4 text-sm text-secondary max-h-[60vh] overflow-y-auto pr-2">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                        <span>Local quick start and examples.</span>
                        <InfoButton infoKey="help" />
                    </div>
                    <h3 className="font-semibold text-lg">Quick Start</h3>
                    <p>Use the System Solver to reduce augmented matrices, the Matrix Operations tab for algebraic expressions, or Analysis for decompositions.</p>
                    <h3 className="font-semibold text-lg">Example Matrices</h3>
                    <div className="space-y-2">
                        <button onClick={() => { const m = generatePresetMatrix('identity', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg glass-btn">Load 3x3 Identity (Analysis)</button>
                        <button onClick={() => { const m = generatePresetMatrix('hilbert', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg glass-btn">Load 3x3 Hilbert (Analysis)</button>
                        <button onClick={() => { const m = generatePresetMatrix('spd', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg glass-btn">Load Random SPD (Analysis)</button>
                    </div>
                    <h3 className="font-semibold text-lg">Guided Walkthrough</h3>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Open Analysis mode and load the 3x3 Hilbert matrix.</li>
                        <li>Toggle numeric mode and enable LU/QR/SVD/Eigen.</li>
                        <li>Run Analyze to compare decompositions.</li>
                        <li>Use the Report button to print a PDF.</li>
                    </ol>
                </div>
            </Modal>
            <Modal title="Documentation" isOpen={isDocsOpen} onClose={() => setDocsOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Full manual with a printable PDF.</span>
                        <InfoButton infoKey="documentation" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <DocumentationView className="doc-screen" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => triggerPrint('docs')} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Print / Save PDF</button>
                        <button onClick={() => setDocsOpen(false)} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Close</button>
                    </div>
                </div>
            </Modal>
            <Modal title="Print / PDF Report" isOpen={isReportOpen} onClose={() => setReportOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Generate a styled PDF report offline.</span>
                        <InfoButton infoKey="report" />
                    </div>
                    <p className="text-sm text-secondary">Use your browser's Print dialog to save as PDF. The report will include cover and TOC based on your report settings.</p>
                    <div className="flex gap-2">
                        <button onClick={() => triggerPrint('report')} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Print / Save PDF</button>
                        <button onClick={() => setReportOpen(false)} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm">Close</button>
                    </div>
                </div>
            </Modal>
            <Modal title="Compare Matrices" isOpen={isCompareModalOpen} onClose={() => setCompareModalOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Highlight differences between two matrices.</span>
                        <InfoButton infoKey="compare" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-secondary">Left Matrix</label>
                            <select value={compareLeftKey} onChange={e => setCompareLeftKey(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-secondary">Right Matrix</label>
                            <select value={compareRightKey} onChange={e => setCompareRightKey(e.target.value)} className="w-full mt-1 rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {(() => {
                        const left = resolveMatrixByKey(compareLeftKey);
                        const right = resolveMatrixByKey(compareRightKey);
                        if (!left || !right) {
                            return <p className="text-sm text-secondary">Select two matrices to compare.</p>;
                        }
                        if ((left[0]?.length || 0) !== (right[0]?.length || 0) || left.length !== right.length) {
                            return <p className="text-sm text-yellow-600">Matrices have different dimensions. Comparison is still shown, but unmatched cells are highlighted.</p>;
                        }
                        return null;
                    })()}

                    {(() => {
                        const left = resolveMatrixByKey(compareLeftKey);
                        const right = resolveMatrixByKey(compareRightKey);
                        if (!left || !right) return null;
                        const diff = buildDiffMap(left, right);
                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-secondary mb-2">Left</h4>
                                    {renderMatrixPreview(left, diff)}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-secondary mb-2">Right</h4>
                                    {renderMatrixPreview(right, diff)}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </Modal>
            <Modal title="History & Snapshots" isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                        <span>Undo/redo with named snapshots.</span>
                        <InfoButton infoKey="history" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary">
                        <span>Cached determinant and inverse results appear in snapshots.</span>
                        <InfoButton infoKey="determinantCache" className="w-4 h-4 text-[10px]" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleUndoSnapshot} disabled={historyIndex <= 0} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm disabled:opacity-50">Undo</button>
                        <button onClick={handleRedoSnapshot} disabled={historyIndex >= history.length - 1} className="flex-1 py-2 px-3 rounded-lg glass-btn text-sm disabled:opacity-50">Redo</button>
                    </div>
                    <div className="flex gap-2">
                        <input value={snapshotName} onChange={e => setSnapshotName(e.target.value)} placeholder="Snapshot name" className="flex-1 rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        <button onClick={() => createSnapshot(snapshotName)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Save</button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-secondary">
                        <input type="checkbox" checked={autoSnapshotOnCalculate} onChange={e => setAutoSnapshotOnCalculate(e.target.checked)} />
                        Auto-snapshot on calculate
                    </label>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-sm text-secondary">No snapshots yet. Save one to get started.</p>
                        ) : history.map((snap, index) => {
                            const cached = getSnapshotCacheSummary(snap);
                            const detValue = cached?.determinant ? stringifySymbolicFraction(cached.determinant.value) : null;
                            const inverseLabel = cached?.inverse ? (cached.inverse.exists ? 'Inverse: yes' : 'Inverse: no') : null;
                            return (
                                <div key={snap.id} className={`flex items-center justify-between p-2 rounded-lg border ${index === historyIndex ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--glass-border)] glass-panel'}`}>
                                    <div className="min-w-0">
                                        <div className="font-medium text-ink truncate">{snap.name}</div>
                                        <div className="text-xs text-secondary">{new Date(snap.createdAt).toLocaleString()}</div>
                                        {(detValue || inverseLabel) && (
                                            <div className="text-[11px] text-secondary">
                                                {detValue ? `det(A)=${detValue}` : ''}{detValue && inverseLabel ? ' · ' : ''}{inverseLabel || ''}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => applySnapshotAtIndex(index)} className="py-1 px-3 rounded-lg glass-btn text-xs">Load</button>
                                        <button onClick={() => deleteSnapshot(snap.id)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Delete</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
            <Modal title="Settings" isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)}>
                <div className="space-y-6">
                    <div><label className="font-medium text-secondary">Theme</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setTheme('light')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'light' ? 'tab active' : ''}`}>Light</button><button onClick={() => setTheme('dark')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'dark' ? 'tab active' : ''}`}>Dark</button><button onClick={() => setTheme('custom')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'custom' ? 'tab active' : ''}`}>Custom</button></div></div>
                    {theme === 'custom' && (
                        <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg space-y-3">
                            <h3 className="font-semibold text-lg" style={{color: 'var(--primary-text-color)'}}>Customize Colors</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {Object.entries(customThemeColors).map(([key, value]) => (
                                    <label key={key} className="flex items-center justify-between text-sm">
                                        <span className="capitalize text-secondary">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <input type="color" value={value} onChange={e => setCustomThemeColors(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 p-0 border-0 rounded bg-transparent" />
                                    </label>
                                ))}
                            </div>
                            <button onClick={() => setCustomThemeColors(defaultCustomColors)} className="text-sm w-full mt-2 py-2 px-4 rounded-lg glass-btn">Reset to Defaults</button>
                        </div>
                    )}
                    <div><label className="font-medium text-secondary">Display Density</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setDensity('comfortable')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${density === 'comfortable' ? 'tab active' : ''}`}>Comfortable</button><button onClick={() => setDensity('compact')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${density === 'compact' ? 'tab active' : ''}`}>Compact</button></div></div>
                    <div><label className="font-medium text-secondary">Font Size</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setFontSize('small')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'small' ? 'tab active' : ''}`}>Small</button><button onClick={() => setFontSize('medium')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'medium' ? 'tab active' : ''}`}>Medium</button><button onClick={() => setFontSize('large')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'large' ? 'tab active' : ''}`}>Large</button></div></div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-secondary">
                            <span>App Version</span>
                            <span className="text-ink">{appVersion}</span>
                        </div>
                        {latestVersion && (
                            <div className="flex items-center justify-between text-sm text-secondary">
                                <span>Latest Version</span>
                                <span className="text-ink">{latestVersion}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm text-secondary">
                            <span>Update Status</span>
                            <span className="text-ink">{formatUpdateStatus(updateStatus)}</span>
                        </div>
                        {updateStatus.state === 'downloading' && typeof updateStatus.percent === 'number' && (
                            <div className="h-2 rounded-full bg-[var(--glass-border)] overflow-hidden">
                                <div className="h-full bg-[var(--accent-1)]" style={{ width: `${Math.max(2, Math.min(100, updateStatus.percent))}%` }} />
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <button onClick={handleCheckForUpdates} className="px-3 py-2 rounded-lg glass-btn text-sm">Check for Updates</button>
                            {updateStatus.state === 'available' && (
                                <button onClick={handleDownloadUpdate} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Download Update</button>
                            )}
                            {updateStatus.state === 'ready' && (
                                <button onClick={handleInstallUpdate} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm">Restart to Update</button>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-secondary">Tutor Mode</label>
                            <InfoButton infoKey="tutorMode" />
                        </div>
                        <div className="flex glass-panel rounded-2xl p-1 mt-1">
                            <button onClick={() => setTutorMode(true)} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${tutorMode ? 'tab active' : ''}`}>On</button>
                            <button onClick={() => setTutorMode(false)} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${!tutorMode ? 'tab active' : ''}`}>Off</button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-secondary">Number Formatting</label>
                            <InfoButton infoKey="numberFormat" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="text-sm text-secondary">Digits
                                <input type="number" min="1" max="12" value={numberFormat.digits ?? 6} onChange={e => setNumberFormat(prev => ({ ...prev, digits: Math.max(1, Math.min(12, parseInt(e.target.value) || 6)) }))} className="mt-1 block w-full rounded-md glass-input px-2 py-1 text-ink" />
                            </label>
                            <label className="text-sm text-secondary">Mode
                                <select value={numberFormat.mode ?? 'fixed'} onChange={e => setNumberFormat(prev => ({ ...prev, mode: e.target.value as NumberFormatOptions['mode'] }))} className="mt-1 block w-full rounded-md glass-input px-2 py-1 text-ink">
                                    <option value="auto">Auto</option>
                                    <option value="fixed">Fixed</option>
                                    <option value="scientific">Scientific</option>
                                    <option value="fraction">Fractionize</option>
                                </select>
                            </label>
                            <label className="text-sm text-secondary">Max Denominator
                                <input type="number" min="2" max="10000" value={numberFormat.fractionMaxDenominator ?? 1000} onChange={e => setNumberFormat(prev => ({ ...prev, fractionMaxDenominator: Math.max(2, Math.min(10000, parseInt(e.target.value) || 1000)) }))} className="mt-1 block w-full rounded-md glass-input px-2 py-1 text-ink" />
                            </label>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-secondary">Report Options</label>
                            <InfoButton infoKey="report" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeCover} onChange={e => setReportOptions(prev => ({ ...prev, includeCover: e.target.checked }))} /> Cover page</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeTOC} onChange={e => setReportOptions(prev => ({ ...prev, includeTOC: e.target.checked }))} /> Table of contents</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeSteps} onChange={e => setReportOptions(prev => ({ ...prev, includeSteps: e.target.checked }))} /> Include steps</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeDetails} onChange={e => setReportOptions(prev => ({ ...prev, includeDetails: e.target.checked }))} /> Include matrices per step</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeAssumptions} onChange={e => setReportOptions(prev => ({ ...prev, includeAssumptions: e.target.checked }))} /> Include assumptions</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={reportOptions.includeTutorNotes} onChange={e => setReportOptions(prev => ({ ...prev, includeTutorNotes: e.target.checked }))} /> Include tutor notes</label>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal title={infoState.key ? `About ${INFO_CONTENT[infoState.key].title}` : 'Feature Info'} isOpen={infoState.open} onClose={closeInfo}>
                <div className="space-y-4 text-sm text-secondary">
                    <p>{infoState.key ? INFO_CONTENT[infoState.key].summary : ''}</p>
                    <button onClick={() => { closeInfo(); setDocsOpen(true); }} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Open Full Documentation</button>
                </div>
            </Modal>
            <Modal title={`What is ${explainerState.topic}?`} isOpen={explainerState.isOpen} onClose={() => setExplainerState({ isOpen: false, topic: '', content: '' })}>
                <div className="text-left space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-secondary">
                    {renderExplanationContent(explainerState.content)}
                </div>
            </Modal>
        </div>
    );
};

export default App;
