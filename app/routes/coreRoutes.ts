import type { FeatureRoute } from '../registry/contracts';

export const CORE_PRIMARY_ROUTES: FeatureRoute[] = [
    {
        id: 'systemSolver',
        label: 'System Solver',
        kind: 'primary',
        appMode: 'systemSolver',
        infoKey: 'systemSolver',
        order: 10
    },
    {
        id: 'matrixOperations',
        label: 'Matrix Operations',
        kind: 'primary',
        appMode: 'matrixOperations',
        infoKey: 'matrixOperations',
        order: 20
    },
    {
        id: 'analysis',
        label: 'Analysis',
        kind: 'primary',
        appMode: 'analysis',
        infoKey: 'analysis',
        order: 30
    },
    {
        id: 'library',
        label: 'Library',
        kind: 'primary',
        infoKey: 'library',
        order: 40
    }
];
