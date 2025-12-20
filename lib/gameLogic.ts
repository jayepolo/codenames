import { Card, CardType, GameState, Player, Team } from "@/types/game";
import { getRandomWords } from "./words";

const GRID_SIZE = 25;
const RED_CARDS = 9;
const BLUE_CARDS = 8;
const NEUTRAL_CARDS = 7;
const ASSASSIN_CARDS = 1;

export function createNewGame(gameId: string): GameState {
  // Randomly decide which team starts (and gets 9 cards)
  const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";

  // Generate 25 random words
  const words = getRandomWords(GRID_SIZE);

  // Create card types array
  const cardTypes: CardType[] = [];

  // Starting team gets 9 cards, other team gets 8
  if (startingTeam === "red") {
    cardTypes.push(...Array(RED_CARDS).fill("red"));
    cardTypes.push(...Array(BLUE_CARDS).fill("blue"));
  } else {
    cardTypes.push(...Array(RED_CARDS).fill("blue"));
    cardTypes.push(...Array(BLUE_CARDS).fill("red"));
  }

  cardTypes.push(...Array(NEUTRAL_CARDS).fill("neutral"));
  cardTypes.push(...Array(ASSASSIN_CARDS).fill("assassin"));

  // Shuffle card types
  const shuffledTypes = cardTypes.sort(() => Math.random() - 0.5);

  // Create cards
  const cards: Card[] = words.map((word, index) => ({
    word,
    type: shuffledTypes[index],
    revealed: false,
  }));

  return {
    id: gameId,
    players: [],
    cards,
    currentTeam: startingTeam,
    redScore: 0,
    blueScore: 0,
    redRemaining: startingTeam === "red" ? RED_CARDS : BLUE_CARDS,
    blueRemaining: startingTeam === "blue" ? RED_CARDS : BLUE_CARDS,
    gameOver: false,
    winner: null,
    startingTeam,
    createdAt: Date.now(),
    phase: "lobby",
    redSpymaster: null,
    blueSpymaster: null,
    hostId: null,
    readyPlayers: [],
    spymasterVotes: {
      red: {},
      blue: {},
    },
    currentClue: null,
    clueGivenThisTurn: false,
    guessesRemaining: 0,
  };
}

export function addPlayer(game: GameState, player: Player): GameState {
  // Check if player already exists (reconnecting player)
  const existingPlayerIndex = game.players.findIndex(p => p.id === player.id);

  if (existingPlayerIndex >= 0) {
    // Player is reconnecting - update their socketId but preserve their team and role
    const newPlayers = [...game.players];
    const existingPlayer = newPlayers[existingPlayerIndex];
    newPlayers[existingPlayerIndex] = {
      ...existingPlayer,
      socketId: player.socketId,
      name: player.name, // Update name in case they changed it
    };
    return { ...game, players: newPlayers };
  }

  // Add new player
  const updatedGame = {
    ...game,
    players: [...game.players, player],
  };

  // Set first player as host
  if (!game.hostId && game.players.length === 0) {
    updatedGame.hostId = player.id;
  }

  return updatedGame;
}

export function removePlayer(game: GameState, playerId: string): GameState {
  return {
    ...game,
    players: game.players.filter(p => p.id !== playerId),
  };
}

export function revealCard(game: GameState, cardIndex: number): GameState {
  if (game.phase !== "active" || game.gameOver || cardIndex < 0 || cardIndex >= game.cards.length) {
    return game;
  }

  const card = game.cards[cardIndex];

  // Card already revealed
  if (card.revealed) {
    return game;
  }

  // Reveal the card
  const newCards = [...game.cards];
  newCards[cardIndex] = { ...card, revealed: true };

  let newRedScore = game.redScore;
  let newBlueScore = game.blueScore;
  let newRedRemaining = game.redRemaining;
  let newBlueRemaining = game.blueRemaining;
  let newCurrentTeam = game.currentTeam;
  let newGuessesRemaining = game.guessesRemaining - 1;
  let newClue = game.currentClue;
  let newClueGivenThisTurn = game.clueGivenThisTurn;
  let gameOver = false;
  let winner: Team | null = null;
  let shouldSwitchTurn = false;

  // Update scores based on card type
  if (card.type === "red") {
    newRedScore++;
    newRedRemaining--;
    // Switch turn if current team is blue (wrong card)
    if (game.currentTeam === "blue") {
      shouldSwitchTurn = true;
    }
  } else if (card.type === "blue") {
    newBlueScore++;
    newBlueRemaining--;
    // Switch turn if current team is red (wrong card)
    if (game.currentTeam === "red") {
      shouldSwitchTurn = true;
    }
  } else if (card.type === "neutral") {
    // Switch turn (bystander)
    shouldSwitchTurn = true;
  } else if (card.type === "assassin") {
    // Game over, current team loses
    gameOver = true;
    winner = game.currentTeam === "red" ? "blue" : "red";
  }

  // Check if out of guesses (automatically end turn)
  if (newGuessesRemaining <= 0) {
    shouldSwitchTurn = true;
  }

  // If switching turns, reset clue
  if (shouldSwitchTurn) {
    newCurrentTeam = game.currentTeam === "red" ? "blue" : "red";
    newClue = null;
    newClueGivenThisTurn = false;
    newGuessesRemaining = 0;
  }

  // Check if a team has found all their cards
  if (newRedRemaining === 0) {
    gameOver = true;
    winner = "red";
  } else if (newBlueRemaining === 0) {
    gameOver = true;
    winner = "blue";
  }

  return {
    ...game,
    cards: newCards,
    redScore: newRedScore,
    blueScore: newBlueScore,
    redRemaining: newRedRemaining,
    blueRemaining: newBlueRemaining,
    currentTeam: newCurrentTeam,
    currentClue: newClue,
    clueGivenThisTurn: newClueGivenThisTurn,
    guessesRemaining: newGuessesRemaining,
    gameOver,
    winner,
  };
}

export function endTurn(game: GameState): GameState {
  if (game.phase !== "active" || game.gameOver) {
    return game;
  }

  return {
    ...game,
    currentTeam: game.currentTeam === "red" ? "blue" : "red",
    currentClue: null,
    clueGivenThisTurn: false,
    guessesRemaining: 0,
  };
}

export function giveClue(game: GameState, clue: { word: string; number: number }): GameState {
  if (game.phase !== "active" || game.gameOver) {
    return game;
  }

  // Store the clue with the current team
  // Set guesses to clue number + 1 (bonus guess)
  return {
    ...game,
    currentClue: {
      word: clue.word,
      number: clue.number,
      team: game.currentTeam,
    },
    clueGivenThisTurn: true,
    guessesRemaining: clue.number + 1,
  };
}

export function assignPlayerRole(
  game: GameState,
  playerId: string,
  team: Team,
  role: "spymaster" | "operative"
): GameState {
  const playerIndex = game.players.findIndex(p => p.id === playerId);

  if (playerIndex === -1) {
    return game;
  }

  const newPlayers = [...game.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    team,
    role,
  };

  return {
    ...game,
    players: newPlayers,
  };
}

export function joinTeam(
  game: GameState,
  playerId: string,
  team: Team | null
): GameState {
  // Only allow joining teams during lobby phase
  if (game.phase !== "lobby") {
    return game;
  }

  const playerIndex = game.players.findIndex(p => p.id === playerId);

  if (playerIndex === -1) {
    return game;
  }

  const player = game.players[playerIndex];
  const newPlayers = [...game.players];

  // Update player's team
  newPlayers[playerIndex] = {
    ...player,
    team,
  };

  let newRedSpymaster = game.redSpymaster;
  let newBlueSpymaster = game.blueSpymaster;

  // If player was a spymaster and is leaving that team, clear spymaster assignment
  if (player.team === "red" && game.redSpymaster === playerId && team !== "red") {
    newRedSpymaster = null;
  } else if (player.team === "blue" && game.blueSpymaster === playerId && team !== "blue") {
    newBlueSpymaster = null;
  }

  // If player changes team or leaves a team, unready them
  const newReadyPlayers = player.team !== team
    ? game.readyPlayers.filter(id => id !== playerId)
    : game.readyPlayers;

  return {
    ...game,
    players: newPlayers,
    redSpymaster: newRedSpymaster,
    blueSpymaster: newBlueSpymaster,
    readyPlayers: newReadyPlayers,
  };
}

export function assignSpymaster(
  game: GameState,
  playerId: string,
  team: Team
): GameState {
  // Can only assign spymaster during lobby or when game is over (between rounds)
  if (game.phase !== "lobby" && !game.gameOver) {
    return game;
  }

  const player = game.players.find(p => p.id === playerId);

  // Player must exist and be on the specified team
  if (!player || player.team !== team) {
    return game;
  }

  // Set the player as spymaster for their team
  return {
    ...game,
    redSpymaster: team === "red" ? playerId : game.redSpymaster,
    blueSpymaster: team === "blue" ? playerId : game.blueSpymaster,
  };
}

export function startGame(game: GameState): GameState {
  // Can only start from lobby phase
  if (game.phase !== "lobby") {
    return game;
  }

  // Count players on each team
  const redPlayers = game.players.filter(p => p.team === "red");
  const bluePlayers = game.players.filter(p => p.team === "blue");

  // Validate requirements: both teams need at least 2 players and a spymaster
  if (redPlayers.length < 2 || bluePlayers.length < 2) {
    throw new Error("Both teams must have at least two players");
  }

  if (!game.redSpymaster || !game.blueSpymaster) {
    throw new Error("Both teams must have a spymaster assigned");
  }

  // Auto-assign roles based on spymaster assignments
  const newPlayers = game.players.map(player => {
    if (!player.team) {
      return player; // Unassigned players stay unassigned
    }

    const isSpymaster =
      (player.team === "red" && player.id === game.redSpymaster) ||
      (player.team === "blue" && player.id === game.blueSpymaster);

    return {
      ...player,
      role: isSpymaster ? ("spymaster" as const) : ("operative" as const),
    };
  });

  return {
    ...game,
    players: newPlayers,
    phase: "active",
  };
}

export function endRound(game: GameState): GameState {
  // Can only end round when game is over
  if (!game.gameOver) {
    return game;
  }

  // Generate new board
  const words = getRandomWords(GRID_SIZE);
  const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";

  // Create card types array
  const cardTypes: CardType[] = [];

  if (startingTeam === "red") {
    cardTypes.push(...Array(RED_CARDS).fill("red"));
    cardTypes.push(...Array(BLUE_CARDS).fill("blue"));
  } else {
    cardTypes.push(...Array(RED_CARDS).fill("blue"));
    cardTypes.push(...Array(BLUE_CARDS).fill("red"));
  }

  cardTypes.push(...Array(NEUTRAL_CARDS).fill("neutral"));
  cardTypes.push(...Array(ASSASSIN_CARDS).fill("assassin"));

  const shuffledTypes = cardTypes.sort(() => Math.random() - 0.5);

  const cards: Card[] = words.map((word, index) => ({
    word,
    type: shuffledTypes[index],
    revealed: false,
  }));

  // Reset roles to null - teams can reassign spymasters
  const newPlayers = game.players.map(player => ({
    ...player,
    role: null,
  }));

  return {
    ...game,
    players: newPlayers,
    cards,
    currentTeam: startingTeam,
    redRemaining: startingTeam === "red" ? RED_CARDS : BLUE_CARDS,
    blueRemaining: startingTeam === "blue" ? RED_CARDS : BLUE_CARDS,
    gameOver: false,
    winner: null,
    startingTeam,
    phase: "spymaster-selection",
    redSpymaster: null,
    blueSpymaster: null,
    readyPlayers: [],
    spymasterVotes: {
      red: {},
      blue: {},
    },
    currentClue: null,
    clueGivenThisTurn: false,
    guessesRemaining: 0,
  };
}

export function resetToLobby(game: GameState): GameState {
  // Generate new board
  const words = getRandomWords(GRID_SIZE);
  const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";

  const cardTypes: CardType[] = [];

  if (startingTeam === "red") {
    cardTypes.push(...Array(RED_CARDS).fill("red"));
    cardTypes.push(...Array(BLUE_CARDS).fill("blue"));
  } else {
    cardTypes.push(...Array(RED_CARDS).fill("blue"));
    cardTypes.push(...Array(BLUE_CARDS).fill("red"));
  }

  cardTypes.push(...Array(NEUTRAL_CARDS).fill("neutral"));
  cardTypes.push(...Array(ASSASSIN_CARDS).fill("assassin"));

  const shuffledTypes = cardTypes.sort(() => Math.random() - 0.5);

  const cards: Card[] = words.map((word, index) => ({
    word,
    type: shuffledTypes[index],
    revealed: false,
  }));

  // Keep team assignments but clear roles
  const newPlayers = game.players.map(player => ({
    ...player,
    role: null,
  }));

  return {
    ...game,
    players: newPlayers,
    cards,
    currentTeam: startingTeam,
    redScore: 0,
    blueScore: 0,
    redRemaining: startingTeam === "red" ? RED_CARDS : BLUE_CARDS,
    blueRemaining: startingTeam === "blue" ? RED_CARDS : BLUE_CARDS,
    gameOver: false,
    winner: null,
    startingTeam,
    phase: "lobby",
    redSpymaster: null,
    blueSpymaster: null,
    readyPlayers: [],
    spymasterVotes: {
      red: {},
      blue: {},
    },
    currentClue: null,
    clueGivenThisTurn: false,
    guessesRemaining: 0,
  };
}

