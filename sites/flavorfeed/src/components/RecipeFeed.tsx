import React from 'react';
import { Recipe } from '../types';
import RecipeCard from './RecipeCard';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';

interface RecipeFeedProps {
  recipes: Recipe[];
  currentUser: User | null;
}

export default function RecipeFeed({ recipes, currentUser }: RecipeFeedProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-olive/10">
        <p className="font-serif text-2xl text-olive/40 italic">No recipes yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="recipe-list">
      {recipes.map((recipe, index) => (
        <motion.div
          key={recipe.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <RecipeCard recipe={recipe} currentUser={currentUser} />
        </motion.div>
      ))}
    </div>
  );
}
