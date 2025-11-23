import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, getDoc, setDoc, query, where, getDocs, orderBy, increment } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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

// Ensure user is signed in anonymously for security rules interaction (if any)
signInAnonymously(auth).catch((error) => {
  console.error("Auth Error", error);
});

// Helper for simplified DB access
export const dbService = {
  createDeck: async (data: any) => {
    return addDoc(collection(db, 'decks'), { ...data, createdAt: Date.now(), questionCount: 0 });
  },
  getDecks: (callback: (decks: any[]) => void) => {
    const q = query(collection(db, 'decks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const decks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(decks);
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
  }
};
