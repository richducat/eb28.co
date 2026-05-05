import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { X, Camera, Loader2, Wand2, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface CreateRecipeModalProps {
  onClose: () => void;
  user: User;
}

export default function CreateRecipeModal({ onClose, user }: CreateRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    steps: '',
    imageURL: ''
  });

  const generateMacros = async () => {
    if (!formData.ingredients || !formData.title) return;
    setLoading(true);
    try {
      const prompt = `Analyze the following recipe and provide estimated macro nutrients (calories, protein, carbs, fat) in a JSON format.
      Recipe Title: ${formData.title}
      Ingredients: ${formData.ingredients}
      Format: {"calories": number, "protein": number, "carbs": number, "fat": number}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const text = (response.text || '{}').replace(/```json|```/g, '').trim();
      const macros = JSON.parse(text);
      
      // Auto-generate a placeholder image URL using title if none exists
      const imageURL = formData.imageURL || `https://picsum.photos/seed/${encodeURIComponent(formData.title)}/800/800`;
      
      const newRecipe = {
        title: formData.title,
        ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
        steps: formData.steps.split('\n').filter(s => s.trim()),
        macros: macros,
        imageURL: imageURL,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        createdAt: serverTimestamp(),
        likesCount: 0
      };

      await addDoc(collection(db, 'recipes'), newRecipe);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error sharing recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-olive/20 backdrop-blur-sm shadow-2xl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-olive/5 flex justify-between items-center bg-warm-bg/50">
          <h2 className="font-serif text-3xl text-olive">Post a Recipe</h2>
          <button onClick={onClose} className="p-2 text-olive/40 hover:text-olive">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-olive/60 mb-2">Recipe Title</label>
            <input 
              type="text" 
              placeholder="e.g. Sourdough Pancakes"
              className="w-full bg-warm-bg border-none rounded-2xl p-4 text-xl font-serif focus:ring-1 focus:ring-olive/20"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-olive/60 mb-2">Ingredients (One per line)</label>
            <textarea 
              rows={5}
              placeholder="1 cup flour..."
              className="w-full bg-warm-bg border-none rounded-2xl p-4 focus:ring-1 focus:ring-olive/20 text-sm leading-relaxed"
              value={formData.ingredients}
              onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-olive/60 mb-2">Instructions (One step per line)</label>
            <textarea 
              rows={5}
              placeholder="Mix dry ingredients..."
              className="w-full bg-warm-bg border-none rounded-2xl p-4 focus:ring-1 focus:ring-olive/20 text-sm leading-relaxed"
              value={formData.steps}
              onChange={(e) => setFormData({...formData, steps: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-olive/60 mb-2">Image URL (Optional)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="https://..."
                className="flex-1 bg-warm-bg border-none rounded-2xl p-4 text-sm focus:ring-1 focus:ring-olive/20"
                value={formData.imageURL}
                onChange={(e) => setFormData({...formData, imageURL: e.target.value})}
              />
              <div className="bg-olive/10 text-olive p-4 rounded-2xl flex items-center justify-center">
                <Camera size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-warm-bg/50 border-t border-olive/5">
          <button 
            disabled={loading || !formData.title || !formData.ingredients || !formData.steps}
            onClick={generateMacros}
            className="w-full bg-olive text-white py-4 rounded-full font-bold text-lg shadow-xl shadow-olive/10 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                <span>AI Calculating Macros...</span>
              </>
            ) : (
              <>
                <Wand2 size={24} />
                <span>Publish to Feed</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
