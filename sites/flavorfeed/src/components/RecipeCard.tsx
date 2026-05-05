import React, { useState } from 'react';
import { Recipe } from '../types';
import { User as AuthUser } from 'firebase/auth';
import { Heart, Clock, Utensils, ChevronRight } from 'lucide-react';
import { doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import RecipeModal from './RecipeModal';
import { motion, AnimatePresence } from 'motion/react';

interface RecipeCardProps {
  recipe: Recipe;
  currentUser: AuthUser | null;
}

export default function RecipeCard({ recipe, currentUser }: RecipeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  // Check if liked on mount/auth change
  React.useEffect(() => {
    if (!currentUser) return;
    const checkLike = async () => {
      const likeDoc = await getDoc(doc(db, 'recipes', recipe.id, 'likes', currentUser.uid));
      setLiked(likeDoc.exists());
    };
    checkLike();
  }, [currentUser, recipe.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const likeRef = doc(db, 'recipes', recipe.id, 'likes', currentUser.uid);
    const recipeRef = doc(db, 'recipes', recipe.id);

    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(recipeRef, { likesCount: recipe.likesCount - 1 });
        setLiked(false);
      } else {
        await setDoc(likeRef, { uid: currentUser.uid });
        await updateDoc(recipeRef, { likesCount: recipe.likesCount + 1 });
        setLiked(true);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `recipes/${recipe.id}`);
    }
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white rounded-[2rem] overflow-hidden border border-olive/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
        id={`recipe-card-${recipe.id}`}
      >
        <div className="aspect-square relative overflow-hidden">
          <img 
            src={recipe.imageURL} 
            alt={recipe.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <button 
            onClick={handleLike}
            className={cn(
              "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all",
              liked ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/40"
            )}
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-serif text-2xl text-gray-900 group-hover:text-olive transition-colors">{recipe.title}</h3>
            <div className="flex items-center gap-1 text-olive/60 font-medium text-sm">
              <span>{recipe.likesCount || 0}</span>
              <Heart size={14} />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 text-xs text-gray-500 uppercase tracking-widest font-semibold">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{recipe.steps.length * 5} MIN</span>
            </div>
            <div className="flex items-center gap-1">
              <Utensils size={12} />
              <span>{recipe.ingredients.length} INGRID.</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {Object.entries(recipe.macros).map(([key, val]) => (
              <div key={key} className="bg-olive/5 rounded-xl p-2 text-center">
                <span className="block text-[10px] uppercase text-olive/60 font-bold leading-none mb-1">{key.slice(0, 3)}</span>
                <span className="block text-xs font-bold text-olive">{Math.round(val)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center overflow-hidden">
                {recipe.authorPhoto ? (
                  <img src={recipe.authorPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] font-bold text-olive uppercase">{recipe.authorName?.charAt(0)}</span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-600">{recipe.authorName}</span>
            </div>
            
            <div className="text-olive flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View Recipe</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <RecipeModal 
            recipe={recipe} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
