import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, getDoc, setDoc, query, where, getDocs, orderBy, increment, deleteDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3zzWpVHOyXzpdRIcer4SgjsZsPp7Hf6I",
  authDomain: "learnit-f06cc.firebaseapp.com",
  projectId: "learnit-f06cc",
  storageBucket: "learnit-f06cc.firebasestorage.app",
  messagingSenderId: "25513139492",
  appId: "1:25513139492:web:a7162d91106b5e238767b1",
  measurementId: "G-DTSBCRMPGX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log("✅ Firebase initialized successfully");

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth Helper Functions
export const authService = {
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-Out Error:", error);
      throw error;
    }
  },
  onAuthChange: (callback: (user: any) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

// Helper for simplified DB access
export const dbService = {
  createDeck: async (data: any) => {
    try {
      const docRef = await addDoc(collection(db, 'decks'), { ...data, createdAt: Date.now(), questionCount: 0 });
      console.log(`✅ Created new deck with ID: ${docRef.id}`);
      return docRef;
    } catch (error: any) {
      console.error('❌ Failed to create deck:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check Firestore security rules.');
      }
      throw error;
    }
  },
  getDecks: (callback: (decks: any[]) => void) => {
    const q = query(collection(db, 'decks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`📚 Loaded ${decks.length} decks from database`);
      callback(decks);
    }, (error) => {
      console.error('❌ Failed to load decks:', error);
      if (error.code === 'permission-denied') {
        console.error('Permission denied. Please check Firestore security rules.');
      }
      callback([]);
    });
  },
  getDeck: async (id: string) => {
    const docRef = doc(db, 'decks', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  addQuestion: async (deckId: string, question: any) => {
    const deckRef = doc(db, 'decks', deckId);
    await addDoc(collection(db, `decks/${deckId}/questions`), { ...question, createdAt: Date.now() });
    await updateDoc(deckRef, { questionCount: increment(1) });
  },
  getQuestions: (deckId: string, callback: (questions: any[]) => void) => {
    const q = query(collection(db, `decks/${deckId}/questions`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(questions);
    });
  },
  updateQuestion: async (deckId: string, questionId: string, questionData: any) => {
    const questionRef = doc(db, `decks/${deckId}/questions`, questionId);
    await updateDoc(questionRef, { ...questionData, updatedAt: Date.now() });
  },
  deleteQuestion: async (deckId: string, questionId: string) => {
    const questionRef = doc(db, `decks/${deckId}/questions`, questionId);
    const deckRef = doc(db, 'decks', deckId);
    await deleteDoc(questionRef);
    await updateDoc(deckRef, { questionCount: increment(-1) });
  },
  createSession: async (deckId: string, deckTitle: string, hostId: string) => {
    return addDoc(collection(db, 'sessions'), {
      deckId,
      deckTitle,
      hostId,
      status: 'LOBBY',
      currentQuestionIndex: 0,
      players: {},
      showAnswer: false,
      createdAt: Date.now()
    });
  },
  joinSession: async (sessionId: string, playerId: string, playerName: string) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    // Note: In a real app, use a transaction or arrayUnion/map update pattern
    // Here we assume simple map update
    const key = `players.${playerId}`;
    await updateDoc(sessionRef, {
      [key]: { id: playerId, name: playerName, score: 0 }
    });
  },
  subscribeToSession: (sessionId: string, callback: (session: any) => void) => {
    return onSnapshot(doc(db, 'sessions', sessionId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      } else {
        callback(null);
      }
    });
  },
  updateSession: async (sessionId: string, data: any) => {
    await updateDoc(doc(db, 'sessions', sessionId), data);
  },
  submitFeedback: async (data: any) => {
    return addDoc(collection(db, 'feedback'), { ...data, status: 'pending' });
  },
  getFeedback: (callback: (feedback: any[]) => void) => {
    const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const feedback = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(feedback);
    });
  }
};
