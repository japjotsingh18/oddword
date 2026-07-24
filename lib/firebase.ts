"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  Database,
  get,
  getDatabase,
  onValue,
  push,
  ref,
  runTransaction,
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
  groupCaught?: boolean;
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

export async function getRoom(code: string) {
  const db = getRealtimeDatabase();
  if (!db) return null;
  const snapshot = await get(ref(db, `rooms/${code}`));
  return snapshot.exists() ? snapshot.val() as Room : null;
}

export async function joinRoom(code: string, player: Player) {
  const db = getRealtimeDatabase();
  if (!db) return false;
  const room = await getRoom(code);
  if (!room || room.phase !== "lobby" || Object.keys(room.players ?? {}).length >= 10) return false;
  await set(ref(db, `rooms/${code}/players/${player.id}`), player);
  return true;
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

export async function beginRound(code: string, pair: WordPair, oddPlayerId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || !room.players[oddPlayerId]) return room;
    const nextPlayers = Object.fromEntries(
      Object.values(room.players).map((player) => {
        const { clue: _clue, vote: _vote, ...cleanPlayer } = player;
        return [player.id, cleanPlayer];
      }),
    ) as Record<string, Player>;
    return {
      ...room,
      phase: "clues",
      round: room.phase === "lobby" ? room.round : room.round + 1,
      pair,
      oddPlayerId,
      usedPairIds: [...(room.usedPairIds ?? []), pair.id].slice(-wordHistoryLimit),
      turnIndex: 0,
      deadline: Date.now() + 30_000,
      groupCaught: null,
      players: nextPlayers,
    };
  });
}

const wordHistoryLimit = 120;

export async function submitClue(code: string, playerId: string, clue: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || room.phase !== "clues") return room;
    const order = Object.values(room.players);
    if (order[room.turnIndex]?.id !== playerId || room.players[playerId]?.clue) return room;
    room.players[playerId].clue = clue.trim().slice(0, 20);
    const isLastClue = room.turnIndex >= order.length - 1;
    return {
      ...room,
      phase: isLastClue ? "voting" : "clues",
      turnIndex: isLastClue ? 0 : room.turnIndex + 1,
      deadline: Date.now() + (isLastClue ? 20_000 : 30_000),
    };
  });
}

export async function submitVote(code: string, playerId: string, targetId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || room.phase !== "voting" || !room.players[playerId] || !room.players[targetId]) return room;
    if (playerId === targetId || room.players[playerId].vote) return room;
    room.players[playerId].vote = targetId;
    const players = Object.values(room.players);
    const everyoneVoted = players.every((player) => Boolean(player.vote));
    if (!everyoneVoted) return room;

    const votesForOdd = players.filter((player) => player.vote === room.oddPlayerId).length;
    const groupCaught = votesForOdd > players.length / 2;
    const nextPlayers = Object.fromEntries(players.map((player) => [
      player.id,
      {
        ...player,
        score: player.score + (
          groupCaught
            ? (player.id === room.oddPlayerId ? 0 : 1)
            : (player.id === room.oddPlayerId ? 1 : 0)
        ),
      },
    ])) as Record<string, Player>;

    return { ...room, phase: "reveal", groupCaught, deadline: null, players: nextPlayers };
  });
}

export async function leaveRoom(code: string, playerId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.players[playerId]) return room;
    const wasHost = room.hostId === playerId;
    delete room.players[playerId];
    const remaining = Object.values(room.players);
    if (!remaining.length) return null;
    if (wasHost) {
      const nextHost = remaining[0];
      nextHost.isHost = true;
      room.hostId = nextHost.id;
    }
    if (room.phase === "clues" && room.turnIndex >= remaining.length) room.turnIndex = Math.max(0, remaining.length - 1);
    return room;
  });
}

export async function restartGame(code: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room) return room;
    const players = Object.fromEntries(Object.values(room.players).map((player) => [
      player.id,
      { id: player.id, name: player.name, avatar: player.avatar, isHost: player.isHost, score: 0, connected: true },
    ])) as Record<string, Player>;
    return { ...room, phase: "lobby", round: 1, usedPairIds: [], turnIndex: 0, pair: null, oddPlayerId: null, deadline: null, groupCaught: null, players };
  });
}

export function makePlayerId() {
  const db = getRealtimeDatabase();
  return db ? push(ref(db, "playerIds")).key! : crypto.randomUUID();
}
