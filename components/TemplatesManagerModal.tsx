
import React from 'react';
import { Template } from '../types';
import { X, Copy, Trash2, LayoutTemplate, Plus } from 'lucide-react';

interface TemplatesManagerModalProps {
  templates: Template[];
  onCreateFromTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onClose: () => void;
}

export const TemplatesManagerModal: React.FC<TemplatesManagerModalProps> = ({ templates, onCreateFromTemplate, onDeleteTemplate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-slate-900 sm:rounded-2xl shadow-2xl border border-slate-800 flex flex-col h-[90vh] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-pink-600/20 p-2 rounded-lg">
                <LayoutTemplate size={24} className="text-pink-500" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Шаблоны промптов</h2>
                <p className="text-xs text-slate-400">Сохраненные заготовки для быстрого старта</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
            {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 transition-all flex flex-col h-full group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-bold text-pink-400 bg-pink-900/20 px-2 py-1 rounded border border-pink-900/40">
                                    {tpl.category}
                                </span>
                                <button 
                                    onClick={() => {
                                        if (confirm('Удалить этот шаблон?')) onDeleteTemplate(tpl.id);
                                    }}
                                    className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Удалить шаблон"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{tpl.title}</h3>
                            <p className="text-sm text-slate-400 mb-4 line-clamp-3 flex-grow">{tpl.description || 'Нет описания'}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-800">
                                <button 
                                    onClick={() => onCreateFromTemplate(tpl)}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} /> Создать из шаблона
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <LayoutTemplate size={64} className="mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-slate-300 mb-1">Нет шаблонов</h3>
                    <p className="text-sm max-w-xs text-center">
                        Вы можете сохранить любой промпт как шаблон из карточки просмотра или редактирования.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
