
import React, { useState, useMemo } from 'react';
import { Category, Prompt, Structure } from './types';
import { INITIAL_PROMPTS, INITIAL_STRUCTURES } from './constants';
import { CategoryFilter } from './components/CategoryFilter';
import { PromptCard } from './components/PromptCard';
import { PromptDetailModal } from './components/PromptDetailModal';
import { PromptFormModal } from './components/PromptFormModal';
import { StructureManagerModal } from './components/StructureManagerModal';
import { Search, BookOpen, Sparkles, Plus, Layers } from 'lucide-react';

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS);
  const [structures, setStructures] = useState<Structure[]>(INITIAL_STRUCTURES);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStructureManagerOpen, setIsStructureManagerOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  // Filter prompts based on category and search query
  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => {
      const matchesCategory = selectedCategory === Category.ALL || prompt.category === selectedCategory;
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
    setIsFormOpen(false);
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    setSelectedPrompt(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-white">Prompt Book</h1>
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
                Структуры промпта
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Библиотека</div>
          <CategoryFilter selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold uppercase">Совет дня</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Разделяйте System и User промпты для лучшего контроля над поведением модели.
                </p>
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
                <button onClick={() => setIsStructureManagerOpen(true)} className="text-slate-400 p-2">
                    <Layers size={24} />
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
              placeholder="Поиск промптов, тегов или описаний..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
             <div className="text-xs text-slate-500 hidden sm:block">
                На базе <span className="text-slate-300 font-medium">Google Gemini</span>
             </div>
          </div>
        </div>

        {/* Prompts Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
             
             <div className="mb-6 flex items-baseline gap-2">
                <h2 className="text-2xl font-bold text-white">{selectedCategory}</h2>
                <span className="text-slate-500 text-sm">({filteredPrompts.length} промптов)</span>
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
                    <p className="text-lg font-medium">Промпты не найдены</p>
                    <p className="text-sm">Попробуйте изменить поисковый запрос или категорию.</p>
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
    </div>
  );
}
