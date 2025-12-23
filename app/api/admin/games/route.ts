import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { GameState } from '@/types/game';
import { getEndedGames } from '@/lib/endedGames';

export async function GET(request: NextRequest) {
  // Check authentication
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'active'; // active | ended | both

    let activeGames: GameState[] = [];
    let endedGames: any[] = [];

    // Use the global gameManager instance from server.ts
    const gameManager = (global as any).gameManager;
    if (!gameManager) {
      throw new Error('gameManager not available');
    }

    // Fetch active games if needed
    if (filter === 'active' || filter === 'both') {
      activeGames = gameManager.getAllGames();
    }

    // Fetch ended games if needed
    if (filter === 'ended' || filter === 'both') {
      endedGames = await getEndedGames();
    }

    // Transform active games data for admin view
    const activeGamesData = activeGames.map((game: GameState) => ({
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
      status: 'active' as const,
    }));

    // Transform ended games data for admin view
    const endedGamesData = endedGames.map((game: any) => ({
      id: game.id,
      phase: game.phase,
      playerCount: game.players.length,
      players: game.players.map((p: any) => ({
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
      endedAt: game.endedAt,
      startingTeam: game.startingTeam,
      redSpymaster: game.redSpymaster,
      blueSpymaster: game.blueSpymaster,
      currentClue: game.currentClue,
      elapsedTime: game.endedAt - game.createdAt,
      status: 'ended' as const,
    }));

    // Merge and sort by most recent first
    const allGamesData = [...activeGamesData, ...endedGamesData].sort((a, b) => {
      const aTime = a.status === 'ended' ? (a as any).endedAt : a.createdAt;
      const bTime = b.status === 'ended' ? (b as any).endedAt : b.createdAt;
      return bTime - aTime;
    });

    return NextResponse.json({
      games: allGamesData,
      totalGames: allGamesData.length,
      totalPlayers: allGamesData.reduce((sum: number, game: any) => sum + game.playerCount, 0),
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}
