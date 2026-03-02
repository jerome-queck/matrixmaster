import React from 'react';
import type { Matrix, ValidMatrix } from '../../types';
import OperateSurface from '../operate/OperateSurface';
import SpacesSurface from '../spaces/SpacesSurface';
import MapsSurface from '../maps/MapsSurface';
import SolveSurface from './SolveSurface';

type MatrixOption = { key: string; label: string };

type ExactStudioTab = 'solve' | 'operate' | 'spaces' | 'maps';

interface ExactAlgebraStudioProps {
    matrixOptions: MatrixOption[];
    resolveMatrixByKey: (key: string) => Matrix | null;
    onUseMatrix: (matrix: ValidMatrix) => void;
    onSaveMatrix: (matrix: ValidMatrix, preferredName: string) => void;
    onError?: (message: string) => void;
}

const tabTitle: Record<ExactStudioTab, string> = {
    solve: 'Solve Reuse',
    operate: 'Vector/Operate',
    spaces: 'Spaces',
    maps: 'Linear Maps',
};

export const ExactAlgebraStudio: React.FC<ExactAlgebraStudioProps> = ({
    matrixOptions,
    resolveMatrixByKey,
    onUseMatrix,
    onSaveMatrix,
    onError,
}) => {
    const [activeTab, setActiveTab] = React.useState<ExactStudioTab>('solve');

    return (
        <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-4 space-y-2">
                <h3 className="text-lg font-semibold text-ink">Exact Algebra Studio</h3>
                <p className="text-sm text-secondary">
                    Stream C workflows: vector models, exact operations, span/basis spaces, fundamental subspaces, linear maps, and basis-change/similarity.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {(Object.keys(tabTitle) as ExactStudioTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-2 rounded-lg text-sm ${activeTab === tab ? 'bg-indigo-600 text-white' : 'glass-btn'}`}
                    >
                        {tabTitle[tab]}
                    </button>
                ))}
            </div>

            {activeTab === 'solve' && (
                <SolveSurface
                    matrixOptions={matrixOptions}
                    resolveMatrixByKey={resolveMatrixByKey}
                    onUseMatrix={onUseMatrix}
                    onSaveMatrix={onSaveMatrix}
                    onError={onError}
                />
            )}

            {activeTab === 'operate' && (
                <OperateSurface
                    matrixOptions={matrixOptions}
                    resolveMatrixByKey={resolveMatrixByKey}
                    onUseMatrix={onUseMatrix}
                    onSaveMatrix={onSaveMatrix}
                    onError={onError}
                />
            )}

            {activeTab === 'spaces' && (
                <SpacesSurface
                    matrixOptions={matrixOptions}
                    resolveMatrixByKey={resolveMatrixByKey}
                    onUseMatrix={onUseMatrix}
                    onSaveMatrix={onSaveMatrix}
                    onError={onError}
                />
            )}

            {activeTab === 'maps' && (
                <MapsSurface
                    onUseMatrix={onUseMatrix}
                    onSaveMatrix={onSaveMatrix}
                    onError={onError}
                />
            )}
        </div>
    );
};

export default ExactAlgebraStudio;
