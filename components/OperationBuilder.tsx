import React, { useMemo } from 'react';
import type { OperationNode, Operand } from '../types';
import { getOperationResultDimensions } from '../services/matrixService';

interface OperationBuilderProps {
    nodes: OperationNode[];
    onNodesChange: (nodes: OperationNode[]) => void;
    matrixDefs: Record<string, { rows: number | ''; cols: number | ''; matrix: any }>;
    setExpression: (expr: string) => void;
}

const PRESETS: Record<string, string> = {
    'Product': 'A * B',
    'Commutator': '(A*B)-(B*A)',
    'Sum': 'A + B',
    'Difference of Squares': '(A+B)*(A-B)',
};

export const OperationBuilder: React.FC<OperationBuilderProps> = ({ nodes, onNodesChange, matrixDefs, setExpression }) => {

    const operandDimensions = useMemo(() => {
        const dims = new Map<string, { rows: number; cols: number }>();
        // Add defined matrices
        for (const name in matrixDefs) {
            const def = matrixDefs[name];
            const rows = typeof def.rows === 'number' ? def.rows : 0;
            const cols = typeof def.cols === 'number' ? def.cols : 0;
            if (rows > 0 && cols > 0) {
                dims.set(`matrix-${name}`, { rows, cols });
            }
        }
        // Add results from previous steps
        nodes.forEach(node => {
            const leftOp = node.left ? dims.get(`${node.left.type}-${node.left.value}`) : undefined;
            const rightOpIsNumber = node.operation === '^' && node.right?.type === 'number';
            const rightOp = node.right && !rightOpIsNumber ? dims.get(`${node.right.type}-${node.right.value}`) : undefined;
            
            if(leftOp && (rightOp || rightOpIsNumber)) {
                const rightArg = rightOpIsNumber ? parseInt(node.right!.value, 10) : rightOp!;
                const { dims: resultDims } = getOperationResultDimensions(node.operation, leftOp, rightArg);
                if(resultDims.rows > 0 && resultDims.cols > 0) {
                    dims.set(`result-${node.id}`, resultDims);
                }
            }
        });
        return dims;
    }, [nodes, matrixDefs]);

    // Calculate available operands for each step outside the map to follow Rules of Hooks.
    const availableOperandsByStep = useMemo(() => {
        return nodes.map((_, index) => 
            nodes.slice(0, index).map(n => ({
                id: `result-${n.id}`,
                name: `${n.resultName} (${operandDimensions.get(`result-${n.id}`)?.rows || '?'}x${operandDimensions.get(`result-${n.id}`)?.cols || '?'})`
            }))
        );
    }, [nodes, operandDimensions]);

    const updateAndValidateNodes = (updatedNodes: OperationNode[]) => {
        const validatedNodes = updatedNodes.map(node => {
            const leftOp = node.left ? operandDimensions.get(`${node.left.type}-${node.left.value}`) : undefined;
            const rightOpIsNumber = node.operation === '^' && node.right?.type === 'number';
            const rightOp = node.right && !rightOpIsNumber ? operandDimensions.get(`${node.right.type}-${node.right.value}`) : undefined;

            let error: string | null = null;
            if (node.left && node.right) {
                 if (!leftOp) error = "Left operand is invalid or has unknown dimensions.";
                 else if (!rightOp && !rightOpIsNumber) error = "Right operand is invalid or has unknown dimensions.";
                 else {
                    const rightArg = rightOpIsNumber ? parseInt(node.right!.value, 10) : rightOp!;
                    error = getOperationResultDimensions(node.operation, leftOp, rightArg).error;
                 }
            }
            return { ...node, error };
        });
        onNodesChange(validatedNodes);
    };

    const handleAddNode = () => {
        const newId = `T${Date.now()}`;
        const newNode: OperationNode = {
            id: newId,
            operation: '*',
            left: null,
            right: null,
            resultName: `Step ${nodes.length + 1}`
        };
        const newNodes = [...nodes, newNode];
        if (newNodes.length > 0) {
            newNodes.forEach((n, i) => n.resultName = i === newNodes.length - 1 ? 'Final Result' : `Step ${i + 1}`);
        }
        updateAndValidateNodes(newNodes);
    };

    const handleNodeChange = (id: string, field: keyof OperationNode, value: any) => {
        const newNodes = nodes.map(n => n.id === id ? { ...n, [field]: value } : n);
        updateAndValidateNodes(newNodes);
    };
    
    const handleOperandChange = (id: string, side: 'left' | 'right', value: string) => {
        const [type, val] = value.split('-');
        const newOperand: Operand | null = value ? { type: type as any, value: val } : null;
        handleNodeChange(id, side, newOperand);
    };

    const handleRemoveNode = (id: string) => {
        const newNodes = nodes.filter(n => n.id !== id);
        // Clean up any operands that pointed to the deleted node
        const cleanedNodes = newNodes.map(n => {
            let changed = false;
            const newN = {...n};
            if (n.left?.type === 'result' && n.left.value === id) { newN.left = null; changed = true; }
            if (n.right?.type === 'result' && n.right.value === id) { newN.right = null; changed = true; }
            return newN;
        });
        if (cleanedNodes.length > 0) {
             cleanedNodes.forEach((n, i) => n.resultName = i === cleanedNodes.length - 1 ? 'Final Result' : `Step ${i + 1}`);
        }
        updateAndValidateNodes(cleanedNodes);
    };

    const handleLoadPreset = (presetName: string) => {
        const expr = PRESETS[presetName];
        if (expr) {
            setExpression(expr);
        }
    };

    const availableMatrices = Object.keys(matrixDefs);
    
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative inline-block text-left">
                     <select onChange={(e) => handleLoadPreset(e.target.value)} defaultValue="" className="text-sm py-2 pl-3 pr-8 rounded-md glass-input appearance-none">
                        <option value="" disabled>Load Preset...</option>
                        {Object.keys(PRESETS).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <button onClick={handleAddNode} className="text-sm py-2 px-4 rounded-md glass-btn glass-btn-primary">Add Operation Step</button>
            </div>
            
            {nodes.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg glass-panel">
                    <p className="text-secondary">The visual builder is empty.</p>
                    <p className="text-sm text-secondary">Add a step or load a preset to begin.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {nodes.map((node, index) => {
                         const availableOperands = availableOperandsByStep[index];

                        return (
                        <div key={node.id} className={`p-4 rounded-lg border transition-all ${node.error ? 'bg-red-500/10 border-red-500/40' : 'glass-panel'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <input type="text" value={node.resultName} onChange={(e) => handleNodeChange(node.id, 'resultName', e.target.value)} className="font-bold text-lg bg-transparent text-primary focus:outline-none rounded px-1" />
                                <button onClick={() => handleRemoveNode(node.id)} className="p-1 text-red-500 hover:bg-red-900/50 rounded-full" aria-label="Remove step"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Left Operand */}
                                <select value={node.left ? `${node.left.type}-${node.left.value}` : ''} onChange={e => handleOperandChange(node.id, 'left', e.target.value)} className="flex-1 min-w-[120px] glass-input rounded-md px-2 py-2 focus:outline-none">
                                    <option value="">Select Operand</option>
                                    <optgroup label="Matrices">
                                       {availableMatrices.map(name => <option key={`matrix-${name}`} value={`matrix-${name}`}>{name} ({matrixDefs[name]?.rows || '?'}x{matrixDefs[name]?.cols || '?'})</option>)}
                                    </optgroup>
                                    {availableOperands.length > 0 && <optgroup label="Previous Results">{availableOperands.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}</optgroup>}
                                </select>
                                
                                {/* Operator */}
                                <select value={node.operation} onChange={e => handleNodeChange(node.id, 'operation', e.target.value as OperationNode['operation'])} className="glass-input rounded-md px-2 py-2 focus:outline-none">
                                    <option value="+">+</option><option value="-">-</option><option value="*">*</option><option value="^">^</option>
                                </select>
                                
                                {/* Right Operand */}
                                {node.operation === '^' ? (
                                    <input type="number" min="1" step="1" value={node.right?.type === 'number' ? node.right.value : '2'} onChange={e => handleOperandChange(node.id, 'right', `number-${e.target.value}`)} className="w-20 glass-input rounded-md px-2 py-2 focus:outline-none" />
                                ) : (
                                    <select value={node.right ? `${node.right.type}-${node.right.value}` : ''} onChange={e => handleOperandChange(node.id, 'right', e.target.value)} className="flex-1 min-w-[120px] glass-input rounded-md px-2 py-2 focus:outline-none">
                                        <option value="">Select Operand</option>
                                        <optgroup label="Matrices">{availableMatrices.map(name => <option key={`matrix-${name}`} value={`matrix-${name}`}>{name} ({matrixDefs[name]?.rows || '?'}x{matrixDefs[name]?.cols || '?'})</option>)}</optgroup>
                                        {availableOperands.length > 0 && <optgroup label="Previous Results">{availableOperands.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}</optgroup>}
                                    </select>
                                )}
                            </div>
                            {node.error && <p className="text-red-400 text-xs mt-2">{node.error}</p>}
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};
