"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  Database,
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import type { WordPair } from "./word-pairs";

export type GamePhase = "lobby" | "clues" | "voting" | "reveal";

export type Player = {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  connected: boolean;
  clue?: string;
  vote?: string;
};

export type Room = {
  code: string;
  hostId: string;
  phase: GamePhase;
  round: number;
  pair?: WordPair;
  oddPlayerId?: string;
  usedPairIds: string[];
  turnIndex: number;
  deadline?: number;
  players: Record<string, Player>;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

let app: FirebaseApp | undefined;
let database: Database | undefined;

export function getRealtimeDatabase() {
  if (!firebaseEnabled) return undefined;
  app = app ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));
  database = database ?? getDatabase(app);
  return database;
}

export async function createRoom(room: Room) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await set(ref(db, `rooms/${room.code}`), room);
}

export async function joinRoom(code: string, player: Player) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await set(ref(db, `rooms/${code}/players/${player.id}`), player);
}

export function subscribeToRoom(code: string, callback: (room: Room | null) => void) {
  const db = getRealtimeDatabase();
  if (!db) return () => {};
  return onValue(ref(db, `rooms/${code}`), (snapshot) => callback(snapshot.val()));
}

export async function updateRoom(code: string, values: Partial<Room>) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await update(ref(db, `rooms/${code}`), values);
}

export async function submitClue(code: string, playerId: string, clue: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await update(ref(db, `rooms/${code}/players/${playerId}`), { clue });
}

export async function submitVote(code: string, playerId: string, targetId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await update(ref(db, `rooms/${code}/players/${playerId}`), { vote: targetId });
}

export async function leaveRoom(code: string, playerId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await remove(ref(db, `rooms/${code}/players/${playerId}`));
}

export function makePlayerId() {
  const db = getRealtimeDatabase();
  return db ? push(ref(db, "playerIds")).key! : crypto.randomUUID();
}
