import {
    analyzeInnerProduct,
    analyzeOrthogonality,
    analyzeVectorDistance,
    analyzeVectorNorm,
    computeOrthogonalComplementWorkflow,
    projectOntoSubspaceWorkflow,
    projectOntoVectorWorkflow,
    runGramSchmidtWorkflow,
    solveLeastSquaresWorkflow
} from '../../engines/numeric/orthogonality';
import type { AnalyzeToolDescriptor } from '../analyze/contracts';

export type OrthogonalityWorkflowId =
    | 'inner-product'
    | 'vector-norm'
    | 'vector-distance'
    | 'orthogonality-check'
    | 'gram-schmidt'
    | 'projection-vector'
    | 'projection-subspace'
    | 'orthogonal-complement'
    | 'least-squares-diagnostics';

export const ORTHOGONALITY_TOOL_DESCRIPTORS: AnalyzeToolDescriptor[] = [
    {
        id: 'inner-product',
        title: 'Inner Product',
        summary: 'Compute Euclidean or weighted inner products with orthogonality signal.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/inner-product',
        keywords: ['dot product', 'inner product', 'weighted metric', 'orthogonality'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'vector-norm',
        title: 'Vector Norms',
        summary: 'Compute 1/2/inf norms for vectors, including metric-aware 2-norm.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/vector-norm',
        keywords: ['norm', 'length', 'magnitude', 'vector norm'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'vector-distance',
        title: 'Vector Distance',
        summary: 'Compute distances between vectors under the selected inner-product metric.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/vector-distance',
        keywords: ['distance', 'metric distance', 'vector separation'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'orthogonality-check',
        title: 'Orthogonality Check',
        summary: 'Test if vectors are orthogonal at a configurable numeric tolerance.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/check',
        keywords: ['orthogonal', 'perpendicular', 'dot product test'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'gram-schmidt',
        title: 'Gram-Schmidt Basis',
        summary: 'Build orthogonal and orthonormal bases with dependency diagnostics.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/gram-schmidt',
        keywords: ['gram-schmidt', 'orthonormal basis', 'linear dependence', 'basis'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'projection-vector',
        title: 'Projection Onto Vector',
        summary: 'Compute vector projection and rejection onto a target direction.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/projection-vector',
        keywords: ['projection', 'rejection', 'component'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'projection-subspace',
        title: 'Projection Onto Subspace',
        summary: 'Project onto a span using an orthonormalized basis with coefficients.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/projection-subspace',
        keywords: ['projection', 'subspace', 'span', 'orthonormal basis'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'orthogonal-complement',
        title: 'Orthogonal Complement',
        summary: 'Compute a basis for W^perp via null-space construction.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/orthogonal-complement',
        keywords: ['orthogonal complement', 'null space', 'subspace'],
        source: 'orthogonality',
        stability: 'stable'
    },
    {
        id: 'least-squares-diagnostics',
        title: 'Least Squares + Diagnostics',
        summary: 'Solve min ||Ax-b|| with QR/SVD fallback and residual diagnostics.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality/least-squares',
        keywords: ['least squares', 'residual', 'normal equations', 'condition number'],
        source: 'orthogonality',
        stability: 'stable'
    }
];

type WorkflowRunner = (...args: any[]) => unknown;

export const ORTHOGONALITY_WORKFLOW_RUNNERS: Record<OrthogonalityWorkflowId, WorkflowRunner> = {
    'inner-product': analyzeInnerProduct,
    'vector-norm': analyzeVectorNorm,
    'vector-distance': analyzeVectorDistance,
    'orthogonality-check': analyzeOrthogonality,
    'gram-schmidt': runGramSchmidtWorkflow,
    'projection-vector': projectOntoVectorWorkflow,
    'projection-subspace': projectOntoSubspaceWorkflow,
    'orthogonal-complement': computeOrthogonalComplementWorkflow,
    'least-squares-diagnostics': solveLeastSquaresWorkflow
};
