import { GameState, Player, Team } from "@/types/game";
import {
  createNewGame,
  addPlayer,
  removePlayer,
  revealCard,
  endTurn,
  giveClue as giveClueLogic,
  assignPlayerRole,
  joinTeam as joinTeamLogic,
  assignSpymaster as assignSpymasterLogic,
  startGame as startGameLogic,
  endRound as endRoundLogic,
  resetToLobby as resetToLobbyLogic,
  toggleReady as toggleReadyLogic,
  voteForSpymaster as voteForSpymasterLogic,
  startGameFromLobby as startGameFromLobbyLogic,
} from "./gameLogic";
import { endGame as saveEndedGame } from "./endedGames";

class GameManager {
  private games: Map<string, GameState> = new Map();

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  createGame(gameId: string): GameState {
    const game = createNewGame(gameId);
    this.games.set(gameId, game);
    return game;
  }

  getOrCreateGame(gameId: string): GameState {
    let game = this.games.get(gameId);
    if (!game) {
      game = this.createGame(gameId);
    }
    return game;
  }

  addPlayerToGame(gameId: string, player: Player): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = addPlayer(game, player);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  removePlayerFromGame(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = removePlayer(game, playerId);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  revealCardInGame(gameId: string, cardIndex: number): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = revealCard(game, cardIndex);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  endTurnInGame(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = endTurn(game);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  giveClue(gameId: string, clue: { word: string; number: number }): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = giveClueLogic(game, clue);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  assignRole(
    gameId: string,
    playerId: string,
    team: Team,
    role: "spymaster" | "operative"
  ): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = assignPlayerRole(game, playerId, team, role);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  resetGame(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = resetToLobbyLogic(game);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  joinTeam(gameId: string, playerId: string, team: Team | null): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = joinTeamLogic(game, playerId, team);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  updatePlayerName(gameId: string, playerId: string, newName: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedPlayers = game.players.map(player =>
      player.id === playerId ? { ...player, name: newName } : player
    );

    const updatedGame = { ...game, players: updatedPlayers };
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  assignSpymasterToTeam(gameId: string, playerId: string, team: Team): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = assignSpymasterLogic(game, playerId, team);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  startGame(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    try {
      const updatedGame = startGameLogic(game);
      this.games.set(gameId, updatedGame);
      return updatedGame;
    } catch (error) {
      // Return null if validation fails
      console.error("Failed to start game:", error);
      return null;
    }
  }

  endRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = endRoundLogic(game);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  resetToLobby(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = resetToLobbyLogic(game);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  toggleReady(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = toggleReadyLogic(game, playerId);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  voteForSpymaster(gameId: string, voterId: string, candidateId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const updatedGame = voteForSpymasterLogic(game, voterId, candidateId);
    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  startGameFromLobby(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    try {
      const updatedGame = startGameFromLobbyLogic(game);
      this.games.set(gameId, updatedGame);
      return updatedGame;
    } catch (error) {
      console.error("Failed to start game from lobby:", error);
      return null;
    }
  }

  deleteGame(gameId: string): void {
    this.games.delete(gameId);
  }

  togglePlayerSpymaster(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) {
      return null;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.team) {
      return null; // Player must be on a team to be spymaster
    }

    const teamSpymasterField = player.team === 'red' ? 'redSpymaster' : 'blueSpymaster';
    const currentSpymaster = game[teamSpymasterField];

    let updatedGame: GameState;

    if (currentSpymaster === playerId) {
      // Player is already spymaster, demote to operative
      updatedGame = {
        ...game,
        [teamSpymasterField]: null,
        players: game.players.map(p =>
          p.id === playerId ? { ...p, role: 'operative' } : p
        ),
      };
    } else {
      // Promote player to spymaster, demote previous spymaster if exists
      updatedGame = {
        ...game,
        [teamSpymasterField]: playerId,
        players: game.players.map(p => {
          if (p.id === playerId) {
            return { ...p, role: 'spymaster' };
          } else if (p.id === currentSpymaster) {
            return { ...p, role: 'operative' };
          }
          return p;
        }),
      };
    }

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  // Cleanup old games (older than 24 hours)
  cleanupOldGames(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [gameId, game] of this.games.entries()) {
      if (now - game.createdAt > maxAge) {
        // Save to ended games before deleting
        saveEndedGame(game).catch(error => {
          console.error(`Failed to save ended game ${gameId}:`, error);
        });
        this.games.delete(gameId);
        console.log(`[GameManager] Cleaned up old game: ${gameId}`);
      }
    }
  }
}

// Singleton instance
export const gameManager = new GameManager();

// Run cleanup every hour
if (typeof window === "undefined") {
  setInterval(() => {
    gameManager.cleanupOldGames();
  }, 60 * 60 * 1000);
}
