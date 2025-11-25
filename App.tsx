
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Prompt, Structure } from './types';
import { INITIAL_PROMPTS, INITIAL_STRUCTURES, INITIAL_CATEGORIES, INITIAL_TAGS } from './constants';
import { CategoryFilter } from './components/CategoryFilter';
import { PromptCard } from './components/PromptCard';
import { PromptDetailModal } from './components/PromptDetailModal';
import { PromptFormModal } from './components/PromptFormModal';
import { StructureManagerModal } from './components/StructureManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { Search, BookOpen, Plus, Layers, Download, Upload, Settings, Menu, X, Cloud, RefreshCw } from 'lucide-react';
import { exportPromptsToExcel, parseExcelDatabase } from './utils/fileExport';
import { BackupData, initGoogleDrivePromise, checkForRemoteBackup, downloadBackup, isSignedIn, uploadBackup } from './services/googleDriveService';

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS);
  const [structures, setStructures] = useState<Structure[]>(INITIAL_STRUCTURES);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [availableTags, setAvailableTags] = useState<string[]>(INITIAL_TAGS);

  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStructureManagerOpen, setIsStructureManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDriveConnected, setDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false); // New flag to prevent initial overwrite
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<{title: string, action?: () => void, actionLabel?: string, onClose?: () => void} | null>(null);

  // Auto-save logic
  useEffect(() => {
    // Only auto-save if Drive is connected AND Sync is explicitly enabled (conflict resolved)
    if (!isDriveConnected || !isSyncEnabled) return;

    const autoSave = async () => {
        setIsSyncing(true);
        try {
            const now = new Date().toISOString();
            await uploadBackup({
                prompts,
                categories,
                tags: availableTags,
                structures,
                lastUpdated: now
            });
            localStorage.setItem('last_cloud_sync', now);
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSyncing(false);
        }
    };

    // Debounce: Wait 2 seconds after last change before saving
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [prompts, categories, availableTags, structures, isDriveConnected, isSyncEnabled]);

  // Init Google Drive & Auto-Load Check
  useEffect(() => {
      let mounted = true;

      const initDrive = async () => {
          try {
              await initGoogleDrivePromise();
              
              if (!mounted) return;

              const connected = isSignedIn();
              setDriveConnected(connected);

              if (connected) {
                  // Check cloud status BEFORE enabling sync
                  const result = await checkForRemoteBackup();
                  
                  if (!mounted) return;

                  if (result && result.exists && result.modifiedTime) {
                      const localLastSync = localStorage.getItem('last_cloud_sync');
                      const cloudTime = new Date(result.modifiedTime).getTime();
                      const localTime = localLastSync ? new Date(localLastSync).getTime() : 0;
                      
                      // Threshold to ignore minor clock differences
                      const isCloudNewer = cloudTime > localTime + 2000;

                      if (isCloudNewer) {
                          // Cloud is newer: Show toast, keep sync DISABLED until user decides
                          setToastMessage({
                              title: 'Доступна новая версия в облаке',
                              actionLabel: 'Загрузить',
                              action: async () => {
                                  try {
                                      setIsSyncing(true);
                                      const data = await downloadBackup();
                                      handleCloudRestore(data, true);
                                      setToastMessage(null);
                                      setIsSyncEnabled(true); // Enable sync after download
                                  } catch (e) {
                                      alert('Ошибка загрузки бэкапа');
                                  } finally {
                                      setIsSyncing(false);
                                  }
                              },
                              onClose: () => {
                                  // User closed toast -> "Keep Local" -> Enable sync (will overwrite cloud eventually)
                                  setIsSyncEnabled(true);
                                  setToastMessage(null);
                              }
                          });
                      } else {
                          // Local is up to date or newer -> Enable sync immediately
                          setIsSyncEnabled(true);
                      }
                  } else {
                      // No backup exists -> Enable sync to create one
                      setIsSyncEnabled(true);
                  }
              }
          } catch (e) {
              console.error("Auto-sync init failed", e);
          }
      };

      initDrive();
      
      return () => { mounted = false; };
  }, [isCloudSyncOpen]); 

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
      exportPromptsToExcel(prompts, categories, availableTags, structures);
      setIsMobileMenuOpen(false);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
      setIsMobileMenuOpen(false);
  };

  const handleCategorySelect = (category: string) => {
      setSelectedCategory(category);
      setIsMobileMenuOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const { 
              prompts: importedPrompts, 
              categories: importedCategories, 
              tags: importedTags,
              structures: importedStructures
          } = await parseExcelDatabase(file);
          
          if (importedPrompts.length > 0) {
              const confirmMessage = `Найдено ${importedPrompts.length} промптов.\n\n` +
                                     `OK — ПОЛНОСТЬЮ ЗАМЕНИТЬ текущую базу.\n` +
                                     `Отмена — ОБЪЕДИНИТЬ (существующие записи обновятся, новые добавятся).`;

              if (window.confirm(confirmMessage)) {
                  setPrompts(importedPrompts);
                  setCategories(importedCategories);
                  setAvailableTags(importedTags);
                  if (importedStructures.length > 0) {
                      setStructures(importedStructures);
                  }
                  alert(`База успешно заменена. Загружено ${importedPrompts.length} промптов.`);
              } else {
                  const promptMap = new Map(prompts.map(p => [p.id, p]));
                  importedPrompts.forEach(p => {
                      promptMap.set(p.id, p);
                  });
                  const mergedPrompts = Array.from(promptMap.values());
                  setPrompts(mergedPrompts);
                  
                  const mergedCategoriesSet = new Set([...categories, ...importedCategories]);
                  const mergedCategories = ['Все', ...Array.from(mergedCategoriesSet).filter(c => c !== 'Все')];
                  setCategories(mergedCategories);
                  
                  const mergedTags = Array.from(new Set([...availableTags, ...importedTags]));
                  setAvailableTags(mergedTags);

                  if (importedStructures.length > 0) {
                      const structureMap = new Map(structures.map(s => [s.id, s]));
                      importedStructures.forEach(s => {
                          structureMap.set(s.id, s);
                      });
                      setStructures(Array.from(structureMap.values()));
                  }

                  alert(`База объединена. Всего промптов теперь: ${mergedPrompts.length}`);
              }
          } else {
              alert("Файл не содержит промптов.");
          }
      } catch (error) {
          console.error("Import failed", error);
          alert("Ошибка при чтении файла. Убедитесь, что это корректный Excel файл Prompt Book.");
      } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleCloudRestore = (data: BackupData, silent = false) => {
      const performRestore = () => {
          if (data.prompts) setPrompts(data.prompts);
          if (data.categories) setCategories(data.categories);
          if (data.tags) setAvailableTags(data.tags);
          if (data.structures) setStructures(data.structures);
          localStorage.setItem('last_cloud_sync', new Date().toISOString());
      };

      if (silent) {
          performRestore();
      } else {
          if (window.confirm(`Обнаружена резервная копия от ${new Date(data.lastUpdated).toLocaleString()}. Восстановить?`)) {
              performRestore();
              setIsSyncEnabled(true); // Enable sync after manual restore
          }
      }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[100] bg-slate-800 border border-indigo-500/50 shadow-2xl p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
              <div className="bg-indigo-500/20 p-2 rounded-full">
                  <Cloud size={20} className="text-indigo-400" />
              </div>
              <div>
                  <div className="text-sm font-semibold text-white">{toastMessage.title}</div>
                  <div className="text-xs text-slate-400">Синхронизация Google Drive</div>
              </div>
              {toastMessage.action && (
                  <button onClick={toastMessage.action} className="ml-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                      {toastMessage.actionLabel}
                  </button>
              )}
              <button onClick={() => toastMessage.onClose ? toastMessage.onClose() : setToastMessage(null)} className="text-slate-500 hover:text-white ml-1">
                  <X size={16} />
              </button>
          </div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <BookOpen size={20} className="text-white" />
                </div>
                <h1 className="font-bold text-xl tracking-tight text-white">Prompt Book</h1>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }} className="text-slate-500 hover:text-white transition-colors p-2">
                    <Settings size={20} />
                </button>
                <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-white transition-colors p-2">
                    <X size={24} />
                </button>
            </div>
        </div>
        
        <div className="p-4 pb-0 space-y-2">
            <button onClick={() => { handleCreatePrompt(); setIsMobileMenuOpen(false); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-900/20 active:scale-95 duration-100">
                <Plus size={18} /> Создать промпт
            </button>
            <button onClick={() => { setIsStructureManagerOpen(true); setIsMobileMenuOpen(false); }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors active:scale-95 duration-100">
                <Layers size={18} /> Структуры
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-4">Библиотека</div>
          <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelect={handleCategorySelect} />
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3 pb-8 md:pb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">База данных</div>
            <button onClick={() => { setIsCloudSyncOpen(true); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 p-3 rounded-lg transition-all text-sm text-slate-300 hover:text-white group relative">
                {isSyncing ? <RefreshCw size={18} className="text-blue-500 animate-spin" /> : <Cloud size={18} className={`text-blue-500 group-hover:text-blue-400 ${!isSyncEnabled && isDriveConnected ? 'opacity-50' : ''}`} />}
                Google Drive
                {isDriveConnected && !isSyncing && <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isSyncEnabled ? 'bg-green-500' : 'bg-amber-500'}`}></div>}
            </button>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={handleExportDatabase} className="flex flex-col items-center justify-center gap-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 p-3 rounded-lg transition-all text-xs text-slate-400 hover:text-white active:bg-slate-800">
                    <Download size={18} className="text-emerald-500 mb-1" /> Экспорт
                </button>
                <button onClick={handleImportClick} className="flex flex-col items-center justify-center gap-1 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 p-3 rounded-lg transition-all text-xs text-slate-400 hover:text-white active:bg-slate-800">
                    <Upload size={18} className="text-blue-500 mb-1" /> Импорт
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <div className="md:hidden p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
                 <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300 hover:text-white p-1">
                    <Menu size={24} />
                 </button>
                 <div className="flex items-center gap-2">
                    <BookOpen size={20} className="text-indigo-500" />
                    <h1 className="font-bold text-lg">Prompt Book</h1>
                 </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsCloudSyncOpen(true)} className="text-slate-400 p-2 rounded-full hover:bg-slate-800 relative">
                    {isSyncing ? <RefreshCw size={22} className="animate-spin text-blue-500"/> : <Cloud size={22} />}
                    {isDriveConnected && !isSyncing && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full border border-slate-950 ${isSyncEnabled ? 'bg-green-500' : 'bg-amber-500'}`}></div>}
                </button>
            </div>
        </div>

        <div className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center px-4 md:px-6 sticky top-16 md:top-0 z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="Поиск промптов..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-all text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
             <div className="mb-6 flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-white">{selectedCategory}</h2>
                <span className="text-slate-500 text-sm">({filteredPrompts.length})</span>
             </div>

             {filteredPrompts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20 md:pb-10">
                    {filteredPrompts.map(prompt => (
                    <PromptCard key={prompt.id} prompt={prompt} onClick={setSelectedPrompt} />
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

      {selectedPrompt && <PromptDetailModal prompt={selectedPrompt} onClose={() => setSelectedPrompt(null)} onEdit={handleEditPrompt} onDelete={handleDeletePrompt} />}
      {isFormOpen && <PromptFormModal initialData={editingPrompt} structures={structures} categories={categories} availableTags={availableTags} onSave={handleSavePrompt} onClose={() => setIsFormOpen(false)} />}
      {isStructureManagerOpen && <StructureManagerModal structures={structures} onUpdateStructures={setStructures} onClose={() => setIsStructureManagerOpen(false)} />}
      {isSettingsOpen && <SettingsModal categories={categories} setCategories={setCategories} tags={availableTags} setTags={setAvailableTags} onClose={() => setIsSettingsOpen(false)} />}
      {isCloudSyncOpen && <CloudSyncModal prompts={prompts} categories={categories} tags={availableTags} structures={structures} onRestore={handleCloudRestore} onClose={() => setIsCloudSyncOpen(false)} />}
    </div>
  );
}
