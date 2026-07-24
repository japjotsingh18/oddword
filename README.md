# Oddword

A mobile-first, real-time multiplayer party game built with React, TypeScript,
Tailwind CSS, Firebase Realtime Database, and the Sites-compatible vinext runtime.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Firebase project and enable Realtime Database.
3. Add the Firebase web app values to `.env.local`.
4. Deploy `firebase.database.rules.json` to Realtime Database.
5. Run `npm run dev`.

When Firebase values are absent, the app runs in a polished local demo mode so
the complete lobby, clue, voting, reveal, and scoreboard flow can be explored.

## Game data

`lib/word-pairs.ts` contains 300 reusable, categorized word pairs. New pairs can
be added to a category without changing the game engine.
