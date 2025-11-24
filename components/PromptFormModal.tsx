
import React, { useState, useEffect } from 'react';
import { Prompt, Structure, PromptComponent, TargetType, VerificationStatus } from '../types';
import { X, Save, Plus, GripVertical, Trash2, Copy, Sparkles, Cpu, User, CheckCircle2, Clock } from 'lucide-react';
import { assemblePromptWithAI } from '../services/geminiService';

interface PromptFormModalProps {
  initialData?: Prompt | null;
  structures: Structure[];
  categories: string[];
  availableTags: string[];
  onSave: (prompt: Prompt) => void;
  onClose: () => void;
}

const EMPTY_PROMPT: Partial<Prompt> = {
  title: '',
  category: 'Работа с текстом',
  tags: [],
  systemContent: '',
  userContent: '',
  description: '',
  verificationStatus: 'ON_REVIEW',
  components: []
};

export const PromptFormModal: React.FC<PromptFormModalProps> = ({ initialData, structures, categories, availableTags, onSave, onClose }) => {
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
      // Reset logic for new prompt
      setTagInput('');
      setLocalComponents([]);
      setSelectedStructureId('');
    }
  }, [initialData]);

  // Handle Structure Selection
  const handleStructureChange = (structId: string) => {
    setSelectedStructureId(structId);
    const struct = structures.find(s => s.id === structId);
    if (struct) {
        // Create new components based on structure defaults
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

  // Drag & Drop
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

  // Appending values
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
      setIsGeneratingSystem(true);
      const systemResult = await assemblePromptWithAI(localComponents, 'SYSTEM');
      setFormData(prev => ({ ...prev, systemContent: systemResult }));
      setIsGeneratingSystem(false);

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

  const addTag = (tag: string) => {
      const currentTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
      if (!currentTags.includes(tag)) {
          const newTags = [...currentTags, tag].join(', ');
          setTagInput(newTags);
      }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 
         Fixed height using dvh for mobile address bar compatibility.
         Flex column layout to organize Header - Content - Footer.
      */}
      <div className="relative w-full max-w-6xl bg-slate-900 sm:rounded-2xl shadow-2xl border border-slate-800 flex flex-col h-[100dvh] sm:h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 gap-4 sm:gap-0 shrink-0">
          <h2 className="text-xl font-bold text-white order-1">
            {initialData ? 'Редактировать промпт' : 'Новый промпт'}
          </h2>
          
          <div className="flex items-center gap-2 order-2 sm:order-2 self-end sm:self-auto">
             {/* Mobile Close Button (absolute top right) */}
             <button onClick={onClose} className="sm:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>

            <button 
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingSystem || isGeneratingUser}
                className="px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-600/50 text-xs sm:text-sm font-medium flex items-center gap-2 hover:bg-indigo-600/30 transition-colors"
            >
                <Sparkles size={16} />
                {isGeneratingSystem || isGeneratingUser ? '...' : 'AI Сборка'}
            </button>
            <button onClick={onClose} className="hidden sm:block text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* 
            Form Content 
            Mobile: Single vertical scroll for the whole form.
            Desktop: Hidden overflow on container, independent scroll for columns.
        */}
        <form 
            id="prompt-form"
            onSubmit={handleSubmit} 
            className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative bg-slate-950"
        >
            
            {/* Left Column: Result & Inputs */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 h-auto lg:h-full lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-800 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                
                {/* Meta Fields */}
                <div className="space-y-4">
                    <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-medium focus:border-indigo-500 outline-none placeholder-slate-500"
                        placeholder="Название промпта"
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Категория</label>
                             <select
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 sm:p-2 text-sm text-white focus:border-indigo-500 outline-none"
                            >
                                {categories.filter(c => c !== 'Все').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Статус</label>
                            <div className="flex bg-slate-950 rounded border border-slate-700 p-1">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, verificationStatus: 'ON_REVIEW'})}
                                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 sm:py-1 rounded ${formData.verificationStatus === 'ON_REVIEW' ? 'bg-amber-900/40 text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Clock size={12} /> На проверке
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, verificationStatus: 'VERIFIED'})}
                                    className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 sm:py-1 rounded ${formData.verificationStatus === 'VERIFIED' ? 'bg-emerald-900/40 text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <CheckCircle2 size={12} /> Проверено
                                </button>
                            </div>
                        </div>
                    </div>

                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none h-20 placeholder-slate-500"
                        placeholder="Краткое описание того, что делает этот промпт..."
                    />

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Метки</label>
                         <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 sm:p-2 text-sm text-white focus:border-indigo-500 outline-none mb-2" placeholder="SEO, Code, Marketing..." />
                         {availableTags.length > 0 && (
                             <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                                 {availableTags.map(t => {
                                     const isSelected = tagInput.split(',').map(tag => tag.trim().toLowerCase()).includes(t.toLowerCase());
                                     return (
                                        <button 
                                            type="button" 
                                            key={t} 
                                            onClick={() => addTag(t)} 
                                            className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                                                isSelected 
                                                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40 cursor-default opacity-60' 
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-white'
                                            }`}
                                        >
                                            {isSelected ? t : `+ ${t}`}
                                        </button>
                                     );
                                 })}
                             </div>
                         )}
                    </div>
                </div>

                <div className="h-px bg-slate-800 my-4"></div>

                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Контент</h3>

                {/* System Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
                            <Cpu size={14} className="text-purple-400" /> SYSTEM INSTRUCTION
                        </label>
                        <button type="button" onClick={() => copyToClipboard(formData.systemContent)} className="text-slate-500 hover:text-white p-1"><Copy size={12}/></button>
                    </div>
                    <textarea
                        value={formData.systemContent}
                        onChange={e => setFormData({...formData, systemContent: e.target.value})}
                        className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                        placeholder="Системная роль и правила..."
                    />
                </div>

                {/* User Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-300">
                            <User size={14} className="text-blue-400" /> USER PROMPT
                        </label>
                        <button type="button" onClick={() => copyToClipboard(formData.userContent)} className="text-slate-500 hover:text-white p-1"><Copy size={12}/></button>
                    </div>
                    <textarea
                        value={formData.userContent}
                        onChange={e => setFormData({...formData, userContent: e.target.value})}
                        className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-y"
                        placeholder="Запрос пользователя..."
                    />
                </div>
            </div>

            {/* Right Column: Components Builder */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 h-auto lg:h-full lg:overflow-y-auto bg-slate-900 border-t lg:border-t-0 border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Конструктор</h3>
                    <select 
                        value={selectedStructureId} 
                        onChange={(e) => handleStructureChange(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 px-2 py-2 focus:border-indigo-500 outline-none w-full sm:w-auto"
                    >
                        <option value="">Шаблон структуры...</option>
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
                                <GripVertical size={16} className="text-slate-600 cursor-move shrink-0" />
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
                                    className={`text-[10px] font-bold uppercase px-1 py-0.5 rounded outline-none border-none cursor-pointer shrink-0 ${comp.target === 'SYSTEM' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}
                                >
                                    <option value="SYSTEM">SYSTEM</option>
                                    <option value="USER">USER</option>
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => appendToContent(comp.target, comp.value)}
                                    title={`Добавить в ${comp.target}`}
                                    className="text-slate-500 hover:text-indigo-400 p-1 shrink-0"
                                >
                                    <Plus size={16} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveComponent(comp.id)}
                                    className="text-slate-600 hover:text-red-400 p-1 shrink-0"
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
                    className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    <Plus size={16} /> Добавить компонент вручную
                </button>
            </div>
        </form>
            
        {/* Footer for Save/Cancel - Now OUTSIDE the form, stays fixed at bottom */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm sm:text-base"
                >
                Отмена
                </button>
                <button
                type="submit"
                form="prompt-form" // Links to the form ID
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-sm sm:text-base"
                >
                <Save size={18} />
                Сохранить
                </button>
        </div>
      </div>
    </div>
  );
};
