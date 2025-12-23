import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { GameState } from '@/types/game';

export async function GET() {
  // Check authentication
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Use the global gameManager instance from server.ts
    const gameManager = (global as any).gameManager;
    if (!gameManager) {
      throw new Error('gameManager not available');
    }

    const allGames = gameManager.getAllGames();

    // Transform games data for admin view
    const gamesData = allGames.map((game: GameState) => ({
      id: game.id,
      phase: game.phase,
      playerCount: game.players.length,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        role: p.role,
      })),
      redScore: game.redScore,
      blueScore: game.blueScore,
      redRemaining: game.redRemaining,
      blueRemaining: game.blueRemaining,
      currentTeam: game.currentTeam,
      gameOver: game.gameOver,
      winner: game.winner,
      createdAt: game.createdAt,
      startingTeam: game.startingTeam,
      redSpymaster: game.redSpymaster,
      blueSpymaster: game.blueSpymaster,
      currentClue: game.currentClue,
      elapsedTime: Date.now() - game.createdAt,
    }));

    return NextResponse.json({
      games: gamesData,
      totalGames: gamesData.length,
      totalPlayers: gamesData.reduce((sum: number, game: any) => sum + game.playerCount, 0),
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
