import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { GestureDecoder } from '../lib/GestureDecoder';
import type { Action, GestureType, GestureMapping } from '../types';

export default function GestureMappingPanel() {
    const { mappings, updateMapping, addMapping, removeMapping, resetMappings } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const allGestures = GestureDecoder.getAllGestures();

    const actionTypes = [
        { value: 'none', label: 'None' },
        { value: 'mouse_click', label: 'Mouse Click' },
        { value: 'mouse_scroll', label: 'Mouse Scroll' },
        { value: 'mouse_drag', label: 'Mouse Drag' },
        { value: 'keyboard', label: 'Key Press' },
        { value: 'command', label: 'Custom Command' },
    ];

    const handleToggle = (id: string, enabled: boolean) => {
        updateMapping(id, { enabled });
    };

    const handleSaveMapping = async (mapping: Partial<GestureMapping> & { id: string }) => {
        // Update local store
        updateMapping(mapping.id, mapping);

        // Sync with backend
        try {
            await fetch('http://localhost:8000/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gesture: mapping.gesture,
                    action: (mapping.action as any)?.type || 'none',
                    params: mapping.action || {},
                    cooldown_ms: mapping.cooldownMs,
                    min_confidence: mapping.minConfidence,
                    description: mapping.description
                })
            });
        } catch (e) {
            console.error('Failed to sync mapping:', e);
        }

        setEditingId(null);
    };

    return (
        <div className="card">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Gesture Mappings</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary text-sm"
                    >
                        + Add Mapping
                    </button>
                    <button
                        onClick={resetMappings}
                        className="btn btn-secondary text-sm"
                    >
                        ↺ Reset
                    </button>
                </div>
            </div>

            {/* Mapping List */}
            <div className="space-y-3">
                {mappings.map((mapping) => (
                    <MappingItem
                        key={mapping.id}
                        mapping={mapping}
                        isEditing={editingId === mapping.id}
                        onEdit={() => setEditingId(mapping.id)}
                        onSave={(updates) => handleSaveMapping({ ...updates, id: mapping.id })}
                        onCancel={() => setEditingId(null)}
                        onToggle={(enabled) => handleToggle(mapping.id, enabled)}
                        onDelete={() => removeMapping(mapping.id)}
                    />
                ))}
            </div>

            {/* Empty state */}
            {mappings.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                    <div className="mb-2 text-4xl">⚡</div>
                    <p>No gesture mappings configured</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary mt-4"
                    >
                        Add Your First Mapping
                    </button>
                </div>
            )}

            {/* Add Form Modal */}
            {showAddForm && (
                <AddMappingForm
                    onAdd={(mapping) => {
                        addMapping(mapping);
                        setShowAddForm(false);
                    }}
                    onCancel={() => setShowAddForm(false)}
                    existingGestures={mappings.map(m => m.gesture)}
                />
            )}
        </div>
    );
}

interface MappingItemProps {
    mapping: GestureMapping;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<GestureMapping>) => void;
    onCancel: () => void;
    onToggle: (enabled: boolean) => void;
    onDelete: () => void;
}

