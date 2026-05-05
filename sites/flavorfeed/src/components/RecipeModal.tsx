import React from 'react';
import { Recipe } from '../types';
import { motion } from 'motion/react';
import { X, Clock, Users, Flame, Info } from 'lucide-react';
import { formatDate } from '../lib/utils';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-olive/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full md:w-2/5 h-64 md:h-auto relative">
          <img 
            src={recipe.imageURL} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl text-gray-900 mb-2">{recipe.title}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                <span>By {recipe.authorName}</span>
                <span>•</span>
                <span>{formatDate(recipe.createdAt?.toDate ? recipe.createdAt.toDate() : new Date())}</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-olive/40 hover:text-olive hidden md:block"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-warm-bg border border-olive/5">
              <Flame size={20} className="text-orange-500 mb-2" />
              <span className="text-2xl font-serif font-bold text-olive">{recipe.macros.calories}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Calories</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-warm-bg border border-olive/5">
              <Clock size={20} className="text-olive/60 mb-2" />
              <span className="text-2xl font-serif font-bold text-olive">{recipe.steps.length * 5}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Minutes</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-warm-bg border border-olive/5">
               <span className="text-2xl font-serif font-bold text-olive">{recipe.macros.protein}g</span>
               <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Protein</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-warm-bg border border-olive/5">
               <span className="text-2xl font-serif font-bold text-olive">{recipe.macros.fat}g</span>
               <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Fat</span>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h3 className="font-serif text-2xl mb-4 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-olive/20" />
                Ingredients
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {recipe.ingredients.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-olive/20 group-hover:bg-olive transition-colors" />
                    <span className="text-gray-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-serif text-2xl mb-4 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-olive/20" />
                Preparation
              </h3>
              <div className="space-y-6">
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="font-serif italic text-2xl text-olive/20 shrink-0 leading-none">0{i+1}</span>
                    <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-12 p-6 rounded-3xl bg-olive text-white/90">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} />
              <h4 className="font-serif text-xl">Macro Breakdown</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Protein</span>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${(recipe.macros.protein * 4 / recipe.macros.calories) * 100}%` }} />
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Carbs</span>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${(recipe.macros.carbs * 4 / recipe.macros.calories) * 100}%` }} />
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Fat</span>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/40" style={{ width: `${(recipe.macros.fat * 9 / recipe.macros.calories) * 100}%` }} />
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Calories</span>
                <span className="text-lg font-bold">{recipe.macros.calories} kcal</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
