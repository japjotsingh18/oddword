"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { AppCheck, initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { Auth, getAuth, signInAnonymously, User } from "firebase/auth";
import {
  Database,
  endAt,
  get,
  getDatabase,
  limitToFirst,
  onValue,
  orderByValue,
  query,
  ref,
  runTransaction,
  set,
  update,
} from "firebase/database";
import type { WordPair } from "./word-pairs";

export type GamePhase = "lobby" | "clues" | "voting" | "reveal";

export type GameSettings = {
  rounds: number;
  clueSeconds: number;
  votingSeconds: number;
  maxPlayers: number;
};

export const defaultGameSettings: GameSettings = {
  rounds: 4,
  clueSeconds: 30,
  votingSeconds: 20,
  maxPlayers: 8,
};

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
  turnOrder?: string[];
  settings?: GameSettings;
  deadline?: number;
  groupCaught?: boolean;
  expiresAt?: number;
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

const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY;
const roomTtlMs = 12 * 60 * 60 * 1_000;

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId,
);

let app: FirebaseApp | undefined;
let database: Database | undefined;
let auth: Auth | undefined;
let appCheck: AppCheck | undefined;
let authenticationPromise: Promise<User> | undefined;

function getFirebaseApp() {
  app = app ?? (getApps().length ? getApp() : initializeApp(firebaseConfig));
  if (typeof window !== "undefined" && appCheckSiteKey && !appCheck) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

export function getRealtimeDatabase() {
  if (!firebaseEnabled) return undefined;
  database = database ?? getDatabase(getFirebaseApp());
  return database;
}

async function requireFirebaseUser() {
  if (!firebaseEnabled) throw new Error("Firebase is not configured.");
  auth = auth ?? getAuth(getFirebaseApp());
  if (auth.currentUser) return auth.currentUser;
  authenticationPromise = authenticationPromise ?? signInAnonymously(auth)
    .then((credential) => credential.user)
    .catch((cause) => {
      authenticationPromise = undefined;
      throw cause;
    });
  return authenticationPromise;
}

async function cleanupExpiredRooms() {
  const db = getRealtimeDatabase();
  if (!db) return;
  const expired = await get(query(ref(db, "roomExpirations"), orderByValue(), endAt(Date.now()), limitToFirst(25)));
  if (!expired.exists()) return;
  const removals: Record<string, null> = {};
  expired.forEach((snapshot) => {
    removals[`rooms/${snapshot.key}`] = null;
    removals[`roomExpirations/${snapshot.key}`] = null;
  });
  await update(ref(db), removals);
}

export async function createRoom(room: Room) {
  const db = getRealtimeDatabase();
  if (!db) return;
  const user = await requireFirebaseUser();
  if (room.hostId !== user.uid || !room.players[user.uid]) throw new Error("The room host could not be verified.");
  const expiresAt = Date.now() + roomTtlMs;
  await set(ref(db, `rooms/${room.code}`), { ...room, expiresAt });
  // Expiration indexing is housekeeping. A temporary index permission or
  // connectivity failure must not roll back an otherwise playable room.
  await set(ref(db, `roomExpirations/${room.code}`), expiresAt).catch(() => {});
}

export async function getRoom(code: string) {
  const db = getRealtimeDatabase();
  if (!db) return null;
  await requireFirebaseUser();
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) return null;
  const room = snapshot.val() as Room;
  if (room.expiresAt && room.expiresAt <= Date.now()) {
    await update(ref(db), { [`rooms/${code}`]: null, [`roomExpirations/${code}`]: null });
    return null;
  }
  return room;
}

export async function joinRoom(code: string, player: Player) {
  const db = getRealtimeDatabase();
  if (!db) return false;
  const user = await requireFirebaseUser();
  if (player.id !== user.uid) return false;
  const room = await getRoom(code);
  const maxPlayers = room?.settings?.maxPlayers ?? defaultGameSettings.maxPlayers;
  if (!room || room.phase !== "lobby" || Object.keys(room.players ?? {}).length >= maxPlayers) return false;
  await set(ref(db, `rooms/${code}/players/${player.id}`), player);
  return true;
}

export function subscribeToRoom(code: string, callback: (room: Room | null) => void) {
  const db = getRealtimeDatabase();
  if (!db) return () => {};
  let unsubscribe = () => {};
  let cancelled = false;
  void requireFirebaseUser().then(() => {
    if (cancelled) return;
    unsubscribe = onValue(ref(db, `rooms/${code}`), (snapshot) => callback(snapshot.val()));
  });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function updateRoom(code: string, values: Partial<Room>) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await requireFirebaseUser();
  await update(ref(db, `rooms/${code}`), values);
}