function MappingItem({
    mapping,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onToggle,
    onDelete
}: MappingItemProps) {
    const [cooldown, setCooldown] = useState(mapping.cooldownMs);
    const [confidence, setConfidence] = useState(mapping.minConfidence);

    if (isEditing) {
        return (
            <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-lg font-medium text-white">
                        {GestureDecoder.getGestureName(mapping.gesture as GestureType)}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onSave({ cooldownMs: cooldown, minConfidence: confidence })}
                            className="btn btn-primary text-sm"
                        >
                            Save
                        </button>
                        <button onClick={onCancel} className="btn btn-secondary text-sm">
                            Cancel
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Cooldown slider */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">
                            Cooldown: {cooldown}ms
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="100"
                            value={cooldown}
                            onChange={(e) => setCooldown(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Confidence slider */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">
                            Min Confidence: {(confidence * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={confidence}
                            onChange={(e) => setConfidence(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border p-4 transition-all ${mapping.enabled
                ? 'border-white/10 bg-white/5'
                : 'border-white/5 bg-white/[0.02] opacity-60'
            }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Enable toggle */}
                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={mapping.enabled}
                            onChange={(e) => onToggle(e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-thumb" />
                    </label>

                    <div>
                        <div className="font-medium text-white">
                            {GestureDecoder.getGestureName(mapping.gesture as GestureType)}
                        </div>
                        <div className="text-sm text-gray-400">
                            {mapping.description || getActionDescription(mapping.action)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="badge badge-info">
                        {mapping.cooldownMs}ms
                    </span>
                    <button
                        onClick={onEdit}
                        className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                        aria-label="Edit mapping"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Delete mapping"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}

interface AddMappingFormProps {
    onAdd: (mapping: GestureMapping) => void;
    onCancel: () => void;
    existingGestures: GestureType[];
}

function AddMappingForm({ onAdd, onCancel, existingGestures }: AddMappingFormProps) {
    const [gesture, setGesture] = useState<GestureType>('fist');
    const [actionType, setActionType] = useState('mouse_click');
    const [actionParams, setActionParams] = useState<any>({});
    const [cooldown, setCooldown] = useState(500);
    const [confidence, setConfidence] = useState(0.8);
    const [label, setLabel] = useState('');

    const availableGestures = GestureDecoder.getAllGestures()
        .filter(g => !existingGestures.includes(g));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const action = createAction(actionType, actionParams);

        onAdd({
            id: `${gesture}-${Date.now()}`,
            gesture,
            action,
            enabled: true,
            cooldownMs: cooldown,
            minConfidence: confidence,
            label: label || GestureDecoder.getGestureName(gesture),
            description: getActionDescription(action)
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="card w-full max-w-md animate-in">
                <h3 className="mb-4 text-lg font-semibold text-white">Add New Mapping</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Gesture select */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">Gesture</label>
                        <select
                            value={gesture}
                            onChange={(e) => setGesture(e.target.value as GestureType)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                        >
                            {availableGestures.map((g) => (
                                <option key={g} value={g}>
                                    {GestureDecoder.getGestureName(g)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action type */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">Action Type</label>
                        <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                        >
                            <option value="mouse_click">Mouse Click</option>
                            <option value="mouse_scroll">Mouse Scroll</option>
                            <option value="keyboard">Keyboard Press</option>
                            <option value="none">No Action</option>
                        </select>
                    </div>

                    {/* Action-specific params */}
                    {actionType === 'mouse_click' && (
                        <div>
                            <label className="mb-2 block text-sm text-gray-400">Button</label>
                            <select
                                value={actionParams.button || 'left'}
                                onChange={(e) => setActionParams({ ...actionParams, button: e.target.value })}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                            >
                                <option value="left">Left Click</option>
                                <option value="right">Right Click</option>
                                <option value="middle">Middle Click</option>
                            </select>
                        </div>
                    )}

                    {actionType === 'keyboard' && (
                        <div>
                            <label className="mb-2 block text-sm text-gray-400">Key</label>
                            <input
                                type="text"
                                value={actionParams.keys?.[0] || ''}
                                onChange={(e) => setActionParams({ ...actionParams, keys: [e.target.value] })}
                                placeholder="e.g., Enter, Space, a"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                            />
                        </div>
                    )}

                    {/* Cooldown */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-400">
                            Cooldown: {cooldown}ms
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="100"
                            value={cooldown}
                            onChange={(e) => setCooldown(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn btn-primary flex-1">
                            Add Mapping
                        </button>
                        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function createAction(type: string, params: any): Action {
    switch (type) {
        case 'mouse_click':
            return {
                type: 'mouse_click',
                button: params.button || 'left',
                clickType: params.clickType || 'single'
            };
        case 'mouse_scroll':
            return {
                type: 'mouse_scroll',
                direction: params.direction || 'down',
                speed: params.speed || 1
            };
        case 'keyboard':
            return {
                type: 'keyboard',
                keys: params.keys || ['Enter']
            };
        default:
            return { type: 'none' };
    }
}

function getActionDescription(action: Action): string {
    switch (action.type) {
        case 'mouse_click':
            return `${action.clickType === 'double' ? 'Double ' : ''}${action.button} click`;
        case 'mouse_scroll':
            return `Scroll ${action.direction}`;
        case 'keyboard':
            return `Press ${action.keys.join(' + ')}`;
        case 'mouse_drag':
            return 'Drag with ' + action.button;
        case 'command':
            return action.command;
        default:
            return 'No action';
    }
}
