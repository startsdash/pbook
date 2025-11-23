import React from 'react';
import { Category } from '../types';
import { LayoutGrid, User, Type, Lightbulb, Terminal, Image as ImageIcon } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: Category;
  onSelect: (category: Category) => void;
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  [Category.ALL]: <LayoutGrid size={18} />,
  [Category.ROLES]: <User size={18} />,
  [Category.TEXT]: <Type size={18} />,
  [Category.IDEAS]: <Lightbulb size={18} />,
  [Category.TECHNICAL]: <Terminal size={18} />,
  [Category.VISUAL]: <ImageIcon size={18} />,
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onSelect }) => {
  return (
    <nav className="space-y-1">
      {Object.values(Category).map((category) => (
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
            {CATEGORY_ICONS[category]}
          </span>
          {category}
        </button>
      ))}
    </nav>
  );
};