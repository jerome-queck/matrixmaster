import type {
    AnalyzeCategoryDescriptor,
    AnalyzeCategoryId,
    AnalyzeCategoryRegistry,
    AnalyzeToolDescriptor
} from './contracts';
import { advancedToolsAsAnalyzeDescriptors } from '../advanced/registry';
import { ORTHOGONALITY_TOOL_DESCRIPTORS } from '../orthogonality/workflows';

export interface AnalyzeDiscoveryEntry {
    id: string;
    label: string;
    summary: string;
    route: string;
    category?: AnalyzeCategoryId;
}

export const ANALYZE_CATEGORY_DESCRIPTORS: AnalyzeCategoryDescriptor[] = [
    {
        id: 'matrix-properties',
        title: 'Matrix Properties',
        summary: 'Numeric matrix properties, decompositions, and spectral diagnostics.',
        order: 10,
        keywords: ['trace', 'rank', 'norm', 'condition', 'decomposition']
    },
    {
        id: 'subspaces-bases',
        title: 'Subspaces and Bases',
        summary: 'Subspace structure, basis extraction, and basis quality surfaces.',
        order: 20,
        keywords: ['basis', 'span', 'dimension', 'subspace']
    },
    {
        id: 'linear-maps',
        title: 'Linear Maps',
        summary: 'Map properties, image/kernel diagnostics, and representation links.',
        order: 30,
        keywords: ['linear map', 'kernel', 'range', 'representation']
    },
    {
        id: 'eigen-canonical',
        title: 'Eigen and Canonical Forms',
        summary: 'Eigen workflows, multiplicities, diagonalization, and canonical forms.',
        order: 40,
        keywords: ['eigen', 'diagonalization', 'minimal polynomial', 'jordan']
    },
    {
        id: 'orthogonality-least-squares',
        title: 'Orthogonality and Least Squares',
        summary: 'Inner products, orthonormal bases, projections, and least squares.',
        order: 50,
        keywords: ['orthogonality', 'gram-schmidt', 'projection', 'least squares']
    },
    {
        id: 'advanced-desktop-extras',
        title: 'Advanced Desktop Extras',
        summary: 'Desktop-oriented advanced tools, including iterative/sparse workflows.',
        order: 60,
        keywords: ['iterative', 'sparse', 'advanced', 'desktop']
    }
];

