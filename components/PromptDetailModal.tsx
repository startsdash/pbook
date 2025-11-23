
import React, { useState } from 'react';
import { Prompt } from '../types';
import { X, Copy, Check, Edit, Trash2, Layers, User, Cpu, Download, FileText, FileJson, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { exportPromptToMarkdown, exportPromptToJson } from '../utils/fileExport';

interface PromptDetailModalProps {
  prompt: Prompt;
  onClose: () => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
}

export const PromptDetailModal: React.FC<PromptDetailModalProps> = ({ prompt, onClose, onEdit, onDelete }) => {
  const [copiedSystem, setCopiedSystem] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const copyToClipboard = (text: string, isSystem: boolean) => {
    navigator.clipboard.writeText(text);
    if (isSystem) {
        setCopiedSystem(true);
        setTimeout(() => setCopiedSystem(false), 2000);
    } else {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2000);
    }
  };

  const handleDelete = () => {
      onDelete(prompt.id);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 
          Fixed height on desktop (h-[90vh]) ensures the internal overflow works correctly.
          Flex layout handles the header vs content area.
      */}
      <div className="relative w-full max-w-6xl bg-slate-900 sm:rounded-2xl shadow-2xl border border-slate-800 flex flex-col h-full sm:h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 gap-4 sm:gap-0 shrink-0">
            <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-start justify-between">
                     <h2 className="text-lg sm:text-xl font-bold text-white leading-tight break-words">
                        {prompt.title}
                    </h2>
                     {/* Mobile Close Button (top-right absolute for easy reach) */}
                     <button onClick={onClose} className="sm:hidden text-slate-400 hover:text-white p-1 -mt-1 -mr-1">
                        <X size={24} />
                    </button>
                </div>
               
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[150px]">
                        {prompt.category}
                    </span>
                    {prompt.verificationStatus === 'VERIFIED' ? (
                        <span className="flex items-center text-xs font-bold text-emerald-400 gap-1">
                            <CheckCircle2 size={12} /> Проверено
                        </span>
                    ) : (
                        <span className="flex items-center text-xs font-bold text-amber-400 gap-1">
                            <Clock size={12} /> На проверке
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
                
                {/* Export Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
                    >
                        <Download size={14} />
                        Экспорт
                        <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showExportMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                            <div className="absolute top-full right-0 sm:right-0 left-0 sm:left-auto mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                <button 
                                    onClick={() => { exportPromptToMarkdown(prompt); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                                >
                                    <FileText size={16} className="text-indigo-400" />
                                    Markdown (.md)
                                </button>
                                <button 
                                    onClick={() => { exportPromptToJson(prompt); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left border-t border-slate-800"
                                >
                                    <FileJson size={16} className="text-amber-400" />
                                    JSON (.json)
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

                {!showDeleteConfirm ? (
                    <div className="flex items-center">
                        <button 
                            onClick={() => onEdit(prompt)}
                            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors mr-1"
                            title="Редактировать"
                        >
                            <Edit size={20} />
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-slate-400 hover:text-red-400 p-2 rounded-full hover:bg-slate-800 transition-colors"
                            title="Удалить"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-red-900/20 border border-red-900/50 rounded-lg px-2 py-1">
                        <span className="text-xs text-red-300 whitespace-nowrap">Удалить?</span>
                        <button onClick={handleDelete} className="text-red-400 hover:text-red-200 text-xs font-bold px-2 py-1 hover:bg-red-900/50 rounded">Да</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 hover:bg-slate-800 rounded">Нет</button>
                    </div>
                )}
                
                <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>
                
                <button onClick={onClose} className="hidden sm:block text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                    <X size={24} />
                </button>
            </div>
        </div>

        {/* 
            Content Area 
            min-h-0 is crucial for nested flex scrolling 
        */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-slate-950">
            
            {/* Main Content: System & User Prompts */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                
                {/* System Prompt */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
                            <Cpu size={16} />
                            System Instruction
                        </div>
                        <button 
                            onClick={() => copyToClipboard(prompt.systemContent, true)}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-white transition-colors bg-slate-800 px-2 py-1 rounded hover:bg-slate-700"
                        >
                            {copiedSystem ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            {copiedSystem ? 'Скопировано' : 'Копировать'}
                        </button>
                    </div>
                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 font-mono text-sm text-slate-300 whitespace-pre-wrap break-words relative group">
                        {prompt.systemContent || <span className="text-slate-600 italic">System prompt отсутствует</span>}
                    </div>
                </div>

                {/* User Prompt */}
                <div className="space-y-2 pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold uppercase tracking-wider">
                            <User size={16} />
                            User Prompt
                        </div>
                        <button 
                            onClick={() => copyToClipboard(prompt.userContent, false)}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-white transition-colors bg-slate-800 px-2 py-1 rounded hover:bg-slate-700"
                        >
                            {copiedUser ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            {copiedUser ? 'Скопировано' : 'Копировать'}
                        </button>
                    </div>
                    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
                        {prompt.userContent || <span className="text-slate-600 italic">User prompt отсутствует</span>}
                    </div>
                </div>
            </div>

            {/* Sidebar: Info & Components */}
            {/* Using explicit width (w-80/w-96) prevents squeezing of main content and overlaps. Added scrollbar styles. */}
            <div className="w-full lg:w-80 xl:w-96 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 overflow-y-auto shrink-0 scrollbar-thin scrollbar-thumb-slate-800">
                 <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Описание</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{prompt.description}</p>
                 </div>

                 <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Layers size={14} />
                        Структура
                    </h3>
                    
                    {prompt.components && prompt.components.length > 0 ? (
                        <div className="space-y-2">
                            {prompt.components.map((comp, idx) => (
                                <div key={comp.id || idx} className="bg-slate-950 border border-slate-800 rounded p-2 text-xs">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-indigo-300">{comp.label}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${comp.target === 'SYSTEM' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                            {comp.target}
                                        </span>
                                    </div>
                                    <div className="text-slate-500 line-clamp-3 break-words">{comp.value}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-600 italic">Компоненты не заданы</div>
                    )}
                 </div>

                 <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Теги</h3>
                    <div className="flex flex-wrap gap-2">
                        {prompt.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {tag}
                            </span>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
