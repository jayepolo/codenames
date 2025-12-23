import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { Player } from '@/types/game';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; playerId: string }> }
) {
  // Check authentication
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { gameId, playerId } = await params;

  try {
    const body = await request.json();
    const { name, toggleSpymaster } = body;

    // Use the global gameManager instance from server.ts
    const gameManager = (global as any).gameManager;
    if (!gameManager) {
      throw new Error('gameManager not available');
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify player exists
    const player = game.players.find((p: Player) => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    let updatedGame = game;

    // Update player name if provided
    if (name !== undefined && typeof name === 'string') {
      updatedGame = gameManager.updatePlayerName(gameId, playerId, name);
      if (!updatedGame) {
        return NextResponse.json(
          { error: 'Failed to update player name' },
          { status: 500 }
        );
      }
    }

    // Toggle spymaster role if requested
    if (toggleSpymaster === true) {
      updatedGame = gameManager.togglePlayerSpymaster(gameId, playerId);
      if (!updatedGame) {
        return NextResponse.json(
          { error: 'Failed to toggle spymaster role' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      game: updatedGame,
    });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}
