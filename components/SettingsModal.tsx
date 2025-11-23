
import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, LayoutGrid } from 'lucide-react';

interface SettingsModalProps {
  categories: string[];
  setCategories: (cats: string[]) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ categories, setCategories, tags, setTags, onClose }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    if (activeTab === 'categories') {
      if (!categories.includes(trimmed)) {
        setCategories([...categories, trimmed]);
      }
    } else {
      if (!tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
    }
    setNewValue('');
  };

  const handleDelete = (item: string) => {
    if (activeTab === 'categories') {
      // Don't delete 'Все' (All)
      if (item === 'Все') return;
      setCategories(categories.filter(c => c !== item));
    } else {
      setTags(tags.filter(t => t !== item));
    }
  };

  const currentList = activeTab === 'categories' ? categories : tags;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Настройки базы</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'categories' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutGrid size={16} /> Категории
          </button>
          <button 
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'tags' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Tag size={16} /> Метки (Теги)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
           
           <div className="flex gap-2 mb-4">
             <input 
               type="text" 
               value={newValue}
               onChange={(e) => setNewValue(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
               placeholder={activeTab === 'categories' ? "Новая категория..." : "Новая метка..."}
               className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
             />
             <button 
               onClick={handleAdd}
               className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg"
             >
               <Plus size={20} />
             </button>
           </div>

           <div className="space-y-2">
             {currentList.map(item => (
               <div key={item} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg group">
                 <span className="text-sm text-slate-300">{item}</span>
                 {item !== 'Все' && (
                   <button 
                     onClick={() => handleDelete(item)}
                     className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                 )}
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
