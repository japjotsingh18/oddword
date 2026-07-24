"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beginRound,
  createRoom,
  firebaseEnabled,
  getRoom,
  joinRoom,
  leaveRoom,
  makePlayerId,
  restartGame,
  submitClue,
  submitVote,
  subscribeToRoom,
  type GamePhase,
  type Player,
  type Room,
} from "@/lib/firebase";
import { randomPair, wordPairs, type WordPair } from "@/lib/word-pairs";

const avatars = ["🦊", "🐼", "🐸", "🦁", "🐙", "🐯", "🐨", "🐵"];
const demoPlayers: Player[] = [
  { id: "you", name: "You", avatar: "🦊", isHost: true, score: 2, connected: true },
  { id: "maya", name: "Maya", avatar: "🐼", isHost: false, score: 1, connected: true },
  { id: "leo", name: "Leo", avatar: "🐸", isHost: false, score: 2, connected: true },
  { id: "zoe", name: "Zoe", avatar: "🐙", isHost: false, score: 0, connected: true },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`} aria-label="Oddword">
      <span className="logo-mark">
        <i />
        <i />
        <i />
      </span>
      <span>oddword</span>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function Timer({ seconds, total }: { seconds: number; total: number }) {
  const progress = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <div className="timer" aria-label={`${seconds} seconds remaining`}>
      <div className="timer-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
        <span>{seconds}</span>
      </div>
      <div>
        <strong>Time left</strong>
        <small>Choose one word</small>
      </div>
    </div>
  );
}

function HomeScreen({
  onCreate,
  onJoin,
  error,
}: {
  onCreate: (name: string) => Promise<void>;
  onJoin: (name: string, code: string) => Promise<void>;
  error?: string;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <main className="home-shell">
      <nav className="topbar">
        <Logo compact />
        <button className="how-button" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
          <Icon>?</Icon> How to play
        </button>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span /> Find the odd one out</div>
        <h1>Same vibe.<br /><em>Different word.</em></h1>
        <p>Everyone gets the same secret word—except one player. Give clever clues, read the room, and find the oddword.</p>

        <div className="play-card">
          <label htmlFor="player-name">What should we call you?</label>
          <div className="name-row">
            <span className="avatar-small">🦊</span>
            <input
              id="player-name"
              maxLength={18}
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {joinOpen ? (
            <div className="join-panel">
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                className="code-input"
                maxLength={5}
                placeholder="ABCDE"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                autoFocus
              />
              <button className="button button--primary" disabled={!name.trim() || code.length !== 5} onClick={() => onJoin(name.trim(), code)}>
                Join room <span>→</span>
              </button>
              <button className="text-button" onClick={() => setJoinOpen(false)}>Back</button>
            </div>
          ) : (
            <div className="action-stack">
              <button className="button button--primary" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>
                <Icon>＋</Icon> Create a room
              </button>
              <div className="or"><span /> or <span /></div>
              <button className="button button--secondary" disabled={!name.trim()} onClick={() => setJoinOpen(true)}>
                Join with a code <span>→</span>
              </button>
            </div>
          )}
          <small className="firebase-note">
            <span className={firebaseEnabled ? "status-live" : ""} />
            {firebaseEnabled ? "Firebase connected · real-time play ready" : "Demo mode · add Firebase keys for online rooms"}
          </small>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="word-demo" aria-label="Example word pair">
          <div><span>Most players</span><strong>CAT</strong></div>
          <div className="versus">VS</div>
          <div className="odd-card"><span>Odd player</span><strong>DOG</strong></div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div>
          <span className="section-kicker">How it works</span>
          <h2>Simple to learn.<br />Hard to bluff.</h2>
        </div>
        <div className="steps">
          {[
            ["01", "Get your word", "Everyone gets a secret word. One player gets a closely related odd word.", "◉"],
            ["02", "Give one clue", "Take turns describing your word using one word only. Keep it clever.", "✦"],
            ["03", "Vote together", "Spot the suspicious clue and vote for who you think has the oddword.", "⌁"],
          ].map(([number, title, copy, symbol]) => (
            <article key={number} className="step-card">
              <div className="step-top"><span>{number}</span><b>{symbol}</b></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AppHeader({ roomCode, round, onLeave }: { roomCode: string; round: number; onLeave: () => void }) {
  return (
    <header className="game-header">
      <Logo compact />
      <div className="room-meta">
        <span>Room <b>{roomCode}</b></span>
        <i />
        <span>Round <b>{round}</b></span>
      </div>
      <button className="leave-button" onClick={onLeave}>Leave</button>
    </header>
  );
}

function Lobby({
  roomCode,
  round,
  players,
  isHost,
  onStart,
  onLeave,
}: {
  roomCode: string;
  round: number;
  players: Player[];
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}) {
  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
  };
  return (
    <main className="game-shell">
      <AppHeader roomCode={roomCode} round={round} onLeave={onLeave} />
      <section className="lobby-layout">
        <div className="lobby-main">
          <span className="section-kicker">Your room is ready</span>
          <h1>Bring the<br /><em>crew together.</em></h1>
          <p>Share this room code with your friends. You’ll need at least 3 players to start.</p>
          <button className="code-card" onClick={copyCode} aria-label={`Copy room code ${roomCode}`}>
            <span>Room code</span>
            <strong>{roomCode}</strong>
            <small>Tap to copy <b>⧉</b></small>
          </button>
          <div className="host-actions">
            {isHost ? (
              <button className="button button--primary" disabled={players.length < 3} onClick={onStart}>
                Start game <span>→</span>
              </button>
            ) : (
              <div className="waiting-host"><i /> Waiting for the host to start</div>
            )}
            <span>{players.length}/3 minimum</span>
          </div>
        </div>
        <aside className="player-panel">
          <div className="panel-heading">
            <div><span>Players</span><b>{players.length}/10</b></div>
            <span className="live-pill"><i /> Live</span>
          </div>
          <div className="player-list">
            {players.map((player, index) => (
              <div className="player-row" key={player.id} style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}>
                <div className={`avatar avatar-${index % 4}`}>{player.avatar}</div>
                <div><strong>{player.name}</strong><small>{player.isHost ? "Host" : "Ready to play"}</small></div>
                {player.isHost ? <span className="host-pill">HOST</span> : <span className="ready-dot">✓</span>}
              </div>
            ))}
          </div>
          <div className="lobby-tip"><Icon>✦</Icon><p><strong>Host tip</strong><br />For the best game, invite 4–8 players.</p></div>
        </aside>
      </section>
    </main>
  );
}

function WordReveal({ pair, isOdd, onReady }: { pair: WordPair; isOdd: boolean; onReady: () => void }) {
  const word = isOdd ? pair.odd : pair.main;
  return (
    <main className="round-stage centered-stage">
      <div className="secret-card">
        <div className="secret-icon">{isOdd ? "◆" : "✦"}</div>
        <span>Your secret word is</span>
        <h1>{word}</h1>
        <div className="category-pill">{pair.category}</div>
        <p>Keep it secret. When it’s your turn, describe it using <strong>one word only.</strong></p>
        <button className="button button--dark" onClick={onReady}>I’m ready <span>→</span></button>
      </div>
    </main>
  );
}

function ClueRound({
  players,
  word,
  round,
  turnIndex,
  playerId,
  onSubmit,
}: {
  players: Player[];
  word: string;
  round: number;
  turnIndex: number;
  playerId: string;
  onSubmit: (clue: string) => Promise<void>;
}) {
  const [clue, setClue] = useState("");
  const [seconds, setSeconds] = useState(30);
  const currentPlayer = players[turnIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const me = players.find((player) => player.id === playerId);
  useEffect(() => {
    setSeconds(30);
    const interval = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [turnIndex]);
  return (
    <main className="round-stage clue-stage">
      <div className="round-heading">
        <div>
          <span className="section-kicker">Round {round} · {isMyTurn ? "Your turn" : `${currentPlayer?.name ?? "Player"} is up`}</span>
          <h1>{isMyTurn ? <>Give a <em>one-word</em> clue.</> : <>Read the <em>room.</em></>}</h1>
        </div>
        <Timer seconds={seconds} total={30} />
      </div>
      <div className="clue-layout">
        <section className="clue-card">
          <div className="mini-word">
            <span>Your word</span><strong>{word}</strong><button aria-label="Your word is private">◉</button>
          </div>
          {isMyTurn && !me?.clue ? (
            <>
              <label htmlFor="clue">Your clue</label>
              <div className="clue-input-wrap">
                <input
                  id="clue"
                  placeholder="Type one word..."
                  value={clue}
                  maxLength={20}
                  onChange={(event) => setClue(event.target.value.replace(/\s+/g, ""))}
                  onKeyDown={(event) => event.key === "Enter" && clue && onSubmit(clue)}
                  autoFocus
                />
                <span>{clue.length}/20</span>
              </div>
              <button className="button button--primary" disabled={!clue} onClick={() => onSubmit(clue)}>Lock in clue <span>→</span></button>
            </>
          ) : (
            <div className="waiting-card">
              <span className="thinking">•••</span>
              <strong>{me?.clue ? "Your clue is locked in" : `${currentPlayer?.name ?? "Another player"} is choosing`}</strong>
              <small>This screen will update automatically.</small>
            </div>
          )}
          <div className="rule-strip">
            <span><b>×</b> No sentences</span><span><b>×</b> No rhymes</span><span><b>×</b> Don’t say your word</span>
          </div>
        </section>
        <aside className="turn-order">
          <div className="panel-heading"><span>Turn order</span><b>{Math.min(turnIndex + 1, players.length)}/{players.length}</b></div>
          {players.map((player, index) => (
            <div className={`turn-player ${index === turnIndex ? "is-current" : ""}`} key={player.id}>
              <span className="turn-number">{index + 1}</span>
              <div className={`avatar avatar-${index % 4}`}>{player.avatar}</div>
              <div>
                <strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong>
                <small>{player.clue ? `“${player.clue}”` : index === turnIndex ? "Choosing a clue..." : "Waiting"}</small>
              </div>
              {player.clue ? <span className="ready-dot">✓</span> : index === turnIndex && <span className="thinking">•••</span>}
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}

function Voting({
  players,
  playerId,
  round,
  onVote,
}: {
  players: Player[];
  playerId: string;
  round: number;
  onVote: (id: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [seconds, setSeconds] = useState(20);
  const me = players.find((player) => player.id === playerId);
  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <main className="round-stage vote-stage">
      <div className="round-heading">
        <div><span className="section-kicker">Round {round} · All clues are in</span><h1>Who has the <em>oddword?</em></h1></div>
        <Timer seconds={seconds} total={20} />
      </div>
      <p className="vote-intro">Tap a player to cast your vote. Look for the clue that doesn’t quite fit.</p>
      <div className="vote-grid">
        {players.map((player, index) => (
          <button
            className={`vote-card ${selected === player.id ? "is-selected" : ""}`}
            key={player.id}
            disabled={player.id === playerId || Boolean(me?.vote)}
            onClick={() => setSelected(player.id)}
          >
            <span className="vote-check">✓</span>
            <div className={`avatar avatar-large avatar-${index % 4}`}>{player.avatar}</div>
            <strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong>
            <span className="clue-quote">“{player.clue ?? "…"}”</span>
          </button>
        ))}
      </div>
      {me?.vote ? (
        <div className="waiting-card waiting-card--vote">
          <span className="thinking">•••</span>
          <strong>Vote locked in</strong>
          <small>Waiting for everyone else.</small>
        </div>
      ) : (
        <button className="button button--primary vote-submit" disabled={!selected} onClick={() => onVote(selected)}>
          Cast my vote <span>→</span>
        </button>
      )}
      <p className="vote-count"><i /> {players.filter((player) => player.vote).length} of {players.length} votes cast</p>
    </main>
  );
}

function Results({
  players,
  pair,
  oddPlayer,
  groupCaught,
  isHost,
  round,
  onNext,
  onRestart,
}: {
  players: Player[];
  pair: WordPair;
  oddPlayer: Player;
  groupCaught: boolean;
  isHost: boolean;
  round: number;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <main className="round-stage results-stage">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div>
      <span className="result-kicker">{groupCaught ? "The group found them" : "The odd player escaped"}</span>
      <h1>{groupCaught ? <>Caught the <em>oddword!</em></> : <>A brilliant <em>bluff!</em></>}</h1>
      <p>{groupCaught ? "Nice detective work. The clues gave it away." : `${oddPlayer.name} fooled the room and takes the point.`}</p>
      <section className="reveal-pair">
        <div><span>Everyone else had</span><strong>{pair.main}</strong></div>
        <span className="versus">VS</span>
        <div className="odd-reveal"><span>{oddPlayer.name} had</span><strong>{pair.odd}</strong></div>
      </section>
      <section className="scoreboard">
        <div className="panel-heading"><span>{round >= 4 ? "Final scoreboard" : "Scoreboard"}</span><small>After round {round} of 4</small></div>
        {players.sort((a, b) => b.score - a.score).map((player, index) => (
          <div className="score-row" key={player.id}>
            <b>{index + 1}</b><div className={`avatar avatar-${index % 4}`}>{player.avatar}</div>
            <strong>{player.name}</strong>
            <span>{player.score} <small>pts</small></span>
          </div>
        ))}
      </section>
      <div className="results-actions">
        {isHost ? (
          <>
            {round < 4 ? (
              <>
                <button className="button button--primary" onClick={onNext}>Next round <span>→</span></button>
                <button className="text-button" onClick={onRestart}>Restart game</button>
              </>
            ) : (
              <button className="button button--primary" onClick={onRestart}>Play again <span>↻</span></button>
            )}
          </>
        ) : (
          <div className="waiting-card waiting-card--vote"><span className="thinking">•••</span><strong>Waiting for the host</strong><small>The next round will begin automatically.</small></div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "lobby" | "word" | GamePhase>("home");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [readyRound, setReadyRound] = useState(0);
  const [error, setError] = useState("");
  const players = useMemo(() => Object.values(room?.players ?? {}), [room]);
  const pair = room?.pair;
  const oddPlayer = players.find((player) => player.id === room?.oddPlayerId) ?? players[players.length - 1];
  const isHost = room?.hostId === playerId;

  useEffect(() => {
    if (!firebaseEnabled || !roomCode || !playerId) return;
    return subscribeToRoom(roomCode, (nextRoom) => {
      if (!nextRoom) {
        setError("This room has closed.");
        setRoom(null);
        setScreen("home");
        return;
      }
      setRoom(nextRoom);
      if (nextRoom.phase === "lobby") setScreen("lobby");
      if (nextRoom.phase === "clues") setScreen(readyRound === nextRoom.round ? "clues" : "word");
      if (nextRoom.phase === "voting") setScreen("voting");
      if (nextRoom.phase === "reveal") setScreen("reveal");
    });
  }, [playerId, readyRound, roomCode]);

  const enterLobby = async (name: string, code?: string) => {
    setError("");
    try {
      const nextPlayerId = firebaseEnabled ? makePlayerId() : "you";
      const player: Player = {
        id: nextPlayerId,
        name,
        avatar: avatars[Math.floor(Math.random() * avatars.length)],
        isHost: !code,
        score: 0,
        connected: true,
      };

      if (!firebaseEnabled) {
        const localPlayers = Object.fromEntries(
          [{ ...player, isHost: true }, ...demoPlayers.slice(1)].map((item) => [item.id, item]),
        );
        const localRoom: Room = { code: "PLUMS", hostId: player.id, phase: "lobby", round: 1, usedPairIds: [], turnIndex: 0, players: localPlayers };
        setPlayerId(player.id);
        setRoomCode(localRoom.code);
        setRoom(localRoom);
        setScreen("lobby");
        return;
      }

      let nextCode = code;
      if (nextCode) {
        const existing = await getRoom(nextCode);
        if (!existing) throw new Error("Room not found. Check the five-letter code.");
        const joined = await joinRoom(nextCode, player);
        if (!joined) throw new Error(existing.phase === "lobby" ? "This room is full." : "That game has already started.");
      } else {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const candidate = Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
          if (!(await getRoom(candidate))) {
            nextCode = candidate;
            break;
          }
        }
        if (!nextCode) throw new Error("Could not create a room. Please try again.");
        const nextRoom: Room = {
          code: nextCode,
          hostId: player.id,
          phase: "lobby",
          round: 1,
          usedPairIds: [],
          turnIndex: 0,
          players: { [player.id]: player },
        };
        await createRoom(nextRoom);
        setRoom(nextRoom);
      }

      setPlayerId(nextPlayerId);
      setRoomCode(nextCode);
      setReadyRound(0);
      setScreen("lobby");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Firebase could not connect. Please try again.");
    }
  };

  const startRound = async () => {
    if (!room || !isHost || players.length < 3 || (room.phase === "reveal" && room.round >= 4)) return;
    const nextPair = randomPair(room.usedPairIds ?? []);
    const nextOdd = players[Math.floor(Math.random() * players.length)];
    if (firebaseEnabled) {
      await beginRound(room.code, nextPair, nextOdd.id);
      return;
    }
    setRoom({ ...room, phase: "clues", pair: nextPair, oddPlayerId: nextOdd.id, turnIndex: 0 });
    setScreen("word");
  };

  const exitRoom = async () => {
    if (firebaseEnabled && roomCode && playerId) await leaveRoom(roomCode, playerId);
    setRoom(null);
    setRoomCode("");
    setPlayerId("");
    setReadyRound(0);
    setScreen("home");
  };

  const currentWord = pair ? (room?.oddPlayerId === playerId ? pair.odd : pair.main) : "";

  return (
    <>
      {screen === "home" && <HomeScreen error={error} onCreate={(name) => enterLobby(name)} onJoin={(name, code) => enterLobby(name, code)} />}
      {screen === "lobby" && room && (
        <Lobby roomCode={roomCode} round={room.round} players={players} isHost={isHost} onStart={startRound} onLeave={exitRoom} />
      )}
      {screen === "word" && room && pair && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={room.round} onLeave={exitRoom} />
          <WordReveal
            pair={pair}
            isOdd={room.oddPlayerId === playerId}
            onReady={() => {
              setReadyRound(room.round);
              setScreen("clues");
            }}
          />
        </div>
      )}
      {screen === "clues" && room && pair && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={room.round} onLeave={exitRoom} />
          <ClueRound
            players={players}
            word={currentWord}
            round={room.round}
            turnIndex={room.turnIndex}
            playerId={playerId}
            onSubmit={(clue) => submitClue(roomCode, playerId, clue)}
          />
        </div>
      )}
      {screen === "voting" && room && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={room.round} onLeave={exitRoom} />
          <Voting players={players} playerId={playerId} round={room.round} onVote={(targetId) => submitVote(roomCode, playerId, targetId)} />
        </div>
      )}
      {screen === "reveal" && room && pair && oddPlayer && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={room.round} onLeave={exitRoom} />
          <Results
            players={[...players]}
            pair={pair}
            oddPlayer={oddPlayer}
            groupCaught={Boolean(room.groupCaught)}
            isHost={isHost}
            round={room.round}
            onNext={startRound}
            onRestart={() => restartGame(roomCode)}
          />
        </div>
      )}
      <div className="data-badge" title={`${wordPairs.length} balanced word pairs`}>{wordPairs.length} pairs</div>
    </>
  );
}
