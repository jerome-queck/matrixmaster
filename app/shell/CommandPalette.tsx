import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import type { ToolDescriptor } from '../registry/contracts';

type CommandPaletteProps = {
    isOpen: boolean;
    onClose: () => void;
    commands: ToolDescriptor[];
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!isOpen) setQuery('');
    }, [isOpen]);

    const filteredCommands = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return commands;
        return commands.filter(command => {
            const haystack = `${command.label} ${command.description ?? ''}`.toLowerCase();
            return haystack.includes(normalized);
        });
    }, [commands, query]);

    if (!isOpen) return null;

    return (
        <Modal title="Command Palette" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-3">
                <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Type a command..."
                    autoFocus
                    className="w-full rounded-md glass-input px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map(command => (
                            <button
                                key={command.id}
                                onClick={() => {
                                    command.run();
                                    onClose();
                                }}
                                className="w-full text-left p-3 rounded-lg glass-btn"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span>{command.label}</span>
                                    {command.shortcut && (
                                        <span className="text-[11px] text-secondary">{command.shortcut}</span>
                                    )}
                                </div>
                                {command.description && (
                                    <div className="text-xs text-secondary mt-0.5">{command.description}</div>
                                )}
                            </button>
                        ))
                    ) : (
                        <p className="text-sm text-secondary">No matching commands.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default CommandPalette;
