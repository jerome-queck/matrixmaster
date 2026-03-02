import React from 'react';
import type { FeatureRoute } from '../registry/contracts';

type TopNavigationProps = {
    routes: FeatureRoute[];
    activeRouteId: string;
    onSelect: (routeId: string) => void;
};

const TopNavigation: React.FC<TopNavigationProps> = ({ routes, activeRouteId, onSelect }) => {
    return (
        <div className="flex glass-panel rounded-2xl p-1 mb-6 no-print">
            {routes.map(route => (
                <button
                    key={route.id}
                    onClick={() => onSelect(route.id)}
                    className={`tab glass-tab flex-1 py-2 rounded-xl transition-colors text-sm font-medium ${activeRouteId === route.id ? 'active' : ''}`}
                >
                    {route.label}
                </button>
            ))}
        </div>
    );
};

export default TopNavigation;
