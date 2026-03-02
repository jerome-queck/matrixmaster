import React from 'react';
import type { AdvancedToolRouteContract } from '../advanced/contracts';
import type { AnalyzeDiscoveryEntry } from './registry';

type AnalyzeDiscoveryPanelProps = {
    entries: AnalyzeDiscoveryEntry[];
    advancedRoutes: AdvancedToolRouteContract[];
    onOpenRoute: (route: string) => void;
};

const AnalyzeDiscoveryPanel: React.FC<AnalyzeDiscoveryPanelProps> = ({ entries, advancedRoutes, onOpenRoute }) => {
    return (
        <section className="mb-6 rounded-2xl glass-panel p-4 border border-[var(--glass-border)]">
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-base font-semibold text-ink">Analyze Workflows</h3>
                <span className="text-xs text-secondary">Route-driven discovery</span>
            </div>
            <p className="text-sm text-secondary mb-4">
                Open analysis workflows from consistent routes without leaving the current setup flow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map((entry) => (
                    <button
                        key={entry.id}
                        onClick={() => onOpenRoute(entry.route)}
                        className="w-full text-left p-3 rounded-lg glass-btn"
                    >
                        <div className="font-medium text-ink">{entry.label}</div>
                        <div className="text-xs text-secondary mt-1">{entry.summary}</div>
                    </button>
                ))}
            </div>
            <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Advanced Route Shortcuts</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {advancedRoutes.map((route) => (
                        <button
                            key={route.id}
                            onClick={() => onOpenRoute(route.path)}
                            className="w-full text-left p-2 rounded-lg glass-btn text-sm"
                        >
                            {route.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AnalyzeDiscoveryPanel;
