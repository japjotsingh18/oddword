"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createRoom,
  firebaseEnabled,
  joinRoom,
  makePlayerId,
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
}: {
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
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
  players,
  onStart,
  onLeave,
}: {
  roomCode: string;
  players: Player[];
  onStart: () => void;
  onLeave: () => void;
}) {
  const copyCode = async () => {
    await navigator.clipboard?.writeText(roomCode);
  };
  return (
    <main className="game-shell">
      <AppHeader roomCode={roomCode} round={1} onLeave={onLeave} />
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
            <button className="button button--primary" onClick={onStart}>
              Start game <span>→</span>
            </button>
            <span>{players.length} players ready</span>
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
  pair,
  onSubmit,
}: {
  players: Player[];
  pair: WordPair;
  onSubmit: (clue: string) => void;
}) {
  const [clue, setClue] = useState("");
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <main className="round-stage clue-stage">
      <div className="round-heading">
        <div><span className="section-kicker">Round 1 · Your turn</span><h1>Give a <em>one-word</em> clue.</h1></div>
        <Timer seconds={seconds} total={30} />
      </div>
      <div className="clue-layout">
        <section className="clue-card">
          <div className="mini-word">
            <span>Your word</span><strong>{pair.main}</strong><button aria-label="Hide word">◉</button>
          </div>
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
          <div className="rule-strip">
            <span><b>×</b> No sentences</span><span><b>×</b> No rhymes</span><span><b>×</b> Don’t say your word</span>
          </div>
        </section>
        <aside className="turn-order">
          <div className="panel-heading"><span>Turn order</span><b>1/{players.length}</b></div>
          {players.map((player, index) => (
            <div className={`turn-player ${index === 0 ? "is-current" : ""}`} key={player.id}>
              <span className="turn-number">{index + 1}</span>
              <div className={`avatar avatar-${index % 4}`}>{player.avatar}</div>
              <div><strong>{player.name}</strong><small>{index === 0 ? "Choosing a clue..." : "Waiting"}</small></div>
              {index === 0 && <span className="thinking">•••</span>}
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}

function Voting({ players, onVote }: { players: Player[]; onVote: (id: string) => void }) {
  const [selected, setSelected] = useState("");
  const [seconds, setSeconds] = useState(20);
  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const clues = ["furry", "bamboo", "jumpy", "eight"];
  return (
    <main className="round-stage vote-stage">
      <div className="round-heading">
        <div><span className="section-kicker">All clues are in</span><h1>Who has the <em>oddword?</em></h1></div>
        <Timer seconds={seconds} total={20} />
      </div>
      <p className="vote-intro">Tap a player to cast your vote. Look for the clue that doesn’t quite fit.</p>
      <div className="vote-grid">
        {players.map((player, index) => (
          <button
            className={`vote-card ${selected === player.id ? "is-selected" : ""}`}
            key={player.id}
            onClick={() => setSelected(player.id)}
          >
            <span className="vote-check">✓</span>
            <div className={`avatar avatar-large avatar-${index % 4}`}>{player.avatar}</div>
            <strong>{player.name}</strong>
            <span className="clue-quote">“{clues[index]}”</span>
          </button>
        ))}
      </div>
      <button className="button button--primary vote-submit" disabled={!selected} onClick={() => onVote(selected)}>
        Cast my vote <span>→</span>
      </button>
      <p className="vote-count"><i /> {selected ? "1" : "0"} of {players.length} votes cast</p>
    </main>
  );
}

function Results({
  players,
  pair,
  oddPlayer,
  onNext,
  onRestart,
}: {
  players: Player[];
  pair: WordPair;
  oddPlayer: Player;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <main className="round-stage results-stage">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div>
      <span className="result-kicker">The group found them</span>
      <h1>Caught the <em>oddword!</em></h1>
      <p>Nice detective work. The clues gave it away.</p>
      <section className="reveal-pair">
        <div><span>Everyone else had</span><strong>{pair.main}</strong></div>
        <span className="versus">VS</span>
        <div className="odd-reveal"><span>{oddPlayer.name} had</span><strong>{pair.odd}</strong></div>
      </section>
      <section className="scoreboard">
        <div className="panel-heading"><span>Scoreboard</span><small>After round 1</small></div>
        {players.sort((a, b) => b.score - a.score).map((player, index) => (
          <div className="score-row" key={player.id}>
            <b>{index + 1}</b><div className={`avatar avatar-${index % 4}`}>{player.avatar}</div>
            <strong>{player.name}</strong>
            <span>{player.score + (player.id !== oddPlayer.id ? 1 : 0)} <small>pts</small></span>
          </div>
        ))}
      </section>
      <div className="results-actions">
        <button className="button button--primary" onClick={onNext}>Next round <span>→</span></button>
        <button className="text-button" onClick={onRestart}>Restart game</button>
      </div>
    </main>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "lobby" | "word" | GamePhase>("home");
  const [roomCode, setRoomCode] = useState("PLUMS");
  const [players, setPlayers] = useState<Player[]>(demoPlayers);
  const [pair, setPair] = useState(() => randomPair());
  const [oddPlayerId, setOddPlayerId] = useState("zoe");
  const oddPlayer = useMemo(() => players.find((player) => player.id === oddPlayerId) ?? players[players.length - 1], [players, oddPlayerId]);

  const enterLobby = async (name: string, code?: string) => {
    const playerId = firebaseEnabled ? makePlayerId() : "you";
    const player: Player = { id: playerId, name, avatar: avatars[Math.floor(Math.random() * avatars.length)], isHost: !code, score: 0, connected: true };
    const nextCode = code ?? Array.from({ length: 5 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
    setRoomCode(nextCode);
    setPlayers(code ? [player, ...demoPlayers.slice(1)] : [{ ...player, isHost: true }, ...demoPlayers.slice(1)]);
    if (firebaseEnabled) {
      if (code) await joinRoom(nextCode, player);
      else {
        const room: Room = { code: nextCode, hostId: player.id, phase: "lobby", round: 1, usedPairIds: [], turnIndex: 0, players: { [player.id]: player } };
        await createRoom(room);
      }
    }
    setScreen("lobby");
  };

  const startRound = () => {
    const nextPair = randomPair([pair.id]);
    const nextOdd = players[Math.floor(Math.random() * players.length)];
    setPair(nextPair);
    setOddPlayerId(nextOdd.id);
    setScreen("word");
  };

  return (
    <>
      {screen === "home" && <HomeScreen onCreate={(name) => enterLobby(name)} onJoin={(name, code) => enterLobby(name, code)} />}
      {screen === "lobby" && <Lobby roomCode={roomCode} players={players} onStart={startRound} onLeave={() => setScreen("home")} />}
      {screen === "word" && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={1} onLeave={() => setScreen("home")} />
          <WordReveal pair={pair} isOdd={oddPlayerId === "you"} onReady={() => setScreen("clues")} />
        </div>
      )}
      {screen === "clues" && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={1} onLeave={() => setScreen("home")} />
          <ClueRound players={players} pair={pair} onSubmit={() => setScreen("voting")} />
        </div>
      )}
      {screen === "voting" && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={1} onLeave={() => setScreen("home")} />
          <Voting players={players} onVote={() => setScreen("reveal")} />
        </div>
      )}
      {screen === "reveal" && (
        <div className="game-shell game-shell--round">
          <AppHeader roomCode={roomCode} round={1} onLeave={() => setScreen("home")} />
          <Results players={[...players]} pair={pair} oddPlayer={oddPlayer} onNext={startRound} onRestart={() => setScreen("lobby")} />
        </div>
      )}
      <div className="data-badge" title={`${wordPairs.length} balanced word pairs`}>{wordPairs.length} pairs</div>
    </>
  );
}
