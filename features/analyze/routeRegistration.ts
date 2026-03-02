import type { FeatureRoute } from '../../app/registry/contracts';

export const ANALYZE_FEATURE_ROUTES: FeatureRoute[] = [
    {
        id: 'analysis',
        label: 'Analysis',
        kind: 'primary',
        appMode: 'analysis',
        infoKey: 'analysis',
        order: 30
    }
];
