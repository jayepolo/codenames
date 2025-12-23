import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // Check authentication
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { code } = await params;

  try {
    // Use the global gameManager instance from server.ts
    const gameManager = (global as any).gameManager;
    if (!gameManager) {
      throw new Error('gameManager not available');
    }

    const game = gameManager.getGame(code);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Return full game state including cards
    return NextResponse.json({
      game: {
        ...game,
        elapsedTime: Date.now() - game.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}
