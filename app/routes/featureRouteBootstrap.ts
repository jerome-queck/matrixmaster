import type { FeatureRoute } from '../registry/contracts';
import { registerFeatureRoutes } from './extensions';

const FEATURE_ROUTE_EXTENSIONS: FeatureRoute[] = [];

let didBootstrapFeatureRoutes = false;

export const bootstrapFeatureRoutes = (): void => {
    if (didBootstrapFeatureRoutes) return;
    if (FEATURE_ROUTE_EXTENSIONS.length > 0) {
        registerFeatureRoutes(FEATURE_ROUTE_EXTENSIONS);
    }
    didBootstrapFeatureRoutes = true;
};
