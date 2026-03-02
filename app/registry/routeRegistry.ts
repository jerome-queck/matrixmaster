import type { FeatureRoute } from './contracts';

type BuildRouteRegistryArgs = {
    coreRoutes: FeatureRoute[];
    extensions?: FeatureRoute[];
};

const sortRoutes = (routes: FeatureRoute[]): FeatureRoute[] => {
    return routes.sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label);
    });
};

export const buildRouteRegistry = ({ coreRoutes, extensions = [] }: BuildRouteRegistryArgs): FeatureRoute[] => {
    const merged = new Map<string, FeatureRoute>();
    for (const route of coreRoutes) merged.set(route.id, route);
    for (const route of extensions) merged.set(route.id, route);
    return sortRoutes(Array.from(merged.values()));
};

export const getPrimaryRoutes = (routes: FeatureRoute[]): FeatureRoute[] => {
    return routes.filter(route => route.kind === 'primary');
};
