export type Team = "red" | "blue";
export type Role = "spymaster" | "operative";
export type CardType = "red" | "blue" | "neutral" | "assassin";
export type GamePhase = "lobby" | "spymaster-selection" | "active" | "finished";

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  team: Team | null;
  role: Role | null;
}

export interface GameState {
  id: string;
  players: Player[];
  cards: Card[];
  currentTeam: Team;
  redScore: number;
  blueScore: number;
  redRemaining: number;
  blueRemaining: number;
  gameOver: boolean;
  winner: Team | null;
  startingTeam: Team;
  createdAt: number;
  phase: GamePhase;
  redSpymaster: string | null;
  blueSpymaster: string | null;
  hostId: string | null;
  readyPlayers: string[];
  spymasterVotes: {
    red: { [voterId: string]: string };
    blue: { [voterId: string]: string };
  };
  currentClue: ClueGiven | null;
  clueGivenThisTurn: boolean;
  guessesRemaining: number;
}

export interface ClueGiven {
  word: string;
  number: number;
  team: Team;
}
