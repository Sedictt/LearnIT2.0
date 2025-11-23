export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  IDENTIFICATION = 'IDENTIFICATION',
  ENUMERATION = 'ENUMERATION'
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For Multiple Choice
  answer: string | string[]; // Array for Enumeration
  author: string;
  createdAt: number;
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  purpose: string;
  examDate: string;
  author: string;
  questionCount: number;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: any;
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface GameSession {
  id: string;
  deckId: string;
  deckTitle: string;
  hostId: string;
  status: GameStatus;
  currentQuestionIndex: number;
  players: Record<string, Player>; // Map player ID to Player object
  showAnswer: boolean; // Whether to reveal the answer to players
  createdAt: number;
}
