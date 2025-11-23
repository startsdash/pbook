
import React, { useState, useEffect } from 'react';
import { Prompt, Category, Structure, PromptComponent, TargetType } from '../types';
import { X, Save, Plus, GripVertical, Trash2, Copy, Sparkles, Cpu, User } from 'lucide-react';
import { assemblePromptWithAI } from '../services/geminiService';

interface PromptFormModalProps {
  initialData?: Prompt | null;
  structures: Structure[];
  onSave: (prompt: Prompt) => void;
  onClose: () => void;
}

const EMPTY_PROMPT: Partial<Prompt> = {
  title: '',
  category: Category.TEXT,
  tags: [],
  systemContent: '',
  userContent: '',
  description: '',
  modelRecommendation: 'Gemini 2.5 Flash',
  exampleOutput: '',
  notes: '',
  components: []
};

export const PromptFormModal: React.FC<PromptFormModalProps> = ({ initialData, structures, onSave, onClose }) => {
  const [formData, setFormData] = useState<Prompt>({ ...EMPTY_PROMPT, id: Date.now().toString() } as Prompt);
  const [tagInput, setTagInput] = useState('');
  
  // Components State
  const [localComponents, setLocalComponents] = useState<PromptComponent[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [isGeneratingSystem, setIsGeneratingSystem] = useState(false);
  const [isGeneratingUser, setIsGeneratingUser] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
      setTagInput(initialData.tags.join(', '));
      setLocalComponents(initialData.components || []);
      setSelectedStructureId(initialData.structureId || '');
    } else {
      setFormData({ ...EMPTY_PROMPT, id: Date.now().toString() } as Prompt);
    }
  }, [initialData]);

  // Handle Structure Selection
  const handleStructureChange = (structId: string) => {
    setSelectedStructureId(structId);
    const struct = structures.find(s => s.id === structId);
    if (struct) {
        // Create new components based on structure defaults, preserving existing values if labels match
        const newComponents: PromptComponent[] = struct.defaultComponents.map(label => {
            const existing = localComponents.find(c => c.label === label);
            return {
                id: existing ? existing.id : `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                label: label,
                value: existing ? existing.value : '',
                target: existing ? existing.target : 'SYSTEM' // Default target
            };
        });
        setLocalComponents(newComponents);
    }
  };

  const handleComponentChange = (id: string, field: keyof PromptComponent, value: any) => {
    setLocalComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleAddComponent = () => {
      const newComp: PromptComponent = {
          id: `cmp_${Date.now()}`,
          label: 'Новый компонент',
          value: '',
          target: 'SYSTEM'
      };
      setLocalComponents([...localComponents, newComp]);
  };

  const handleRemoveComponent = (id: string) => {
      setLocalComponents(prev => prev.filter(c => c.id !== id));
  };

  // Drag & Drop for Components
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newComps = [...localComponents];
    const [movedItem] = newComps.splice(sourceIndex, 1);
    newComps.splice(targetIndex, 0, movedItem);
    setLocalComponents(newComps);
  };

  // Appending values to main text areas
  const appendToContent = (target: TargetType, value: string) => {
      if (!value) return;
      if (target === 'SYSTEM') {
          setFormData(prev => ({
              ...prev,
              systemContent: prev.systemContent ? `${prev.systemContent}\n\n${value}` : value
          }));
      } else {
          setFormData(prev => ({
            ...prev,
            userContent: prev.userContent ? `${prev.userContent}\n\n${value}` : value
        }));
      }
  };

  // AI Generation
  const handleGeneratePrompt = async () => {
      // 1. Generate System
      setIsGeneratingSystem(true);
      const systemResult = await assemblePromptWithAI(localComponents, 'SYSTEM');
      setFormData(prev => ({ ...prev, systemContent: systemResult }));
      setIsGeneratingSystem(false);

      // 2. Generate User
      setIsGeneratingUser(true);
      const userResult = await assemblePromptWithAI(localComponents, 'USER');
      setFormData(prev => ({ ...prev, userContent: userResult }));
      setIsGeneratingUser(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ 
        ...formData, 
        tags,
        components: localComponents,
        structureId: selectedStructureId
    });
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Редактировать промпт' : 'Новый промпт'}
          </h2>
          <div className="flex gap-2">
            <button 
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingSystem || isGeneratingUser}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-600/50 text-sm font-medium flex items-center gap-2 hover:bg-indigo-600/30 transition-colors"
            >
                <Sparkles size={16} />
                {isGeneratingSystem || isGeneratingUser ? 'Формирование...' : 'Сформировать промпт'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Left Column: System & User Prompts (The Result) */}
            <div className="w-full lg:w-1/2 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800 space-y-6">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">Готовый промпт</h3>
                
                {/* System Prompt */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <Cpu size={16} className="text-purple-400" /> SYSTEM
                        </label>
                        <button type="button" onClick={() => copyToClipboard(formData.systemContent)} className="text-slate-500 hover:text-white p-1"><Copy size={14}/></button>
                    </div>
                    <textarea
                        value={formData.systemContent}
                        onChange={e => setFormData({...formData, systemContent: e.target.value})}
                        className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                        placeholder="Системная инструкция..."
                    />
                </div>

                {/* User Prompt */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <User size={16} className="text-blue-400" /> USER
                        </label>
                        <button type="button" onClick={() => copyToClipboard(formData.userContent)} className="text-slate-500 hover:text-white p-1"><Copy size={14}/></button>
                    </div>
                    <textarea
                        value={formData.userContent}
                        onChange={e => setFormData({...formData, userContent: e.target.value})}
                        className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                        placeholder="Запрос пользователя..."
                    />
                </div>

                {/* Basic Info (Title, etc.) - moved here to save vertical space on right */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Метаданные</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            placeholder="Название"
                        />
                         <select
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value as any})}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                        >
                            {Object.values(Category).filter(c => c !== Category.ALL).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                        placeholder="Краткое описание"
                    />
                     <div className="grid grid-cols-2 gap-4">
                         <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" placeholder="Теги (через запятую)" />
                         <input type="text" value={formData.modelRecommendation} onChange={e => setFormData({...formData, modelRecommendation: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white" placeholder="Модель (Gemini, GPT-4...)" />
                    </div>
                </div>
            </div>

            {/* Right Column: Components Builder */}
            <div className="w-full lg:w-1/2 p-6 overflow-y-auto bg-slate-950">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Компоненты промпта</h3>
                    <select 
                        value={selectedStructureId} 
                        onChange={(e) => handleStructureChange(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 px-2 py-1"
                    >
                        <option value="">Выбрать структуру...</option>
                        {structures.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>

                <div className="space-y-3 mb-4">
                    {localComponents.map((comp, index) => (
                        <div 
                            key={comp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 group hover:border-indigo-500/30 transition-all"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <GripVertical size={16} className="text-slate-600 cursor-move" />
                                <input 
                                    type="text" 
                                    value={comp.label}
                                    onChange={(e) => handleComponentChange(comp.id, 'label', e.target.value)}
                                    className="bg-transparent text-sm font-bold text-indigo-300 outline-none w-full"
                                    placeholder="Название поля"
                                />
                                <select
                                    value={comp.target}
                                    onChange={(e) => handleComponentChange(comp.id, 'target', e.target.value)}
                                    className={`text-[10px] font-bold uppercase px-1 py-0.5 rounded outline-none border-none cursor-pointer ${comp.target === 'SYSTEM' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}
                                >
                                    <option value="SYSTEM">SYSTEM</option>
                                    <option value="USER">USER</option>
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => appendToContent(comp.target, comp.value)}
                                    title={`Добавить в ${comp.target}`}
                                    className="text-slate-500 hover:text-indigo-400 p-1"
                                >
                                    <Plus size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveComponent(comp.id)}
                                    className="text-slate-600 hover:text-red-400 p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <textarea 
                                value={comp.value}
                                onChange={(e) => handleComponentChange(comp.id, 'value', e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:border-indigo-500/50 outline-none min-h-[60px] resize-y"
                                placeholder={`Введите содержание для ${comp.label}...`}
                            />
                        </div>
                    ))}
                </div>

                <button 
                    type="button"
                    onClick={handleAddComponent}
                    className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    <Plus size={16} /> Добавить компонент вручную
                </button>

                 {/* Extra fields like Example Output */}
                 <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Пример вывода (Опционально)</label>
                        <textarea
                            value={formData.exampleOutput || ''}
                            onChange={e => setFormData({...formData, exampleOutput: e.target.value})}
                            className="w-full h-20 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Заметки</label>
                         <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            className="w-full h-16 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                        />
                    </div>
                 </div>
            </div>
            
            {/* Floating Footer Action */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
                 <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                 >
                    Отмена
                 </button>
                 <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                 >
                    <Save size={18} />
                    Сохранить промпт
                 </button>
            </div>
        </form>
      </div>
    </div>
  );
};
