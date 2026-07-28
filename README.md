# Oddword

Oddword is a mobile-first, real-time multiplayer party game about clues,
bluffing, and finding the player with the different word.

**Play it:** [oddword-6b124.web.app](https://oddword-6b124.web.app)

## How it works

1. One player creates a room and shares its five-letter code.
2. Every player receives the same secret word except one randomly selected
   player, who receives a closely related word.
3. Players take turns giving a one-word clue without revealing their word.
4. Everyone votes for the player they think has the odd word.
5. The words, odd player, result, and updated scores are revealed.

## Features

- Real-time rooms, clues, voting, reveals, and scores
- Host-configurable rounds, clue timers, voting timers, and room size
- Random odd-player selection and shuffled clue order each round
- Mobile-first responsive interface with animated game transitions
- 300 balanced word pairs across everyday categories
- Firebase Realtime Database synchronization
- Firebase Hosting deployment

## Tech stack

- React 19 and TypeScript
- Firebase Realtime Database and Hosting
- Tailwind CSS
- Vite and vinext

## Run locally

### Prerequisites

- Node.js 22.13 or newer
- A Firebase project with Realtime Database enabled

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Firebase web-app configuration to `.env.local`:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

4. Apply the rules in `firebase.database.rules.json` to your Realtime Database.

5. Start the development server:

   ```bash
   npm run dev
   ```

The app uses a local demo mode when Firebase values are not configured.

## Available commands

```bash
npm run dev             # Start the local development server
npm run build           # Create the Sites production build
npm run build:firebase  # Create the Firebase Hosting build
npm run test            # Build and run the test suite
npm run lint            # Run ESLint
```

## Project structure

```text
app/                    Interface and game screens
lib/firebase.ts         Real-time multiplayer data layer
lib/word-pairs.ts       Reusable database of 300 word pairs
firebase.database.rules.json
firebase.json           Firebase Hosting configuration
```

## Security

Local environment files, Firebase CLI state, private keys, credentials, and
service-account files are excluded from Git. Never commit `.env.local` or an
Admin SDK service-account key.
