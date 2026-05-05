import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { Recipe as RecipeType } from './types';
import Navbar from './components/Navbar';
import RecipeFeed from './components/RecipeFeed';
import CreateRecipeModal from './components/CreateRecipeModal';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<RecipeType[]>([]);
  const [isShowingCreate, setIsShowingCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ensure user exists in Firestore
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName || 'Home Cook',
            photoURL: u.photoURL || '',
            createdAt: serverTimestamp(),
          });
        }
      }
      setLoading(false);
    });

    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    const unsubscribeRecipes = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecipeType[];
      setRecipes(docs);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRecipes();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-bg">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-serif text-3xl text-olive italic"
        >
          FlavorFeed
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-bg pb-20">
      <Navbar user={user} onLogin={loginWithGoogle} onLogout={logout} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="font-serif text-5xl md:text-7xl mb-4">The Daily Feed</h1>
          <p className="text-gray-600 italic">Authentic recipes from kitchens around the world.</p>
        </header>

        <RecipeFeed recipes={recipes} currentUser={user} />
      </main>

      {user && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsShowingCreate(true)}
          className="fixed bottom-8 right-8 bg-olive text-white p-4 rounded-full shadow-xl z-40"
          id="add-recipe-btn"
        >
          <Plus size={24} />
        </motion.button>
      )}

      <AnimatePresence>
        {isShowingCreate && (
          <CreateRecipeModal 
            onClose={() => setIsShowingCreate(false)} 
            user={user!}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
