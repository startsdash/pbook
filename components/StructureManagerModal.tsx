
import React, { useState } from 'react';
import { Structure } from '../types';
import { X, Plus, Trash2, GripVertical, Save, Layers } from 'lucide-react';

interface StructureManagerModalProps {
  structures: Structure[];
  onUpdateStructures: (structures: Structure[]) => void;
  onClose: () => void;
}

export const StructureManagerModal: React.FC<StructureManagerModalProps> = ({ structures, onUpdateStructures, onClose }) => {
  const [localStructures, setLocalStructures] = useState<Structure[]>(structures);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editComponents, setEditComponents] = useState<string[]>([]);
  const [newComponentInput, setNewComponentInput] = useState('');

  const handleSelectStructure = (struct: Structure) => {
    setSelectedStructureId(struct.id);
    setEditId(struct.id);
    setEditTitle(struct.title);
    setEditDesc(struct.description || '');
    setEditComponents([...struct.defaultComponents]);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    const newId = Date.now().toString();
    setSelectedStructureId(newId);
    setEditId(newId);
    setEditTitle('Новая структура');
    setEditDesc('');
    setEditComponents(['Контекст', 'Задача']);
    setIsEditing(true);
  };

  const handleAddComponent = () => {
    if (newComponentInput.trim()) {
      setEditComponents([...editComponents, newComponentInput.trim()]);
      setNewComponentInput('');
    }
  };

  const handleRemoveComponent = (index: number) => {
    const newComps = [...editComponents];
    newComps.splice(index, 1);
    setEditComponents(newComps);
  };

  // Drag and Drop Logic for Components
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = parseInt(sourceIndexStr, 10);

    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newComps = [...editComponents];
    const [movedItem] = newComps.splice(sourceIndex, 1);
    newComps.splice(targetIndex, 0, movedItem);
    setEditComponents(newComps);
  };

  const handleSave = () => {
    const newStructure: Structure = {
        id: editId,
        title: editTitle,
        description: editDesc,
        defaultComponents: editComponents
    };

    const existingIndex = localStructures.findIndex(s => s.id === editId);
    let updatedStructures;
    if (existingIndex >= 0) {
        updatedStructures = [...localStructures];
        updatedStructures[existingIndex] = newStructure;
    } else {
        updatedStructures = [...localStructures, newStructure];
    }
    
    setLocalStructures(updatedStructures);
    onUpdateStructures(updatedStructures);
    setIsEditing(false);
    setSelectedStructureId(null);
  };

  const handleDeleteStructure = (id: string) => {
      if (confirm('Удалить эту структуру?')) {
          const updated = localStructures.filter(s => s.id !== id);
          setLocalStructures(updated);
          onUpdateStructures(updated);
          if (selectedStructureId === id) {
              setIsEditing(false);
              setSelectedStructureId(null);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col h-[80vh] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={24} className="text-indigo-500" />
            Структуры промпта
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-slate-800 bg-slate-950 flex flex-col">
                <div className="p-4">
                    <button 
                        onClick={handleCreateNew}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} /> Новая структура
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                    {localStructures.map(struct => (
                        <div 
                            key={struct.id}
                            onClick={() => handleSelectStructure(struct)}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between group ${selectedStructureId === struct.id ? 'bg-slate-800 border border-indigo-500/50' : 'hover:bg-slate-900 border border-transparent'}`}
                        >
                            <div>
                                <div className="text-sm font-medium text-slate-200">{struct.title}</div>
                                <div className="text-xs text-slate-500 truncate">{struct.defaultComponents.length} компонентов</div>
                            </div>
                            {selectedStructureId === struct.id && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteStructure(struct.id); }}
                                    className="text-slate-600 hover:text-red-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Area */}
            <div className="w-2/3 bg-slate-900 flex flex-col">
                {isEditing ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">Свойства</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Название структуры</label>
                                <input 
                                    type="text" 
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Описание</label>
                                <input 
                                    type="text" 
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Компоненты промпта</h3>
                            </div>
                            
                            {/* Add Component Input */}
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newComponentInput}
                                    onChange={(e) => setNewComponentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComponent()}
                                    placeholder="Название компонента (например, Контекст)"
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                />
                                <button 
                                    onClick={handleAddComponent}
                                    className="bg-slate-800 hover:bg-indigo-600 text-white p-2 rounded transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {/* Draggable List */}
                            <div className="space-y-2">
                                {editComponents.map((comp, index) => (
                                    <div 
                                        key={index}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded group cursor-move hover:border-slate-600"
                                    >
                                        <GripVertical size={16} className="text-slate-600 group-hover:text-slate-400" />
                                        <span className="text-sm text-slate-200 flex-1">{comp}</span>
                                        <button 
                                            onClick={() => handleRemoveComponent(index)}
                                            className="text-slate-600 hover:text-red-400"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {editComponents.length === 0 && (
                                    <div className="text-center text-slate-600 py-4 text-sm border border-dashed border-slate-800 rounded">
                                        Нет компонентов. Добавьте выше.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        Выберите структуру для редактирования или создайте новую.
                    </div>
                )}

                {isEditing && (
                    <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg shadow-lg shadow-indigo-500/20"
                        >
                            <Save size={18} /> Сохранить структуру
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
