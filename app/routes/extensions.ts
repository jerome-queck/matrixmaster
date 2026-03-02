import type { FeatureRoute } from '../registry/contracts';

const routeExtensions = new Map<string, FeatureRoute>();

export const registerFeatureRoutes = (routes: FeatureRoute[]): void => {
    for (const route of routes) {
        routeExtensions.set(route.id, route);
    }
};

export const getRegisteredFeatureRoutes = (): FeatureRoute[] => Array.from(routeExtensions.values());
