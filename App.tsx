import React, { useState, useCallback, useMemo, useEffect, useRef, startTransition } from 'react';
import * as LZString from 'lz-string';
import { MatrixInput } from './components/MatrixInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Modal } from './components/Modal';
import { LatexRenderer } from './components/LatexRenderer';
import { OperationBuilder } from './components/OperationBuilder';
import ReportView from './components/ReportView';
import DocumentationView from './components/DocumentationView';
import { calculate, calculateMatrixOperations, calculateDeterminantOfOperation, parseInput, stringifySymbolicFraction, recalculateDetailsForSection, expressionToBuilderNodes, builderNodesToExpression, calculateRank, calculateTrace, toNumericMatrix, numericRank, numericTrace, numericLU, numericQR, numericSVD, numericEigen, formatMatrixToLatex, areSFEqual, isZeroSF, symbolicFractionToNumber, formatNumberToLatex, formatNumericMatrixToLatex, formatNumericMatrixToCsv } from './services/matrixService';
import type { Matrix, CalculationResult, SystemType, SymbolicFraction, CramersRuleResult, ValidMatrix, AppMode, MatrixOperationsResult, DeterminantOfOperationResult, MatrixAnalysisResult, AnalysisMode, SharedState, SavedMatrix, OperationNode, NumberFormatOptions, VariableAssumption, MatrixRecipe, WorkspaceProfile, ReportOptions, AnyResult, DeterminantResult, InverseResult } from './types';

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
    bgColor: '#0f172a', textColor: '#e2e8f0', primaryTextColor: '#818cf8', secondaryTextColor: '#94a3b8',
    borderColor: '#334155', cardBgStart: '#1e293b', cardBgEnd: '#0f172a', buttonBg: '#4f46e5', inputBg: '#334155'
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
    const [compareLeftKey, setCompareLeftKey] = useState('solver');
    const [compareRightKey, setCompareRightKey] = useState('analysis');
    const [theme, setTheme] = useState('dark');
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

    // Batch Runner
    const [batchMode, setBatchMode] = useState<'analysis' | 'expression'>('analysis');
    const [batchExpression, setBatchExpression] = useState('A');
    const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
    const [batchResults, setBatchResults] = useState<{ id: string; name: string; result?: AnyResult; error?: string }[]>([]);
    const [batchRunning, setBatchRunning] = useState(false);
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
        if (!profileLoaded) return;
        localStorage.setItem(profileStorageKey(activeProfile, 'density'), density);
        localStorage.setItem(profileStorageKey(activeProfile, 'theme'), theme);

        if (theme === 'custom') {
            document.documentElement.removeAttribute('data-theme');
            for (const [key, value] of Object.entries(customThemeColors)) {
                document.documentElement.style.setProperty(cssVarMap[key as keyof CustomThemeColors], value);
            }
            localStorage.setItem(profileStorageKey(activeProfile, 'customTheme'), JSON.stringify(customThemeColors));
        } else {
            document.documentElement.setAttribute('data-theme', theme);
            // Clean up custom styles when switching back to a default theme
            for (const cssVar of Object.values(cssVarMap)) {
                document.documentElement.style.removeProperty(cssVar);
            }
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

    // --- Derived State & Effects ---

    const extractMatrixNames = useCallback((expr: string) => {
        return [...new Set(expr.match(/[A-Z]/g) || [])].sort();
    }, []);

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
                            <div key={`${r}-${c}`} className={`px-2 py-1 text-xs rounded border ${isDiff ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'}`}>
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
        const matrix = resolveMatrixByKey(key);
        if (!matrix) throw new Error("Matrix not found.");
        if (matrixHasNull(matrix)) throw new Error("Fill all cells in the selected matrix before exporting.");
        let latex = '';
        try {
            const numeric = toNumericMatrix(matrix as ValidMatrix);
            latex = formatNumericMatrixToLatex(numeric, numberFormat);
        } catch {
            latex = formatMatrixToLatex(matrix as ValidMatrix);
        }
        downloadFile(`matrix-${key}.tex`, latex, 'text/plain');
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
            try {
                const numeric = toNumericMatrix(matrix as ValidMatrix);
                payload = formatNumericMatrixToLatex(numeric, numberFormat);
            } catch {
                payload = formatMatrixToLatex(matrix as ValidMatrix);
            }
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

    const parseSavedMatrix = (saved: SavedMatrix): Matrix => {
        return saved.matrix.map(row => row.map(cell => (cell ? parseInput(cell) : null)));
    };

    const parseSavedMatrixToValid = (saved: SavedMatrix): ValidMatrix => {
        const matrix = parseSavedMatrix(saved);
        if (matrixHasNull(matrix)) {
            throw new Error(`Matrix ${saved.name} contains empty cells.`);
        }
        return matrix as ValidMatrix;
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

    const handleRunBatch = () => {
        setBatchRunning(true);
        setError(null);
        const selected = library.filter(item => batchSelectedIds.includes(item.id));
        if (selected.length === 0) {
            setBatchRunning(false);
            setError('Select at least one matrix to run.');
            return;
        }

        const expressionNames = extractMatrixNames(batchExpression);
        if (batchMode === 'expression' && expressionNames.some(name => name !== 'A')) {
            setBatchRunning(false);
            setError('Batch expression mode currently supports only matrix A.');
            return;
        }

        const results = selected.map(item => {
            try {
                const validMatrix = parseSavedMatrixToValid(item);
                if (batchMode === 'analysis') {
                    const warnings: string[] = [];
                    if (analysisMode === 'exact') {
                        const rank = calculateRank(validMatrix);
                        const trace = validMatrix.length === validMatrix[0]?.length ? calculateTrace(validMatrix) : undefined;
                        if (!trace) warnings.push('Trace is only defined for square matrices.');
                        const result: MatrixAnalysisResult = { kind: 'analysis', mode: 'exact', rank, trace, warnings };
                        return { id: item.id, name: item.name, result };
                    }
                    const numericMatrix = toNumericMatrix(validMatrix);
                    const rank = numericRank(numericMatrix);
                    let trace: number | undefined;
                    if (numericMatrix.length === numericMatrix[0]?.length) trace = numericTrace(numericMatrix);
                    else warnings.push('Trace is only defined for square matrices.');
                    const result: MatrixAnalysisResult = { kind: 'analysis', mode: 'numeric', rank, trace, warnings };
                    if (analysisOptions.computeLU && numericMatrix.length === numericMatrix[0]?.length) result.lu = numericLU(numericMatrix);
                    if (analysisOptions.computeQR) result.qr = numericQR(numericMatrix);
                    if (analysisOptions.computeSVD) result.svd = numericSVD(numericMatrix);
                    if (analysisOptions.computeEigen && numericMatrix.length === numericMatrix[0]?.length) result.eigen = numericEigen(numericMatrix);
                    return { id: item.id, name: item.name, result };
                }

                const matrices = new Map<string, ValidMatrix>();
                matrices.set('A', validMatrix);
                const result = calculateMatrixOperations(batchExpression, matrices, { summarized: true });
                return { id: item.id, name: item.name, result };
            } catch (e) {
                return { id: item.id, name: item.name, error: e instanceof Error ? e.message : 'Batch run failed.' };
            }
        });

        setBatchResults(results);
        setBatchRunning(false);
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

    // --- Universal Handlers ---
    const handleShare = () => {
        try {
            exportStateAsJson(true);
            setShareButtonText('Downloaded!');
            setTimeout(() => setShareButtonText('Share File'), 2000);
        } catch (e) {
            console.error("Failed to create share file:", e);
            if (e instanceof Error) {
                setError(`Error creating share file: ${e.message}`);
            } else {
                setError("An unknown error occurred while creating the share file.");
            }
        }
    };

    const handleCalculate = () => {
        setResultsKey(prev => prev + 1);
        setError(null); setIsLoading(true); setResults(null); setOpenSections({});
        setTimeout(() => {
            try {
                if (autoSnapshotOnCalculate) {
                    createSnapshot(`Auto ${new Date().toLocaleString()}`);
                }
                if (appMode === 'systemSolver') {
                    if (!solverMatrix) throw new Error("Please create a matrix first.");
                    if (matrixHasNull(solverMatrix)) throw new Error("Please fill in all matrix cells.");
                    const validMatrix = solverMatrix as ValidMatrix;
                    setOriginalMatrix(validMatrix);
                    const result = calculate(validMatrix, systemType, { summarized: true });
                    startTransition(() => setResults(result));
                } else if (appMode === 'analysis') {
                    if (!analysisMatrix) throw new Error("Please create a matrix first.");
                    if (matrixHasNull(analysisMatrix)) throw new Error("Please fill in all matrix cells.");
                    const validMatrix = analysisMatrix as ValidMatrix;
                    const warnings: string[] = [];

                    if (analysisMode === 'exact') {
                        const rank = calculateRank(validMatrix);
                        let trace: SymbolicFraction | undefined;
                        if (validMatrix.length === validMatrix[0]?.length) {
                            trace = calculateTrace(validMatrix);
                        } else {
                            warnings.push("Trace is only defined for square matrices.");
                        }
                        const result: MatrixAnalysisResult = {
                            kind: 'analysis',
                            mode: 'exact',
                            rank,
                            trace,
                            warnings
                        };
                        startTransition(() => setResults(result));
                    } else {
                        const numericMatrix = toNumericMatrix(validMatrix);
                        const rank = numericRank(numericMatrix);
                        let trace: number | undefined;
                        if (numericMatrix.length === numericMatrix[0]?.length) {
                            trace = numericTrace(numericMatrix);
                        } else {
                            warnings.push("Trace is only defined for square matrices.");
                        }

                        const result: MatrixAnalysisResult = {
                            kind: 'analysis',
                            mode: 'numeric',
                            rank,
                            trace,
                            warnings
                        };

                        if (analysisOptions.computeLU) {
                            if (numericMatrix.length === numericMatrix[0]?.length) {
                                result.lu = numericLU(numericMatrix);
                            } else {
                                warnings.push("LU decomposition requires a square matrix.");
                            }
                        }

                        if (analysisOptions.computeQR) {
                            result.qr = numericQR(numericMatrix);
                        }

                        if (analysisOptions.computeSVD) {
                            result.svd = numericSVD(numericMatrix);
                        }

                        if (analysisOptions.computeEigen) {
                            if (numericMatrix.length === numericMatrix[0]?.length) {
                                result.eigen = numericEigen(numericMatrix);
                            } else {
                                warnings.push("Eigenvalues require a square matrix.");
                            }
                        }

                        startTransition(() => setResults(result));
                    }
                } else {
                     const matrices = new Map<string, ValidMatrix>();
                     for (const name in matrixDefs) {
                         if (!matrixNamesInExpression.includes(name)) continue;
                         const def = matrixDefs[name];
                         if(matrixHasNull(def.matrix)) throw new Error(`Please fill all cells for Matrix ${name}.`);
                         matrices.set(name, def.matrix as ValidMatrix);
                     }
                     if (matrices.size !== matrixNamesInExpression.length) {
                        throw new Error("One or more matrices in the expression are not defined.");
                     }
                     if (appMode === 'matrixOperations') {
                         const result = calculateMatrixOperations(expression, matrices, { summarized: true });
                         startTransition(() => setResults(result));
                     } else if (appMode === 'determinantOfOperation') {
                         const result = calculateDeterminantOfOperation(expression, matrices, { summarized: true });
                         startTransition(() => setResults(result));
                     }
                }
            } catch (e) {
                if (e instanceof Error) setError(e.message);
                else setError("An unknown error occurred during calculation.");
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };
    
    const handleRequestDetails = (section: string, payload?: any) => {
        setError(null); setLoadingDetails(section);
        setTimeout(() => {
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

                const newResults = recalculateDetailsForSection(results, section, originalInputs, appMode);
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
                startTransition(() => setResults(newResults));
                setOpenSections(prev => ({ ...prev, [section]: true }));

            } catch (e) {
                 if (e instanceof Error) setError(e.message);
                 else setError(`An unknown error occurred while calculating details for ${section}.`);
            } finally {
                setLoadingDetails(null);
            }
        }, 50)
    };
    
    const handleReset = () => {
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
    };

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
                    <label htmlFor="sys-rows" className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Rows (m)</label>
                    <input id="sys-rows" type="number" value={rows} onChange={(e) => { const val = e.target.value; setRows(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (rows === '') setRows(1); }} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                </div>
                <div>
                    <label htmlFor="sys-cols" className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">{systemType === 'homogeneous' ? 'Cols (n)' : 'Coeff. Cols (n)'}</label>
                    <input id="sys-cols" type="number" value={cols} onChange={(e) => { const val = e.target.value; setCols(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (cols === '') setCols(1); }} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRandomizeSolverMatrix} className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Randomize</button>
                    <button style={{ backgroundColor: 'var(--button-bg)' }} onClick={handleClearMatrix} className="hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Clear</button>
                </div>
            </div>
            {solverMatrix && (
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text-color)' }}>{systemType === 'homogeneous' ? 'Enter Matrix A' : 'Enter Augmented Matrix [A | b]'}</h2>
                        <InfoButton infoKey="matrixInput" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-lg mx-auto">You can use integers (5), fractions (2/3), and symbolic constants (a, k, 5b-3).</p>
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
                    <div className="overflow-x-auto bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                        <input type="text" value={expression} onChange={e => setExpression(e.target.value.toUpperCase())} className="block w-full bg-transparent px-3 py-2 text-slate-800 dark:text-white focus:outline-none font-mono text-lg min-w-max" placeholder="e.g. A^2 * B - C"/>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Use capital letters for matrix names. Supported operators: +, -, *, ^. Use parentheses for grouping.</p>
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
                        <div key={name} className="p-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 rounded-lg">
                            <div className="flex flex-wrap gap-x-6 gap-y-3 items-end mb-4">
                                <div className="flex items-center gap-2 mr-auto">
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text-color)' }}>Matrix {name}</h3>
                                    <InfoButton infoKey="matrixInput" />
                                </div>
                                <div>
                                    <label htmlFor={`rows-${name}`} className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Rows</label>
                                    <input id={`rows-${name}`} type="number" value={def.rows} onChange={(e) => { const v = e.target.value; updateMatrixDef(name, { rows: v === '' ? '' : Math.max(1, parseInt(v) || 1) }); }} onBlur={() => { if (def.rows === '') updateMatrixDef(name, { rows: 1 }); }} className="w-20 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                                </div>
                                <div>
                                    <label htmlFor={`cols-${name}`} className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Cols</label>
                                    <input id={`cols-${name}`} type="number" value={def.cols} onChange={(e) => { const v = e.target.value; updateMatrixDef(name, { cols: v === '' ? '' : Math.max(1, parseInt(v) || 1) }); }} onBlur={() => { if (def.cols === '') updateMatrixDef(name, { cols: 1 }); }} className="w-20 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                                </div>
                                <button onClick={() => handleRandomizeOpsMatrix(name)} className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Randomize</button>
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
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <span>Exact vs Numeric</span>
                    <InfoButton infoKey="analysisModes" className="w-4 h-4 text-[10px]" />
                </div>
                {analysisMode === 'exact' && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Exact mode computes rank and trace only. Numeric mode unlocks LU, QR, SVD, and eigen analysis.</p>
                )}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end justify-center mb-6">
                <div>
                    <label htmlFor="analysis-rows" className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Rows (m)</label>
                    <input id="analysis-rows" type="number" value={analysisRows} onChange={(e) => { const val = e.target.value; setAnalysisRows(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (analysisRows === '') setAnalysisRows(1); }} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                </div>
                <div>
                    <label htmlFor="analysis-cols" className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Cols (n)</label>
                    <input id="analysis-cols" type="number" value={analysisCols} onChange={(e) => { const val = e.target.value; setAnalysisCols(val === '' ? '' : Math.max(1, parseInt(val) || 1)); }} onBlur={() => { if (analysisCols === '') setAnalysisCols(1); }} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRandomizeAnalysisMatrix} className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Randomize</button>
                    <button style={{ backgroundColor: 'var(--button-bg)' }} onClick={handleClearAnalysisMatrix} className="hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">Clear</button>
                </div>
                <div className="min-w-[220px]">
                    <label htmlFor="analysis-source" className="block text-sm text-center font-medium text-gray-500 dark:text-slate-400 mb-1">Load From</label>
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
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-2">
                        <span>Decomposition Options</span>
                        <InfoButton infoKey="decompositions" className="w-4 h-4 text-[10px]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-slate-300">
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
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 max-w-lg mx-auto">Use integers, fractions, or symbolic constants. Numeric mode requires all entries to be numeric constants.</p>
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

    return (
        <div className="min-h-screen flex flex-col items-center p-4 lg:p-8 transition-colors duration-300 relative">
            <div className="aurora-bg" aria-hidden="true">
                <div className="aurora-layer layer-1" />
                <div className="aurora-layer layer-2" />
                <div className="aurora-layer layer-3" />
            </div>
            <div className="w-full max-w-7xl relative z-10">
                <header className="text-center mb-8 relative no-print glass-panel rounded-3xl px-6 py-6">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold aurora-title">Matrix Master</h1>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mt-2">A Comprehensive Linear Algebra Calculator</p>
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button onClick={() => setHistoryOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open history"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-100/80" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 00-7.938 7H1a1 1 0 000 2h3a1 1 0 001-1V7a1 1 0 10-2 0v.057A6 6 0 1110 16a1 1 0 100 2A8 8 0 1010 2z" /><path d="M10 5a1 1 0 011 1v3.382l2.447 1.224a1 1 0 11-.894 1.788l-3-1.5A1 1 0 019 11V6a1 1 0 011-1z" /></svg></button>
                        <button onClick={() => setExportModalOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Export or import"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-100/80" viewBox="0 0 20 20" fill="currentColor"><path d="M3 14a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1zM13 5V3a1 1 0 112 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0V7h-2a1 1 0 110-2h2z" /><path d="M3 6a2 2 0 012-2h3a1 1 0 110 2H5v8h10v-3a1 1 0 112 0v3a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /></svg></button>
                        <button onClick={() => setCompareModalOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Compare matrices"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-100/80" viewBox="0 0 20 20" fill="currentColor"><path d="M4 5a2 2 0 012-2h2a1 1 0 110 2H6v10h2a1 1 0 110 2H6a2 2 0 01-2-2V5z" /><path d="M16 5a2 2 0 00-2-2h-2a1 1 0 100 2h2v10h-2a1 1 0 100 2h2a2 2 0 002-2V5z" /><path d="M7 10a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg></button>
                        <button onClick={() => setReportOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Print report"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-100/80" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6z" /><path fillRule="evenodd" d="M4 9a2 2 0 00-2 2v3a2 2 0 002 2h2v-2H4v-3h12v3h-2v2h2a2 2 0 002-2v-3a2 2 0 00-2-2H4z" clipRule="evenodd" /><path d="M6 12h8v6H6v-6z" /></svg></button>
                        <button onClick={() => setToolsOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open tools"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-100/80" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046a1 1 0 00-1.2.49l-.902 1.61a6.946 6.946 0 00-1.643.95l-1.8-.6a1 1 0 00-1.182.47l-1.2 2.078a1 1 0 00.272 1.272l1.477 1.134a7.01 7.01 0 000 1.9l-1.477 1.134a1 1 0 00-.272 1.272l1.2 2.078a1 1 0 001.182.47l1.8-.6c.508.39 1.058.715 1.643.95l.902 1.61a1 1 0 001.2.49l2.4-.8a1 1 0 00.68-1.02l-.16-1.94a7.04 7.04 0 001.32-1.32l1.94.16a1 1 0 001.02-.68l.8-2.4a1 1 0 00-.49-1.2l-1.61-.902a6.946 6.946 0 00-.95-1.643l.6-1.8a1 1 0 00-.47-1.182l-2.078-1.2a1 1 0 00-1.272.272l-1.134 1.477a7.01 7.01 0 00-1.9 0L12.3 1.318a1 1 0 00-1-0.272zM10 7a3 3 0 110 6 3 3 0 010-6z" /></svg></button>
                        <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-full glass-btn" aria-label="Open settings"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700 dark:text-slate-100/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    </div>
                </header>

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

                        {error && <div className="mt-6 p-4 bg-red-400/20 dark:bg-red-900/50 border border-red-500/30 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg"><p className="font-bold">Error:</p><p>{error}</p></div>}
                        {isLoading && <div className="flex justify-center items-center mt-8"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div></div>}
                    </div>
                    {results && <div className="mt-8 print-area"><ResultsDisplay key={resultsKey} results={results} appMode={appMode} originalMatrix={originalMatrix} analysisMatrix={analysisMatrix as ValidMatrix} tutorMode={tutorMode} numberFormat={numberFormat} variableAssumptions={variableAssumptions} openSections={openSections} onToggleSection={toggleSection} onRequestDetails={handleRequestDetails} onUseResult={handleUseResult} loadingDetails={loadingDetails} onExplain={handleRequestExplanation} onInfo={openInfo} /></div>}
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
            <Modal title="Save Matrix to Library" isOpen={isSaveModalOpen} onClose={() => setSaveModalOpen(false)}>
                <form onSubmit={(e) => { e.preventDefault(); handleSaveToLibrary(e.currentTarget.matrixName.value, e.currentTarget.folderName.value, e.currentTarget.tags.value); }} className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Store matrices with folders and tags.</span>
                        <InfoButton infoKey="library" />
                    </div>
                    <label className="block"><span className="text-gray-700 dark:text-gray-300">Matrix Name:</span>
                        <input name="matrixName" type="text" required className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-slate-800 dark:text-white" placeholder="e.g. Homework 5, Q1"/>
                    </label>
                    <label className="block"><span className="text-gray-700 dark:text-gray-300">Folder (optional):</span>
                        <input name="folderName" type="text" className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-slate-800 dark:text-white" placeholder="e.g. Linear Algebra"/>
                    </label>
                    <label className="block"><span className="text-gray-700 dark:text-gray-300">Tags (comma-separated):</span>
                        <input name="tags" type="text" className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-slate-800 dark:text-white" placeholder="e.g. homework, exam, practice"/>
                    </label>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setSaveModalOpen(false)} className="py-2 px-4 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button><button type="submit" style={{backgroundColor: 'var(--button-bg)'}} className="py-2 px-4 rounded-lg text-white hover:opacity-90">Save</button></div>
                </form>
            </Modal>
            <Modal title="Load Matrix from Library" isOpen={isLoadModalOpen} onClose={() => setLoadModalOpen(false)}>
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Search by name, folder, or tag.</span>
                        <InfoButton infoKey="library" />
                    </div>
                    <div className="flex gap-2">
                        <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search by name, folder, or tag..." className="flex-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        <select value={libraryFolderFilter} onChange={e => setLibraryFolderFilter(e.target.value)} className="rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            <option value="all">All Folders</option>
                            {libraryFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {filteredLibrary.length > 0 ? filteredLibrary.map(sm => (
                            <div key={sm.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                <div className="min-w-0">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{sm.name} ({sm.rows}x{sm.cols})</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">{sm.folder || 'Unsorted'}{sm.tags?.length ? ` • ${sm.tags.join(', ')}` : ''}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleDeleteFromLibrary(sm.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label={`Delete ${sm.name}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => handleLoadFromLibrary(sm)} style={{backgroundColor: 'var(--button-bg)'}} className="py-1 px-3 rounded-lg text-white text-sm hover:opacity-90">Load</button>
                                </div>
                            </div>
                        )) : <p className="text-gray-500 dark:text-slate-400">No matches found.</p>}
                    </div>
                </div>
            </Modal>
            <Modal title="Use Result As..." isOpen={useResultModal.open} onClose={() => setUseResultModal({ open: false, matrix: null })}>
                <div className="space-y-3">
                    <p className="text-gray-600 dark:text-slate-400">Where would you like to send the resulting matrix?</p>
                    <button onClick={() => handleSetMatrixFromUsedResult('solver')} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">System Solver Matrix</button>
                    <button onClick={() => handleSetMatrixFromUsedResult('analysis')} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">Analysis Matrix</button>
                    <p className="text-sm text-gray-500 dark:text-slate-400 pt-2">Or, use in a new matrix operation:</p>
                    <div className="flex flex-wrap gap-2">{['C', 'D', 'E', 'F'].filter(n => !matrixNamesInExpression.includes(n)).map(name => <button key={name} onClick={() => handleSetMatrixFromUsedResult(name)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Use as Matrix {name}</button>)}</div>
                </div>
            </Modal>
            <Modal title="Export / Import" isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)}>
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Export matrices, app state, and clipboard formats.</span>
                        <InfoButton infoKey="exportImport" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Export Matrix</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <select value={exportMatrixKey} onChange={e => setExportMatrixKey(e.target.value)} className="w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={() => { try { exportMatrixAsCsv(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-sm">Export CSV</button>
                            <button onClick={() => { try { exportMatrixAsLatex(exportMatrixKey); } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); } }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-sm">Export LaTeX</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Copy to Clipboard</h3>
                            <InfoButton infoKey="clipboard" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select value={clipboardTarget} onChange={e => setClipboardTarget(e.target.value)} className="w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                            <select value={clipboardFormat} onChange={e => setClipboardFormat(e.target.value as 'csv' | 'latex' | 'json')} className="w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                <option value="csv">CSV</option>
                                <option value="latex">LaTeX</option>
                                <option value="json">JSON</option>
                            </select>
                        </div>
                        <button onClick={async () => { try { await copyMatrixToClipboard(); } catch (e) { setError(e instanceof Error ? e.message : 'Copy failed.'); } }} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Copy</button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Export App State</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => exportStateAsJson(false)} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-sm">Export JSON</button>
                            <button onClick={() => exportStateAsJson(true)} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Share File</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Import</h3>
                            <InfoButton infoKey="exportImport" />
                        </div>
                        <select value={importMatrixKey} onChange={e => setImportMatrixKey(e.target.value)} className="w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {getMatrixOptions().filter(opt => opt.key !== 'result').map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                        <input type="file" accept=".json,.mmatrix,.csv,.tsv,.tex" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await handleImportFile(file); setExportModalOpen(false); } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); } finally { e.currentTarget.value = ''; } }} className="block w-full text-sm text-gray-600 dark:text-gray-300" />
                        <p className="text-xs text-gray-500 dark:text-slate-400">CSV/TSV/LaTeX imports into the selected matrix target. JSON/mmatrix restores full app state.</p>
                    </div>
                </div>
            </Modal>
            <Modal title="Tools" isOpen={isToolsOpen} onClose={() => setToolsOpen(false)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setPresetsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Matrix Presets</button>
                        <InfoButton infoKey="presets" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSparseOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Sparse View (CSR/CSC)</button>
                        <InfoButton infoKey="sparse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setBatchOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Batch Runner</button>
                        <InfoButton infoKey="batch" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setRecipesOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Matrix Recipes</button>
                        <InfoButton infoKey="recipes" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setAssumptionsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Variable Assumptions</button>
                        <InfoButton infoKey="assumptions" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setProfilesOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Workspace Profiles</button>
                        <InfoButton infoKey="profiles" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setHelpOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Offline Help Pack</button>
                        <InfoButton infoKey="help" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setDocsOpen(true); setToolsOpen(false); }} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Documentation</button>
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
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Generate common matrices and apply them to a target.</span>
                        <InfoButton infoKey="presets" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300">Target Matrix</label>
                        <select value={presetTarget} onChange={e => setPresetTarget(e.target.value)} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                            {getMatrixOptions().filter(opt => opt.key !== 'result').map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Preset Type
                            <select value={presetType} onChange={e => setPresetType(e.target.value as typeof presetType)} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                                <option value="identity">Identity</option>
                                <option value="permutation">Permutation</option>
                                <option value="jordan">Jordan Block</option>
                                <option value="hilbert">Hilbert</option>
                                <option value="spd">Random SPD</option>
                            </select>
                        </label>
                        <label className="text-sm text-gray-600 dark:text-gray-300">Eigenvalue (Jordan)
                            <input type="number" value={presetJordanEigen} onChange={e => setPresetJordanEigen(parseInt(e.target.value) || 1)} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Rows
                            <input type="number" min="1" value={presetRows} onChange={e => { const v = Math.max(1, parseInt(e.target.value) || 1); setPresetRows(v); if (['identity','permutation','jordan','hilbert','spd'].includes(presetType)) setPresetCols(v); }} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        </label>
                        <label className="text-sm text-gray-600 dark:text-gray-300">Cols
                            <input type="number" min="1" value={presetCols} onChange={e => setPresetCols(Math.max(1, parseInt(e.target.value) || 1))} disabled={['identity','permutation','jordan','hilbert','spd'].includes(presetType)} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white disabled:opacity-60" />
                        </label>
                    </div>
                    <button onClick={handleApplyPreset} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Apply Preset</button>
                </div>
            </Modal>
            <Modal title="Sparse Matrix View" isOpen={isSparseOpen} onClose={() => setSparseOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Inspect CSR/CSC arrays and a sparsity heatmap.</span>
                        <InfoButton infoKey="sparse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Matrix</label>
                            <select value={sparseTarget} onChange={e => setSparseTarget(e.target.value)} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Format</label>
                            <select value={sparseFormat} onChange={e => setSparseFormat(e.target.value as 'csr' | 'csc')} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                                <option value="csr">CSR</option>
                                <option value="csc">CSC</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Zero Threshold</label>
                            <input type="number" value={sparseEpsilon} onChange={e => setSparseEpsilon(Number(e.target.value) || 0)} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        </div>
                    </div>
                    {(() => {
                        const matrix = resolveMatrixByKey(sparseTarget);
                        if (!matrix) return <p className="text-sm text-gray-500 dark:text-slate-400">Select a matrix to inspect.</p>;
                        const rows = matrix.length;
                        const cols = matrix[0]?.length || 0;
                        const nonZeros = matrix.flat().filter(cell => !isZeroCell(cell, sparseEpsilon)).length;
                        const density = rows * cols > 0 ? (nonZeros / (rows * cols)) : 0;
                        const csr = buildSparseCSR(matrix, sparseEpsilon);
                        const csc = buildSparseCSC(matrix, sparseEpsilon);
                        const data = sparseFormat === 'csr' ? csr : csc;
                        return (
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600 dark:text-gray-300">Non-zeros: {nonZeros} · Density: {(density * 100).toFixed(2)}%</div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Sparsity Heatmap</div>
                                    {renderSparsityHeatmap(matrix, sparseEpsilon)}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                        <div className="font-semibold mb-1">Values</div>
                                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data.values)}</pre>
                                    </div>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                        <div className="font-semibold mb-1">{sparseFormat === 'csr' ? 'Column Index' : 'Row Index'}</div>
                                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sparseFormat === 'csr' ? csr.colIndex : csc.rowIndex)}</pre>
                                    </div>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded sm:col-span-2">
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
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Run the same analysis or expression across saved matrices.</span>
                        <InfoButton infoKey="batch" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Mode
                            <select value={batchMode} onChange={e => setBatchMode(e.target.value as 'analysis' | 'expression')} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                                <option value="analysis">Analysis (uses current analysis settings)</option>
                                <option value="expression">Matrix Operation (A-only)</option>
                            </select>
                        </label>
                        {batchMode === 'expression' && (
                            <label className="text-sm text-gray-600 dark:text-gray-300">Expression
                                <input value={batchExpression} onChange={e => setBatchExpression(e.target.value.toUpperCase())} className="mt-1 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                            </label>
                        )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {library.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">No matrices saved in the library.</p>}
                        {library.map(item => (
                            <label key={item.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
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
                        <button onClick={exportBatchReport} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Export JSON</button>
                        <button onClick={() => triggerPrint('batch')} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Print</button>
                    </div>
                    {batchResults.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {batchResults.map(item => (
                                <div key={item.id} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-sm">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                                    {item.error && <div className="text-red-500">{item.error}</div>}
                                    {item.result && 'kind' in item.result && item.result.kind === 'analysis' && (
                                        <div className="text-xs text-slate-600 dark:text-slate-300">Rank: {item.result.rank}</div>
                                    )}
                                    {item.result && 'finalResult' in item.result && (
                                        <div className="text-xs text-slate-600 dark:text-slate-300">Operation result available</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal title="Matrix Recipes" isOpen={isRecipesOpen} onClose={() => setRecipesOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Save operation sequences as reusable macros.</span>
                        <InfoButton infoKey="recipes" />
                    </div>
                    <div className="flex gap-2">
                        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Recipe name" className="flex-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        <button onClick={() => { handleSaveRecipe(recipeName); setRecipeName(''); }} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Save</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recipes.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">No recipes saved yet.</p>}
                        {recipes.map(recipe => (
                            <div key={recipe.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                <div className="min-w-0">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{recipe.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{recipe.expression}</div>
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
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Set symbolic constraints that flow into steps and reports.</span>
                        <InfoButton infoKey="assumptions" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <input value={assumptionVar} onChange={e => setAssumptionVar(e.target.value)} placeholder="Variable (e.g., a)" className="rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        <select value={assumptionConstraint} onChange={e => setAssumptionConstraint(e.target.value as VariableAssumption['constraint'])} className="rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white">
                            <option value="nonzero">nonzero</option>
                            <option value="positive">positive</option>
                            <option value="negative">negative</option>
                            <option value="integer">integer</option>
                        </select>
                        <button onClick={handleAddAssumption} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Add</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {variableAssumptions.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">No assumptions set.</p>}
                        {variableAssumptions.map((assumption, idx) => (
                            <div key={`${assumption.variable}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                <div className="text-sm text-slate-700 dark:text-slate-200">{assumption.variable} is {assumption.constraint}</div>
                                <button onClick={() => handleRemoveAssumption(idx)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Workspace Profiles" isOpen={isProfilesOpen} onClose={() => setProfilesOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Profiles keep libraries, history, and settings isolated.</span>
                        <InfoButton infoKey="profiles" />
                    </div>
                    <div className="flex gap-2">
                        <input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="New profile name" className="flex-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white" />
                        <button onClick={handleCreateProfile} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Create</button>
                    </div>
                    <div className="space-y-2">
                        {profiles.map(profile => (
                            <div key={profile.id} className={`flex items-center justify-between p-2 rounded-lg border ${activeProfile === profile.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50'}`}>
                                <div className="font-medium text-slate-800 dark:text-slate-200">{profile.name}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSwitchProfile(profile.id)} className="py-1 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-xs">Switch</button>
                                    <button onClick={() => handleDeleteProfile(profile.id)} className="py-1 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal title="Offline Help Pack" isOpen={isHelpOpen} onClose={() => setHelpOpen(false)}>
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        <span>Local quick start and examples.</span>
                        <InfoButton infoKey="help" />
                    </div>
                    <h3 className="font-semibold text-lg">Quick Start</h3>
                    <p>Use the System Solver to reduce augmented matrices, the Matrix Operations tab for algebraic expressions, or Analysis for decompositions.</p>
                    <h3 className="font-semibold text-lg">Example Matrices</h3>
                    <div className="space-y-2">
                        <button onClick={() => { const m = generatePresetMatrix('identity', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Load 3x3 Identity (Analysis)</button>
                        <button onClick={() => { const m = generatePresetMatrix('hilbert', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Load 3x3 Hilbert (Analysis)</button>
                        <button onClick={() => { const m = generatePresetMatrix('spd', 3, 3); applyMatrixToTarget(m, 'analysis'); }} className="py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Load Random SPD (Analysis)</button>
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
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Full manual with a printable PDF.</span>
                        <InfoButton infoKey="documentation" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <DocumentationView className="doc-screen" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => triggerPrint('docs')} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Print / Save PDF</button>
                        <button onClick={() => setDocsOpen(false)} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Close</button>
                    </div>
                </div>
            </Modal>
            <Modal title="Print / PDF Report" isOpen={isReportOpen} onClose={() => setReportOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Generate a styled PDF report offline.</span>
                        <InfoButton infoKey="report" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Use your browser's Print dialog to save as PDF. The report will include cover and TOC based on your report settings.</p>
                    <div className="flex gap-2">
                        <button onClick={() => triggerPrint('report')} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Print / Save PDF</button>
                        <button onClick={() => setReportOpen(false)} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Close</button>
                    </div>
                </div>
            </Modal>
            <Modal title="Compare Matrices" isOpen={isCompareModalOpen} onClose={() => setCompareModalOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Highlight differences between two matrices.</span>
                        <InfoButton infoKey="compare" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Left Matrix</label>
                            <select value={compareLeftKey} onChange={e => setCompareLeftKey(e.target.value)} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Right Matrix</label>
                            <select value={compareRightKey} onChange={e => setCompareRightKey(e.target.value)} className="w-full mt-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                                {getMatrixOptions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {(() => {
                        const left = resolveMatrixByKey(compareLeftKey);
                        const right = resolveMatrixByKey(compareRightKey);
                        if (!left || !right) {
                            return <p className="text-sm text-gray-500 dark:text-slate-400">Select two matrices to compare.</p>;
                        }
                        if ((left[0]?.length || 0) !== (right[0]?.length || 0) || left.length !== right.length) {
                            return <p className="text-sm text-yellow-600 dark:text-yellow-400">Matrices have different dimensions. Comparison is still shown, but unmatched cells are highlighted.</p>;
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
                                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Left</h4>
                                    {renderMatrixPreview(left, diff)}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Right</h4>
                                    {renderMatrixPreview(right, diff)}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </Modal>
            <Modal title="History & Snapshots" isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <span>Undo/redo with named snapshots.</span>
                        <InfoButton infoKey="history" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                        <span>Cached determinant and inverse results appear in snapshots.</span>
                        <InfoButton infoKey="determinantCache" className="w-4 h-4 text-[10px]" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleUndoSnapshot} disabled={historyIndex <= 0} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-sm disabled:opacity-50">Undo</button>
                        <button onClick={handleRedoSnapshot} disabled={historyIndex >= history.length - 1} className="flex-1 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-sm disabled:opacity-50">Redo</button>
                    </div>
                    <div className="flex gap-2">
                        <input value={snapshotName} onChange={e => setSnapshotName(e.target.value)} placeholder="Snapshot name" className="flex-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        <button onClick={() => createSnapshot(snapshotName)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Save</button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input type="checkbox" checked={autoSnapshotOnCalculate} onChange={e => setAutoSnapshotOnCalculate(e.target.checked)} />
                        Auto-snapshot on calculate
                    </label>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400">No snapshots yet. Save one to get started.</p>
                        ) : history.map((snap, index) => {
                            const cached = getSnapshotCacheSummary(snap);
                            const detValue = cached?.determinant ? stringifySymbolicFraction(cached.determinant.value) : null;
                            const inverseLabel = cached?.inverse ? (cached.inverse.exists ? 'Inverse: yes' : 'Inverse: no') : null;
                            return (
                                <div key={snap.id} className={`flex items-center justify-between p-2 rounded-lg border ${index === historyIndex ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50'}`}>
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{snap.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">{new Date(snap.createdAt).toLocaleString()}</div>
                                        {(detValue || inverseLabel) && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {detValue ? `det(A)=${detValue}` : ''}{detValue && inverseLabel ? ' · ' : ''}{inverseLabel || ''}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => applySnapshotAtIndex(index)} className="py-1 px-3 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-xs">Load</button>
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
                    <div><label className="font-medium text-gray-700 dark:text-gray-300">Theme</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setTheme('light')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'light' ? 'tab active' : ''}`}>Light</button><button onClick={() => setTheme('dark')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'dark' ? 'tab active' : ''}`}>Dark</button><button onClick={() => setTheme('custom')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${theme === 'custom' ? 'tab active' : ''}`}>Custom</button></div></div>
                    {theme === 'custom' && (
                        <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg space-y-3">
                            <h3 className="font-semibold text-lg" style={{color: 'var(--primary-text-color)'}}>Customize Colors</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {Object.entries(customThemeColors).map(([key, value]) => (
                                    <label key={key} className="flex items-center justify-between text-sm">
                                        <span className="capitalize text-gray-600 dark:text-slate-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <input type="color" value={value} onChange={e => setCustomThemeColors(c => ({ ...c, [key]: e.target.value }))} className="w-8 h-8 p-0 border-0 rounded bg-transparent" />
                                    </label>
                                ))}
                            </div>
                            <button onClick={() => setCustomThemeColors(defaultCustomColors)} className="text-sm w-full mt-2 py-2 px-4 rounded-lg bg-slate-500 text-white hover:bg-slate-600">Reset to Defaults</button>
                        </div>
                    )}
                    <div><label className="font-medium text-gray-700 dark:text-gray-300">Display Density</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setDensity('comfortable')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${density === 'comfortable' ? 'tab active' : ''}`}>Comfortable</button><button onClick={() => setDensity('compact')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${density === 'compact' ? 'tab active' : ''}`}>Compact</button></div></div>
                    <div><label className="font-medium text-gray-700 dark:text-gray-300">Font Size</label><div className="flex glass-panel rounded-2xl p-1 mt-1"><button onClick={() => setFontSize('small')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'small' ? 'tab active' : ''}`}>Small</button><button onClick={() => setFontSize('medium')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'medium' ? 'tab active' : ''}`}>Medium</button><button onClick={() => setFontSize('large')} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${fontSize === 'large' ? 'tab active' : ''}`}>Large</button></div></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Tutor Mode</label>
                            <InfoButton infoKey="tutorMode" />
                        </div>
                        <div className="flex glass-panel rounded-2xl p-1 mt-1">
                            <button onClick={() => setTutorMode(true)} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${tutorMode ? 'tab active' : ''}`}>On</button>
                            <button onClick={() => setTutorMode(false)} className={`flex-1 py-1 rounded-xl text-sm glass-tab ${!tutorMode ? 'tab active' : ''}`}>Off</button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Number Formatting</label>
                            <InfoButton infoKey="numberFormat" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="text-sm text-gray-600 dark:text-gray-300">Digits
                                <input type="number" min="1" max="12" value={numberFormat.digits ?? 6} onChange={e => setNumberFormat(prev => ({ ...prev, digits: Math.max(1, Math.min(12, parseInt(e.target.value) || 6)) }))} className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-800 dark:text-white" />
                            </label>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Mode
                                <select value={numberFormat.mode ?? 'fixed'} onChange={e => setNumberFormat(prev => ({ ...prev, mode: e.target.value as NumberFormatOptions['mode'] }))} className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-800 dark:text-white">
                                    <option value="fixed">Fixed</option>
                                    <option value="scientific">Scientific</option>
                                    <option value="fraction">Fractionize</option>
                                </select>
                            </label>
                            <label className="text-sm text-gray-600 dark:text-gray-300">Max Denominator
                                <input type="number" min="2" max="10000" value={numberFormat.fractionMaxDenominator ?? 1000} onChange={e => setNumberFormat(prev => ({ ...prev, fractionMaxDenominator: Math.max(2, Math.min(10000, parseInt(e.target.value) || 1000)) }))} className="mt-1 block w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-800 dark:text-white" />
                            </label>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-gray-700 dark:text-gray-300">Report Options</label>
                            <InfoButton infoKey="report" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
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
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p>{infoState.key ? INFO_CONTENT[infoState.key].summary : ''}</p>
                    <button onClick={() => { closeInfo(); setDocsOpen(true); }} className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">Open Full Documentation</button>
                </div>
            </Modal>
            <Modal title={`What is ${explainerState.topic}?`} isOpen={explainerState.isOpen} onClose={() => setExplainerState({ isOpen: false, topic: '', content: '' })}>
                <div className="text-left space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-gray-700 dark:text-gray-300">
                    {renderExplanationContent(explainerState.content)}
                </div>
            </Modal>
        </div>
    );
};

export default App;
