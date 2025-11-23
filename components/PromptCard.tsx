import React from 'react';
import { Prompt } from '../types';
import { Tag, Cpu, Copy } from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  onClick: (prompt: Prompt) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    // Could add a toast here, but keeping it simple
  };

  return (
    <div 
      onClick={() => onClick(prompt)}
      className="group relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          {prompt.category}
        </div>
        <button 
          onClick={handleCopy}
          className="text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-slate-800"
          title="Копировать промпт"
        >
          <Copy size={16} />
        </button>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
        {prompt.title}
      </h3>
      
      <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">
        {prompt.description}
      </p>

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-2">
          {prompt.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs flex items-center text-slate-500">
              <Tag size={10} className="mr-1" /> {tag}
            </span>
          ))}
        </div>
        
        <div className="pt-3 border-t border-slate-800 flex items-center text-xs text-indigo-400 font-mono">
          <Cpu size={12} className="mr-1.5" />
          {prompt.modelRecommendation}
        </div>
      </div>
    </div>
  );
};