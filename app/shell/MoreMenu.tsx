import React from 'react';
import { Modal } from '../../components/Modal';
import type { ToolDescriptor } from '../registry/contracts';

type MoreMenuProps = {
    isOpen: boolean;
    onClose: () => void;
    tools: ToolDescriptor[];
};

const MoreMenu: React.FC<MoreMenuProps> = ({ isOpen, onClose, tools }) => {
    if (!isOpen) return null;

    return (
        <Modal title="More" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-3">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => {
                            tool.run();
                            onClose();
                        }}
                        className="w-full text-left p-3 rounded-lg glass-btn"
                    >
                        <div>{tool.label}</div>
                        {tool.description && (
                            <div className="text-xs text-secondary mt-0.5">{tool.description}</div>
                        )}
                    </button>
                ))}
            </div>
        </Modal>
    );
};

export default MoreMenu;