const CORE_ANALYZE_TOOL_DESCRIPTORS: AnalyzeToolDescriptor[] = [
    {
        id: 'analyze-matrix-properties-overview',
        title: 'Matrix Properties Overview',
        summary: 'Entry point for decomposition, norm, and conditioning diagnostics.',
        category: 'matrix-properties',
        route: '/analyze/matrix-properties',
        keywords: ['overview', 'matrix properties', 'decomposition'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-subspaces-bases-overview',
        title: 'Subspaces and Bases Overview',
        summary: 'Discover basis/subspace tools in the analyze workspace.',
        category: 'subspaces-bases',
        route: '/analyze/subspaces-bases',
        keywords: ['subspace', 'basis', 'dimension', 'span'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-linear-maps-overview',
        title: 'Linear Maps Overview',
        summary: 'Discover linear map workflows, kernel/range, and basis representations.',
        category: 'linear-maps',
        route: '/analyze/linear-maps',
        keywords: ['linear map', 'kernel', 'range', 'transformation'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-exact-algebra-studio',
        title: 'Exact Algebra Studio',
        summary: 'Open exact spaces, subspaces, basis, and linear-map workflows.',
        category: 'linear-maps',
        route: '/analyze/exact-algebra-studio',
        keywords: ['exact', 'spaces', 'maps', 'basis', 'subspace'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-eigen-canonical-overview',
        title: 'Eigen and Canonical Overview',
        summary: 'Navigate eigenspaces, diagonalization, minimal polynomial, and Jordan tools.',
        category: 'eigen-canonical',
        route: '/analyze/eigen-canonical',
        keywords: ['eigen', 'canonical', 'jordan', 'minimal polynomial'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-orthogonality-overview',
        title: 'Orthogonality Overview',
        summary: 'Navigate inner products, projections, and least-squares diagnostics.',
        category: 'orthogonality-least-squares',
        route: '/analyze/orthogonality',
        keywords: ['orthogonality', 'least squares', 'projection', 'gram-schmidt'],
        source: 'core',
        stability: 'stable'
    },
    {
        id: 'analyze-advanced-extras-overview',
        title: 'Advanced Extras Overview',
        summary: 'Discover iterative and advanced desktop extras with cleaner routing.',
        category: 'advanced-desktop-extras',
        route: '/analyze/advanced',
        keywords: ['advanced', 'desktop', 'iterative', 'sparse'],
        source: 'core',
        stability: 'stable'
    }
];

export const ANALYZE_DISCOVERY_ENTRIES: AnalyzeDiscoveryEntry[] = [
    {
        id: 'analyze-discovery-matrix-properties',
        label: 'Matrix Properties',
        summary: 'Decompositions, rank, trace, and spectral diagnostics.',
        route: '/analyze/matrix-properties',
        category: 'matrix-properties'
    },
    {
        id: 'analyze-discovery-subspaces',
        label: 'Subspaces and Bases',
        summary: 'Span, basis, dimension, and subspace structure workflows.',
        route: '/analyze/subspaces-bases',
        category: 'subspaces-bases'
    },
    {
        id: 'analyze-discovery-linear-maps',
        label: 'Linear Maps',
        summary: 'Kernel/range and representation workflows.',
        route: '/analyze/linear-maps',
        category: 'linear-maps'
    },
    {
        id: 'analyze-discovery-eigen',
        label: 'Eigen and Canonical Forms',
        summary: 'Eigen analysis, multiplicities, diagonalization, and Jordan workflows.',
        route: '/analyze/eigen-canonical',
        category: 'eigen-canonical'
    },
    {
        id: 'analyze-discovery-orthogonality',
        label: 'Orthogonality and Least Squares',
        summary: 'Projections, orthogonality checks, and least-squares diagnostics.',
        route: '/analyze/orthogonality',
        category: 'orthogonality-least-squares'
    },
    {
        id: 'analyze-discovery-advanced',
        label: 'Advanced Extras',
        summary: 'Iterative/sparse and advanced desktop-oriented routes.',
        route: '/analyze/advanced',
        category: 'advanced-desktop-extras'
    },
    {
        id: 'analyze-discovery-exact-studio',
        label: 'Exact Spaces and Maps',
        summary: 'Launch Exact Algebra Studio from the route-driven Analyze surface.',
        route: '/analyze/exact-algebra-studio'
    }
];

const byOrder = (a: AnalyzeToolDescriptor, b: AnalyzeToolDescriptor): number => a.title.localeCompare(b.title);

const dedupeTools = (tools: AnalyzeToolDescriptor[]): AnalyzeToolDescriptor[] => {
    const seen = new Set<string>();
    const deduped: AnalyzeToolDescriptor[] = [];
    for (const tool of tools) {
        if (seen.has(tool.id)) continue;
        seen.add(tool.id);
        deduped.push(tool);
    }
    return deduped;
};

const allTools = dedupeTools([
    ...CORE_ANALYZE_TOOL_DESCRIPTORS,
    ...ORTHOGONALITY_TOOL_DESCRIPTORS,
    ...advancedToolsAsAnalyzeDescriptors()
]).sort(byOrder);

const initializeCategoryMap = (): Record<AnalyzeCategoryId, AnalyzeToolDescriptor[]> => ({
    'matrix-properties': [],
    'subspaces-bases': [],
    'linear-maps': [],
    'eigen-canonical': [],
    'orthogonality-least-squares': [],
    'advanced-desktop-extras': []
});

export const ANALYZE_TOOLS_BY_CATEGORY: Record<AnalyzeCategoryId, AnalyzeToolDescriptor[]> = allTools.reduce(
    (acc, tool) => {
        acc[tool.category].push(tool);
        return acc;
    },
    initializeCategoryMap()
);

Object.keys(ANALYZE_TOOLS_BY_CATEGORY).forEach((categoryId) => {
    const key = categoryId as AnalyzeCategoryId;
    ANALYZE_TOOLS_BY_CATEGORY[key] = ANALYZE_TOOLS_BY_CATEGORY[key].sort(byOrder);
});

export const ANALYZE_TOOL_DESCRIPTORS = allTools;

export const ANALYZE_CATEGORY_REGISTRY: AnalyzeCategoryRegistry = {
    categories: [...ANALYZE_CATEGORY_DESCRIPTORS].sort((a, b) => a.order - b.order),
    tools: ANALYZE_TOOL_DESCRIPTORS,
    byCategory: ANALYZE_TOOLS_BY_CATEGORY
};

const tokenize = (value: string): string[] =>
    value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

const categoryTextIndex = Object.fromEntries(
    ANALYZE_CATEGORY_DESCRIPTORS.map((category) => [category.id, [category.title, category.summary, ...category.keywords].join(' ').toLowerCase()])
) as Record<AnalyzeCategoryId, string>;

export const searchAnalyzeTools = (query: string, limit = 12): AnalyzeToolDescriptor[] => {
    const tokens = tokenize(query);
    if (tokens.length === 0) return ANALYZE_TOOL_DESCRIPTORS.slice(0, limit);

    const scored = ANALYZE_TOOL_DESCRIPTORS.map((tool) => {
        const title = tool.title.toLowerCase();
        const summary = tool.summary.toLowerCase();
        const keywords = tool.keywords.join(' ').toLowerCase();
        const categoryText = categoryTextIndex[tool.category];

        let score = 0;
        tokens.forEach((token) => {
            if (title.includes(token)) score += 6;
            if (summary.includes(token)) score += 3;
            if (keywords.includes(token)) score += 4;
            if (categoryText.includes(token)) score += 2;
            if (tool.id.includes(token)) score += 2;
        });
        return { tool, score };
    });

    return scored
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
        .slice(0, limit)
        .map((entry) => entry.tool);
};

export const getAnalyzeCategoryTools = (categoryId: AnalyzeCategoryId): AnalyzeToolDescriptor[] =>
    ANALYZE_TOOLS_BY_CATEGORY[categoryId] ?? [];

export const getAnalyzeRegistry = (): AnalyzeCategoryRegistry => ANALYZE_CATEGORY_REGISTRY;
