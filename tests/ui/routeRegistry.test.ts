import { describe, expect, it } from 'vitest';
import { buildRouteRegistry, getPrimaryRoutes } from '../../app/registry/routeRegistry';
import { CORE_PRIMARY_ROUTES } from '../../app/routes/coreRoutes';
import { bootstrapFeatureRoutes } from '../../app/routes/featureRouteBootstrap';
import { getRegisteredFeatureRoutes } from '../../app/routes/extensions';

describe('route registry', () => {
  it('keeps primary route ownership in core routes only', () => {
    bootstrapFeatureRoutes();

    const featureRoutes = getRegisteredFeatureRoutes();
    const corePrimaryRouteIds = new Set(CORE_PRIMARY_ROUTES.map(route => route.id));
    const duplicatedPrimaryFeatureRoutes = featureRoutes.filter(route => {
      return route.kind === 'primary' && corePrimaryRouteIds.has(route.id);
    });

    expect(duplicatedPrimaryFeatureRoutes).toEqual([]);

    const primaryRoutes = getPrimaryRoutes(buildRouteRegistry({
      coreRoutes: CORE_PRIMARY_ROUTES,
      extensions: featureRoutes
    }));

    expect(primaryRoutes.map(route => ({
      id: route.id,
      label: route.label,
      appMode: route.appMode,
      infoKey: route.infoKey,
      order: route.order
    }))).toEqual([
      {
        id: 'systemSolver',
        label: 'System Solver',
        appMode: 'systemSolver',
        infoKey: 'systemSolver',
        order: 10
      },
      {
        id: 'matrixOperations',
        label: 'Matrix Operations',
        appMode: 'matrixOperations',
        infoKey: 'matrixOperations',
        order: 20
      },
      {
        id: 'analysis',
        label: 'Analysis',
        appMode: 'analysis',
        infoKey: 'analysis',
        order: 30
      },
      {
        id: 'library',
        label: 'Library',
        appMode: undefined,
        infoKey: 'library',
        order: 40
      }
    ]);
  });
});
