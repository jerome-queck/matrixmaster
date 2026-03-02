import type { FeatureRoute } from '../../app/registry/contracts';

export const SOLVE_FEATURE_ROUTES: FeatureRoute[] = [
    {
        id: 'systemSolver',
        label: 'System Solver',
        kind: 'primary',
        appMode: 'systemSolver',
        infoKey: 'systemSolver',
        order: 10
    }
];
