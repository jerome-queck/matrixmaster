import type { AnalyzeToolDescriptor } from '../analyze/contracts';
import type { AdvancedToolDescriptor, AdvancedToolRouteContract } from './contracts';
import { buildAdvancedRouteIndex } from './contracts';

export const ADVANCED_TOOL_ROUTES: AdvancedToolRouteContract[] = [
    {
        id: 'decompositions',
        path: '/analyze/advanced/decompositions',
        label: 'Decompositions',
        description: 'Hardened LU/QR/SVD/eigen workflows with diagnostics.',
        analyzeCategory: 'matrix-properties',
        order: 10,
        toolIds: ['lu-workflow', 'qr-workflow', 'svd-workflow', 'eigen-workflow']
    },
    {
        id: 'eigen-canonical',
        path: '/analyze/advanced/eigen-canonical',
        label: 'Eigen Workflows',
        description: 'Eigenspaces, multiplicities, diagonalization, and fast powers.',
        analyzeCategory: 'eigen-canonical',
        order: 20,
        toolIds: ['eigenspace-analysis', 'eigen-multiplicity-summary', 'diagonalization-analysis', 'fast-matrix-power']
    },
    {
        id: 'canonical-forms',
        path: '/analyze/advanced/canonical-forms',
        label: 'Canonical Forms',
        description: 'Minimal polynomial and Jordan canonical form navigation.',
        analyzeCategory: 'eigen-canonical',
        order: 25,
        toolIds: ['minimal-polynomial', 'jordan-canonical-approx']
    },
    {
        id: 'orthogonality-least-squares',
        path: '/analyze/advanced/orthogonality',
        label: 'Orthogonality and Least Squares',
        description: 'Orthonormal workflows, projections, and least-squares diagnostics.',
        analyzeCategory: 'orthogonality-least-squares',
        order: 30,
        toolIds: ['gram-schmidt', 'projection-subspace', 'least-squares-diagnostics']
    },
    {
        id: 'iterative-sparse',
        path: '/analyze/advanced/iterative',
        label: 'Iterative and Sparse',
        description: 'Re-homed iterative solver tools for desktop advanced mode.',
        analyzeCategory: 'advanced-desktop-extras',
        order: 40,
        desktopOnly: true,
        toolIds: ['jacobi-iterative', 'gauss-seidel-iterative', 'conjugate-gradient-iterative', 'gmres-iterative']
    },
    {
        id: 'matrix-functions',
        path: '/analyze/advanced/matrix-functions',
        label: 'Matrix Functions',
        description: 'Roadmap-level matrix function extras using eigen workflows.',
        analyzeCategory: 'advanced-desktop-extras',
        order: 50,
        desktopOnly: true,
        toolIds: ['matrix-exponential', 'matrix-logarithm', 'matrix-square-root']
    }
];

