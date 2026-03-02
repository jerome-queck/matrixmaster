import type { FeatureRoute } from '../../app/registry/contracts';

export const OPERATE_FEATURE_ROUTES: FeatureRoute[] = [
    {
        id: 'matrixOperations',
        label: 'Matrix Operations',
        kind: 'primary',
        appMode: 'matrixOperations',
        infoKey: 'matrixOperations',
        order: 20
    }
];
