import type { AnalyzeCategoryId } from '../analyze/contracts';

export type AdvancedRouteId =
    | 'decompositions'
    | 'eigen-canonical'
    | 'canonical-forms'
    | 'orthogonality-least-squares'
    | 'iterative-sparse'
    | 'matrix-functions';

export interface AdvancedToolRouteContract {
    id: AdvancedRouteId;
    path: string;
    label: string;
    description: string;
    analyzeCategory: AnalyzeCategoryId;
    order: number;
    desktopOnly?: boolean;
    toolIds: string[];
}

export interface AdvancedToolDescriptor {
    id: string;
    title: string;
    summary: string;
    routeId: AdvancedRouteId;
    analyzeCategory: AnalyzeCategoryId;
    keywords: string[];
    stability: 'stable' | 'preview';
    runner: string;
}

export const buildAdvancedRouteIndex = (
    routes: AdvancedToolRouteContract[]
): Record<AdvancedRouteId, AdvancedToolRouteContract> =>
    Object.fromEntries(routes.map((route) => [route.id, route])) as Record<AdvancedRouteId, AdvancedToolRouteContract>;