export const ADVANCED_TOOL_DESCRIPTORS: AdvancedToolDescriptor[] = [
    {
        id: 'lu-workflow',
        title: 'LU Decomposition',
        summary: 'Factor with P, L, U plus determinant and growth diagnostics.',
        routeId: 'decompositions',
        analyzeCategory: 'matrix-properties',
        keywords: ['lu', 'plu', 'determinant', 'pivoting'],
        stability: 'stable',
        runner: 'runLUWorkflow'
    },
    {
        id: 'qr-workflow',
        title: 'QR Decomposition',
        summary: 'Factor with orthogonality/reconstruction diagnostics.',
        routeId: 'decompositions',
        analyzeCategory: 'matrix-properties',
        keywords: ['qr', 'orthogonal factorization', 'householder', 'gram schmidt'],
        stability: 'stable',
        runner: 'runQRWorkflow'
    },
    {
        id: 'svd-workflow',
        title: 'Singular Value Decomposition',
        summary: 'Compute U,S,Vt with rank and condition metrics.',
        routeId: 'decompositions',
        analyzeCategory: 'matrix-properties',
        keywords: ['svd', 'singular values', 'condition number', 'rank'],
        stability: 'stable',
        runner: 'runSVDWorkflow'
    },
    {
        id: 'eigen-workflow',
        title: 'Eigen Analysis',
        summary: 'Eigenvalue/eigenvector solve with convergence diagnostics.',
        routeId: 'decompositions',
        analyzeCategory: 'eigen-canonical',
        keywords: ['eigenvalue', 'eigenvector', 'spectral analysis'],
        stability: 'stable',
        runner: 'runEigenWorkflow'
    },
    {
        id: 'eigenspace-analysis',
        title: 'Eigenspaces',
        summary: 'Compute eigenspace bases and geometric multiplicities.',
        routeId: 'eigen-canonical',
        analyzeCategory: 'eigen-canonical',
        keywords: ['eigenspace', 'null space', 'geometric multiplicity'],
        stability: 'stable',
        runner: 'computeEigenspace'
    },
    {
        id: 'eigen-multiplicity-summary',
        title: 'Multiplicity Summary',
        summary: 'Summarize algebraic vs geometric multiplicities.',
        routeId: 'eigen-canonical',
        analyzeCategory: 'eigen-canonical',
        keywords: ['algebraic multiplicity', 'geometric multiplicity', 'diagonalizable'],
        stability: 'stable',
        runner: 'summarizeEigenMultiplicities'
    },
    {
        id: 'diagonalization-analysis',
        title: 'Diagonalization',
        summary: 'Assess diagonalizability and produce P,D,P^-1 when available.',
        routeId: 'eigen-canonical',
        analyzeCategory: 'eigen-canonical',
        keywords: ['diagonalization', 'similarity transform', 'PDP^-1'],
        stability: 'stable',
        runner: 'analyzeDiagonalization'
    },
    {
        id: 'fast-matrix-power',
        title: 'Fast Matrix Powers',
        summary: 'Use diagonalization or repeated squaring for A^k.',
        routeId: 'eigen-canonical',
        analyzeCategory: 'eigen-canonical',
        keywords: ['matrix powers', 'fast exponentiation', 'diagonalization'],
        stability: 'stable',
        runner: 'fastMatrixPower'
    },
    {
        id: 'minimal-polynomial',
        title: 'Minimal Polynomial',
        summary: 'Compute monic minimal polynomial with residual verification.',
        routeId: 'canonical-forms',
        analyzeCategory: 'eigen-canonical',
        keywords: ['minimal polynomial', 'annihilating polynomial', 'canonical form'],
        stability: 'preview',
        runner: 'computeMinimalPolynomial'
    },
    {
        id: 'jordan-canonical-approx',
        title: 'Jordan Form (Approx)',
        summary: 'Approximate Jordan blocks using multiplicity and rank chains.',
        routeId: 'canonical-forms',
        analyzeCategory: 'eigen-canonical',
        keywords: ['jordan form', 'jordan blocks', 'canonical forms'],
        stability: 'preview',
        runner: 'computeJordanCanonicalApprox'
    },
    {
        id: 'jacobi-iterative',
        title: 'Jacobi Iteration',
        summary: 'Iterative linear solve with residual history and convergence status.',
        routeId: 'iterative-sparse',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['jacobi', 'iterative solver', 'sparse'],
        stability: 'stable',
        runner: 'runJacobiWorkflow'
    },
    {
        id: 'gauss-seidel-iterative',
        title: 'Gauss-Seidel Iteration',
        summary: 'Iterative linear solve with residual history and diagnostics.',
        routeId: 'iterative-sparse',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['gauss-seidel', 'iterative solver', 'sparse'],
        stability: 'stable',
        runner: 'runGaussSeidelWorkflow'
    },
    {
        id: 'conjugate-gradient-iterative',
        title: 'Conjugate Gradient',
        summary: 'SPD-oriented iterative solver with convergence diagnostics.',
        routeId: 'iterative-sparse',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['conjugate gradient', 'iterative solver', 'spd'],
        stability: 'stable',
        runner: 'runConjugateGradientWorkflow'
    },
    {
        id: 'gmres-iterative',
        title: 'GMRES',
        summary: 'General Krylov iterative solver with residual tracking.',
        routeId: 'iterative-sparse',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['gmres', 'krylov', 'iterative solver'],
        stability: 'stable',
        runner: 'runGMRESWorkflow'
    },
    {
        id: 'matrix-exponential',
        title: 'Matrix Exponential',
        summary: 'Evaluate exp(A) via spectral decomposition where feasible.',
        routeId: 'matrix-functions',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['matrix exponential', 'exp(A)', 'matrix functions'],
        stability: 'preview',
        runner: 'numericMatrixExp'
    },
    {
        id: 'matrix-logarithm',
        title: 'Matrix Logarithm',
        summary: 'Evaluate log(A) for admissible spectra.',
        routeId: 'matrix-functions',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['matrix logarithm', 'log(A)', 'matrix functions'],
        stability: 'preview',
        runner: 'numericMatrixLog'
    },
    {
        id: 'matrix-square-root',
        title: 'Matrix Square Root',
        summary: 'Evaluate A^(1/2) for admissible spectra.',
        routeId: 'matrix-functions',
        analyzeCategory: 'advanced-desktop-extras',
        keywords: ['matrix square root', 'sqrt(A)', 'matrix functions'],
        stability: 'preview',
        runner: 'numericMatrixSqrt'
    }
];

export const ADVANCED_ROUTE_INDEX = buildAdvancedRouteIndex(ADVANCED_TOOL_ROUTES);

const routeForTool = (routeId: AdvancedToolDescriptor['routeId']): string =>
    ADVANCED_ROUTE_INDEX[routeId]?.path ?? '/analyze/advanced';

export const advancedToolsAsAnalyzeDescriptors = (): AnalyzeToolDescriptor[] =>
    ADVANCED_TOOL_DESCRIPTORS.map((tool) => ({
        id: tool.id,
        title: tool.title,
        summary: tool.summary,
        category: tool.analyzeCategory,
        route: routeForTool(tool.routeId),
        keywords: tool.keywords,
        source: 'advanced',
        stability: tool.stability
    }));

export const CANONICAL_FORMS_NAVIGATION = [
    'eigen-workflow',
    'eigenspace-analysis',
    'eigen-multiplicity-summary',
    'diagonalization-analysis',
    'minimal-polynomial',
    'jordan-canonical-approx',
    'fast-matrix-power'
] as const;

export const getCanonicalFormsNavigation = (): AdvancedToolDescriptor[] => {
    const index = Object.fromEntries(ADVANCED_TOOL_DESCRIPTORS.map((tool) => [tool.id, tool]));
    return CANONICAL_FORMS_NAVIGATION
        .map((id) => index[id])
        .filter((tool): tool is AdvancedToolDescriptor => Boolean(tool));
};
