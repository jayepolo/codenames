import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { GameState } from '@/types/game';

const DATA_DIR = path.join(homedir(), 'codenames-data');
const ENDED_GAMES_FILE = path.join(DATA_DIR, 'ended-games.json');

export interface EndedGame extends GameState {
  endedAt: number;
  finalMetrics?: {
    totalDuration: number;
    finalRedScore: number;
    finalBlueScore: number;
    winner: GameState['winner'];
  };
}

interface EndedGamesData {
  games: EndedGame[];
  version: number;
}

// Queue for write operations to prevent concurrent file access
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Ensure the data directory exists
 */
export async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
    throw error;
  }
}

/**
 * Read ended games from file
 */
async function readEndedGamesFile(): Promise<EndedGamesData> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(ENDED_GAMES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist, return empty structure
    if (error.code === 'ENOENT') {
      return { games: [], version: 1 };
    }
    console.error('Error reading ended games file:', error);
    return { games: [], version: 1 };
  }
}

/**
 * Write ended games to file (queued for thread safety)
 */
async function writeEndedGamesFile(data: EndedGamesData): Promise<void> {
  // Queue this write operation
  writeQueue = writeQueue.then(async () => {
    try {
      await ensureDataDirectory();
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(ENDED_GAMES_FILE, jsonData, 'utf-8');
    } catch (error) {
      console.error('Error writing ended games file:', error);
      throw error;
    }
  });

  return writeQueue;
}

/**
 * Save a game to ended games storage
 */
export async function endGame(game: GameState): Promise<void> {
  const data = await readEndedGamesFile();

  const endedGame: EndedGame = {
    ...game,
    endedAt: Date.now(),
    finalMetrics: {
      totalDuration: Date.now() - game.createdAt,
      finalRedScore: game.redScore,
      finalBlueScore: game.blueScore,
      winner: game.winner,
    },
  };

  data.games.push(endedGame);

  await writeEndedGamesFile(data);
  console.log(`[EndedGames] Saved game ${game.id} to ended games storage`);
}

/**
 * Get all ended games, optionally limited
 */
export async function getEndedGames(limit?: number): Promise<EndedGame[]> {
  const data = await readEndedGamesFile();

  // Sort by endedAt descending (most recent first)
  const sorted = data.games.sort((a, b) => b.endedAt - a.endedAt);

  if (limit) {
    return sorted.slice(0, limit);
  }

  return sorted;
}

/**
 * Get a specific ended game by ID
 */
export async function getEndedGame(gameId: string): Promise<EndedGame | null> {
  const data = await readEndedGamesFile();
  return data.games.find(g => g.id === gameId) || null;
}
