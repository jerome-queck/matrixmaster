import type { FeatureRoute } from '../registry/contracts';

const routeExtensions: FeatureRoute[] = [];

export const registerFeatureRoutes = (routes: FeatureRoute[]): void => {
    routeExtensions.push(...routes);
};

export const getRegisteredFeatureRoutes = (): FeatureRoute[] => routeExtensions;