// Toggle ready status for a player
export function toggleReady(game: GameState, playerId: string): GameState {
  // Can only ready up in lobby phase and must be on a team
  if (game.phase !== "lobby") {
    return game;
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player || !player.team) {
    return game;
  }

  const isReady = game.readyPlayers.includes(playerId);
  const newReadyPlayers = isReady
    ? game.readyPlayers.filter(id => id !== playerId)
    : [...game.readyPlayers, playerId];

  return {
    ...game,
    readyPlayers: newReadyPlayers,
  };
}

// Vote for a spymaster on your team
export function voteForSpymaster(
  game: GameState,
  voterId: string,
  candidateId: string
): GameState {
  // Can only vote in spymaster-selection phase
  if (game.phase !== "spymaster-selection") {
    return game;
  }

  const voter = game.players.find(p => p.id === voterId);
  const candidate = game.players.find(p => p.id === candidateId);

  // Voter and candidate must exist and be on the same team
  if (!voter || !candidate || !voter.team || voter.team !== candidate.team) {
    return game;
  }

  const team = voter.team;
  const newVotes = { ...game.spymasterVotes };
  newVotes[team] = { ...newVotes[team], [voterId]: candidateId };

  const updatedGame = {
    ...game,
    spymasterVotes: newVotes,
  };

  // Check if we have a majority winner
  return checkAndAssignSpymasters(updatedGame);
}

// Check if either team has reached majority vote and assign spymaster
function checkAndAssignSpymasters(game: GameState): GameState {
  const redPlayers = game.players.filter(p => p.team === "red");
  const bluePlayers = game.players.filter(p => p.team === "blue");

  let redSpymaster = game.redSpymaster;
  let blueSpymaster = game.blueSpymaster;
  let phase = game.phase;

  // Check red team votes
  if (!redSpymaster && redPlayers.length > 0) {
    const redVotes = game.spymasterVotes.red;
    const voteCounts: { [candidateId: string]: number } = {};

    Object.values(redVotes).forEach(candidateId => {
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });

    const majorityNeeded = Math.ceil(redPlayers.length / 2);
    const winner = Object.entries(voteCounts).find(([_, count]) => count >= majorityNeeded);

    if (winner) {
      redSpymaster = winner[0];
    }
  }

  // Check blue team votes
  if (!blueSpymaster && bluePlayers.length > 0) {
    const blueVotes = game.spymasterVotes.blue;
    const voteCounts: { [candidateId: string]: number } = {};

    Object.values(blueVotes).forEach(candidateId => {
      voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
    });

    const majorityNeeded = Math.ceil(bluePlayers.length / 2);
    const winner = Object.entries(voteCounts).find(([_, count]) => count >= majorityNeeded);

    if (winner) {
      blueSpymaster = winner[0];
    }
  }

  // If both teams have spymasters, auto-start the game
  if (redSpymaster && blueSpymaster) {
    phase = "active";

    // Assign roles
    const newPlayers = game.players.map(player => {
      if (!player.team) return player;

      const isSpymaster =
        (player.team === "red" && player.id === redSpymaster) ||
        (player.team === "blue" && player.id === blueSpymaster);

      return {
        ...player,
        role: isSpymaster ? ("spymaster" as const) : ("operative" as const),
      };
    });

    return {
      ...game,
      players: newPlayers,
      redSpymaster,
      blueSpymaster,
      phase,
    };
  }

  return {
    ...game,
    redSpymaster,
    blueSpymaster,
    phase,
  };
}

// Start game when all players ready (called by host)
export function startGameFromLobby(game: GameState): GameState {
  // Can only start from lobby phase
  if (game.phase !== "lobby") {
    return game;
  }

  const redPlayers = game.players.filter(p => p.team === "red");
  const bluePlayers = game.players.filter(p => p.team === "blue");

  // Validate requirements
  if (redPlayers.length < 2 || bluePlayers.length < 2) {
    throw new Error("Both teams must have at least two players");
  }

  // Check if all players on teams are ready
  const playersOnTeams = game.players.filter(p => p.team);
  const allReady = playersOnTeams.every(p => game.readyPlayers.includes(p.id));

  if (!allReady) {
    throw new Error("All players must be ready");
  }

  // Move to spymaster selection phase
  return {
    ...game,
    phase: "spymaster-selection",
  };
}
