export interface MacroFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  title: string;
  imageURL: string;
  ingredients: string[];
  steps: string[];
  macros: MacroFacts;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: any; // Firestore timestamp
  likesCount: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  createdAt: any;
}
