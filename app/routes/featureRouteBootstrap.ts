import type { FeatureRoute } from '../registry/contracts';
import { ANALYZE_FEATURE_ROUTES } from '../../features/analyze/routeRegistration';
import { LIBRARY_FEATURE_ROUTES } from '../../features/library/routeRegistration';
import { OPERATE_FEATURE_ROUTES } from '../../features/operate/routeRegistration';
import { SOLVE_FEATURE_ROUTES } from '../../features/solve/routeRegistration';
import { registerFeatureRoutes } from './extensions';

const FEATURE_ROUTE_EXTENSIONS: FeatureRoute[] = [
    ...SOLVE_FEATURE_ROUTES,
    ...OPERATE_FEATURE_ROUTES,
    ...ANALYZE_FEATURE_ROUTES,
    ...LIBRARY_FEATURE_ROUTES
];

let didBootstrapFeatureRoutes = false;

export const bootstrapFeatureRoutes = (): void => {
    if (didBootstrapFeatureRoutes) return;
    registerFeatureRoutes(FEATURE_ROUTE_EXTENSIONS);
    didBootstrapFeatureRoutes = true;
};
