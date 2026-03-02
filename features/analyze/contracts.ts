export type AnalyzeCategoryId =
    | 'matrix-properties'
    | 'subspaces-bases'
    | 'linear-maps'
    | 'eigen-canonical'
    | 'orthogonality-least-squares'
    | 'advanced-desktop-extras';

export type AnalyzeToolSource = 'core' | 'orthogonality' | 'advanced';

export interface AnalyzeCategoryDescriptor {
    id: AnalyzeCategoryId;
    title: string;
    summary: string;
    order: number;
    keywords: string[];
}

export interface AnalyzeToolDescriptor {
    id: string;
    title: string;
    summary: string;
    category: AnalyzeCategoryId;
    route: string;
    keywords: string[];
    source: AnalyzeToolSource;
    stability?: 'stable' | 'preview';
}

export interface AnalyzeCategoryRegistry {
    categories: AnalyzeCategoryDescriptor[];
    tools: AnalyzeToolDescriptor[];
    byCategory: Record<AnalyzeCategoryId, AnalyzeToolDescriptor[]>;
}
