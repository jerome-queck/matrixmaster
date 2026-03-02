import type { AppMode } from '../../types';

export type PrimaryRouteId = AppMode | 'library';

export interface FeatureRoute {
    id: PrimaryRouteId | (string & {});
    label: string;
    kind: 'primary' | 'secondary';
    appMode?: AppMode;
    infoKey?: string;
    order?: number;
}

export interface ToolDescriptor {
    id: string;
    label: string;
    description?: string;
    shortcut?: string;
    section?: 'navigation' | 'workspace' | 'data' | 'advanced' | 'help' | (string & {});
    run: () => void;
}

export interface ResultAction {
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
    run: () => void;
}