export async function beginRound(code: string, pair: WordPair, oddPlayerId: string, requestedTurnOrder: string[]) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await requireFirebaseUser();
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || !room.players[oddPlayerId]) return room;
    const nextPlayers = Object.fromEntries(
      Object.values(room.players).map((player) => {
        const { clue: _clue, vote: _vote, ...cleanPlayer } = player;
        return [player.id, cleanPlayer];
      }),
    ) as Record<string, Player>;
    const validTurnOrder = requestedTurnOrder.filter((playerId) => nextPlayers[playerId]);
    const turnOrder = validTurnOrder.length === Object.keys(nextPlayers).length
      ? validTurnOrder
      : Object.keys(nextPlayers);
    return {
      ...room,
      phase: "clues",
      round: room.phase === "lobby" ? room.round : room.round + 1,
      pair,
      oddPlayerId,
      usedPairIds: [...(room.usedPairIds ?? []), pair.id].slice(-wordHistoryLimit),
      turnIndex: 0,
      turnOrder,
      deadline: Date.now() + (room.settings?.clueSeconds ?? defaultGameSettings.clueSeconds) * 1_000,
      groupCaught: null,
      players: nextPlayers,
    };
  });
}

const wordHistoryLimit = 120;

export async function submitClue(code: string, playerId: string, clue: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  const user = await requireFirebaseUser();
  if (user.uid !== playerId) return;
  await runTransaction(ref(db, `rooms/${code}/players/${playerId}/clue`), (existing: string | null) => (
    existing ?? clue.trim().slice(0, 20)
  ));
}

export async function advanceClueTurn(code: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await requireFirebaseUser();
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || room.phase !== "clues") return room;
    const order = (room.turnOrder ?? Object.keys(room.players)).filter((id) => room.players[id]);
    const currentPlayer = room.players[order[room.turnIndex]];
    if (!currentPlayer?.clue) return room;
    const isLastClue = room.turnIndex >= order.length - 1;
    return {
      ...room,
      phase: isLastClue ? "voting" : "clues",
      turnIndex: isLastClue ? 0 : room.turnIndex + 1,
      deadline: Date.now() + (
        isLastClue
          ? room.settings?.votingSeconds ?? defaultGameSettings.votingSeconds
          : room.settings?.clueSeconds ?? defaultGameSettings.clueSeconds
      ) * 1_000,
    };
  });
}

export async function submitVote(code: string, playerId: string, targetId: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  const user = await requireFirebaseUser();
  if (user.uid !== playerId) return;
  await runTransaction(ref(db, `rooms/${code}/players/${playerId}/vote`), (existing: string | null) => (
    existing ?? targetId
  ));
}

export async function finalizeVoting(code: string) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await requireFirebaseUser();
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room || room.phase !== "voting") return room;
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
  const user = await requireFirebaseUser();
  if (user.uid !== playerId) return;
  const snapshot = await get(ref(db, `rooms/${code}`));
  const currentRoom = snapshot.val() as Room | null;
  if (!currentRoom?.players[playerId]) return;
  if (currentRoom.hostId !== playerId) {
    await set(ref(db, `rooms/${code}/players/${playerId}`), null);
    return;
  }
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.players[playerId]) return room;
    const wasHost = room.hostId === playerId;
    delete room.players[playerId];
    room.turnOrder = room.turnOrder?.filter((id) => id !== playerId);
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

export async function restartGame(code: string, settings?: GameSettings) {
  const db = getRealtimeDatabase();
  if (!db) return;
  await requireFirebaseUser();
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room) return room;
    const players = Object.fromEntries(Object.values(room.players).map((player) => [
      player.id,
      { id: player.id, name: player.name, avatar: player.avatar, isHost: player.isHost, score: 0, connected: true },
    ])) as Record<string, Player>;
    return { ...room, phase: "lobby", round: 1, usedPairIds: [], turnIndex: 0, turnOrder: [], settings: settings ?? room.settings ?? defaultGameSettings, pair: null, oddPlayerId: null, deadline: null, groupCaught: null, players };
  });
}

export async function makePlayerId() {
  const user = await requireFirebaseUser();
  await cleanupExpiredRooms().catch(() => {});
  return user.uid;
}
