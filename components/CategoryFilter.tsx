
import React from 'react';
import { LayoutGrid, Hash } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedCategory, onSelect }) => {
  return (
    <nav className="space-y-1">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            selectedCategory === category
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <span className={`${selectedCategory === category ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
            {category === 'Все' ? <LayoutGrid size={18} /> : <Hash size={18} />}
          </span>
          {category}
        </button>
      ))}
    </nav>
  );
};
