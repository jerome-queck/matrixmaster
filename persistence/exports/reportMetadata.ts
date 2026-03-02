import type { AnyResult, SavedOutputKind } from '../../types';
import type { LibraryItem, SavedOutputMetadata } from '../../features/library/contracts';

export interface BuildSavedOutputMetadataInput {
    title: string;
    result: AnyResult | null;
    sourceItemId?: string;
    summary?: string;
    generatedAt?: number;
    latex?: {
        primary?: string;
        secondary?: string;
    };
    metrics?: Record<string, string | number | boolean>;
}

const createId = (at: number): string => `out_${at}_${Math.random().toString(36).slice(2, 8)}`;

export const inferSavedOutputKind = (result: AnyResult | null): SavedOutputKind => {
    if (!result) return 'workspace';
    if ('systemType' in result) return 'systemSolver';
    if ('finalResult' in result) return 'matrixOperations';
    if ('kind' in result && result.kind === 'analysis') return 'analysis';
    return 'workspace';
};

export const summarizeResultMetrics = (result: AnyResult | null): Record<string, string | number | boolean> => {
    if (!result) return {};
    if ('systemType' in result) {
        return {
            mode: result.systemType,
            gaussJordanSteps: result.gaussJordanSteps.length,
            hasDeterminant: Boolean(result.determinant),
            hasInverse: Boolean(result.inverse?.inverseMatrix)
        };
    }
    if ('finalResult' in result) {
        return {
            steps: result.steps.length,
            rows: result.finalResult.length,
            cols: result.finalResult[0]?.length || 0
        };
    }
    if ('kind' in result && result.kind === 'analysis') {
        return {
            analysisMode: result.mode,
            rank: result.rank,
            warningCount: result.warnings.length
        };
    }
    return {};
};

export const buildSavedOutputMetadata = ({
    title,
    result,
    sourceItemId,
    summary,
    generatedAt = Date.now(),
    latex,
    metrics
}: BuildSavedOutputMetadataInput): SavedOutputMetadata => ({
    id: createId(generatedAt),
    kind: inferSavedOutputKind(result),
    title,
    generatedAt,
    sourceItemId,
    summary,
    latex,
    metrics: {
        ...summarizeResultMetrics(result),
        ...(metrics || {})
    }
});

export const appendSavedOutputMetadata = (
    outputs: SavedOutputMetadata[] | undefined,
    metadata: SavedOutputMetadata,
    limit = 50
): SavedOutputMetadata[] => {
    const next = [...(outputs || []), metadata].sort((a, b) => b.generatedAt - a.generatedAt);
    return next.slice(0, Math.max(1, limit));
};

export const attachSavedOutputToLibraryItem = (
    item: LibraryItem,
    metadata: SavedOutputMetadata,
    limit = 50
): LibraryItem => ({
    ...item,
    updatedAt: Math.max(item.updatedAt, metadata.generatedAt),
    outputs: appendSavedOutputMetadata(item.outputs, metadata, limit)
});
