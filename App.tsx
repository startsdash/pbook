
import React, { useState, useMemo, useRef } from 'react';
import { Prompt, Structure } from './types';
import { INITIAL_PROMPTS, INITIAL_STRUCTURES, INITIAL_CATEGORIES, INITIAL_TAGS } from './constants';
import { CategoryFilter } from './components/CategoryFilter';
import { PromptCard } from './components/PromptCard';
import { PromptDetailModal } from './components/PromptDetailModal';
import { PromptFormModal } from './components/PromptFormModal';
import { StructureManagerModal } from './components/StructureManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { Search, BookOpen, Plus, Layers, Download, Upload, Database, Settings } from 'lucide-react';
import { exportPromptsToExcel, parseExcelDatabase } from './utils/fileExport';

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS);
  const [structures, setStructures] = useState<Structure[]>(INITIAL_STRUCTURES);
  
  // Dynamic Categories & Tags
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [availableTags, setAvailableTags] = useState<string[]>(INITIAL_TAGS);

  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStructureManagerOpen, setIsStructureManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => {
      const matchesCategory = selectedCategory === 'Все' || prompt.category === selectedCategory;
      const matchesSearch = 
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, prompts]);

  // Handlers
  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setIsFormOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(null);
    setEditingPrompt(prompt);
    setIsFormOpen(true);
  };

  const handleSavePrompt = (promptData: Prompt) => {
    if (editingPrompt) {
        setPrompts(prev => prev.map(p => p.id === promptData.id ? promptData : p));
    } else {
        setPrompts(prev => [promptData, ...prev]);
    }
    
    // Auto-add new tags to available tags
    promptData.tags.forEach(tag => {
        if (!availableTags.includes(tag)) {
            setAvailableTags(prev => [...prev, tag]);
        }
    });

    setIsFormOpen(false);
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    setSelectedPrompt(null);
  };

  const handleExportDatabase = () => {
      exportPromptsToExcel(prompts, categories, availableTags);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const { prompts: importedPrompts, categories: importedCategories, tags: importedTags } = await parseExcelDatabase(file);
          
          if (importedPrompts.length > 0) {
              const confirmMessage = `Найдено ${importedPrompts.length} промптов.\n\n` +
                                     `OK — ПОЛНОСТЬЮ ЗАМЕНИТЬ текущую базу.\n` +
                                     `Отмена — ОБЪЕДИНИТЬ (существующие записи обновятся, новые добавятся).`;

              if (window.confirm(confirmMessage)) {
                  // Option 1: Replace Database completely
                  setPrompts(importedPrompts);
                  setCategories(importedCategories);
                  setAvailableTags(importedTags);
                  alert(`База успешно заменена. Загружено ${importedPrompts.length} промптов.`);
              } else {
                  // Option 2: Upsert / Merge
                  // Create a map of current prompts by ID
                  const promptMap = new Map(prompts.map(p => [p.id, p]));
                  
                  // Update existing or add new prompts from import
                  importedPrompts.forEach(p => {
                      promptMap.set(p.id, p);
                  });
                  
                  const mergedPrompts = Array.from(promptMap.values());
                  setPrompts(mergedPrompts);
                  
                  // Merge Categories (Set ensures uniqueness)
                  const mergedCategoriesSet = new Set([...categories, ...importedCategories]);
                  // Ensure 'Все' is preserved as the first item
                  const mergedCategories = ['Все', ...Array.from(mergedCategoriesSet).filter(c => c !== 'Все')];
                  setCategories(mergedCategories);
                  
                  // Merge Tags
                  const mergedTags = Array.from(new Set([...availableTags, ...importedTags]));
                  setAvailableTags(mergedTags);

                  alert(`База объединена. Всего промптов теперь: ${mergedPrompts.length}`);
              }
          } else {
              alert("Файл не содержит промптов.");
          }
      } catch (error) {
          console.error("Import failed", error);
          alert("Ошибка при чтении файла. Убедитесь, что это корректный Excel файл Prompt Book.");
      } finally {
          // Reset input to allow selecting the same file again if needed
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <BookOpen size={20} className="text-white" />
                </div>
                <h1 className="font-bold text-xl tracking-tight text-white">Prompt Book</h1>
            </div>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-500 hover:text-white transition-colors p-1"
                title="Настройки"
            >
                <Settings size={18} />
            </button>
        </div>
        
        <div className="p-4 pb-0 space-y-2">
            <button 
                onClick={handleCreatePrompt}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-900/20"
            >
                <Plus size={18} />
                Создать промпт
            </button>
            <button 
                onClick={() => setIsStructureManagerOpen(true)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
                <Layers size={18} />
                Структуры
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Библиотека</div>
          <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">База данных</div>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleExportDatabase}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 p-2 rounded-lg transition-all text-xs text-slate-400 hover:text-white"
                >
                    <Download size={16} className="text-emerald-500" />
                    Экспорт
                </button>
                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center gap-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 p-2 rounded-lg transition-all text-xs text-slate-400 hover:text-white"
                >
                    <Upload size={16} className="text-blue-500" />
                    Импорт
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <BookOpen size={20} className="text-indigo-500" />
                 <h1 className="font-bold text-lg">Prompt Book</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 p-2">
                    <Settings size={22} />
                </button>
                <button onClick={handleCreatePrompt} className="text-indigo-400 p-2">
                    <Plus size={24} />
                </button>
            </div>
        </div>

        {/* Top Bar */}
        <div className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Поиск промптов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
             <div className="text-xs text-slate-500 hidden sm:block">
                Powered by <span className="text-slate-300 font-medium">Gemini</span>
             </div>
          </div>
        </div>

        {/* Prompts Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
             
             <div className="mb-6 flex items-baseline gap-2">
                <h2 className="text-2xl font-bold text-white">{selectedCategory}</h2>
                <span className="text-slate-500 text-sm">({filteredPrompts.length})</span>
             </div>

             {filteredPrompts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                    {filteredPrompts.map(prompt => (
                    <PromptCard 
                        key={prompt.id} 
                        prompt={prompt} 
                        onClick={setSelectedPrompt} 
                    />
                    ))}
                </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Ничего не найдено</p>
                 </div>
             )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedPrompt && (
        <PromptDetailModal 
          prompt={selectedPrompt} 
          onClose={() => setSelectedPrompt(null)} 
          onEdit={handleEditPrompt}
          onDelete={handleDeletePrompt}
        />
      )}

      {isFormOpen && (
        <PromptFormModal
            initialData={editingPrompt}
            structures={structures}
            categories={categories}
            availableTags={availableTags}
            onSave={handleSavePrompt}
            onClose={() => setIsFormOpen(false)}
        />
      )}

      {isStructureManagerOpen && (
          <StructureManagerModal
            structures={structures}
            onUpdateStructures={setStructures}
            onClose={() => setIsStructureManagerOpen(false)}
          />
      )}

      {isSettingsOpen && (
          <SettingsModal
            categories={categories}
            setCategories={setCategories}
            tags={availableTags}
            setTags={setAvailableTags}
            onClose={() => setIsSettingsOpen(false)}
          />
      )}
    </div>
  );
}
