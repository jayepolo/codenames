import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { gameManager } from "./lib/gameManager";
import { Player } from "./types/game";

// Make gameManager globally accessible for API routes
(global as any).gameManager = gameManager;

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Admin auth helper functions
const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const SESSION_SECRET = 'admin-session-secret-' + (process.env.NODE_ENV || 'dev');

function hashPassword(password: string): string {
  return Buffer.from(`${SESSION_SECRET}:${password}`).toString('base64');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  });

  return cookies;
}

function isAdminAuthenticatedSync(req: any): boolean {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[ADMIN_SESSION_COOKIE];

  if (!sessionToken) return false;

  const expectedToken = hashPassword(ADMIN_PASSWORD);
  return sessionToken === expectedToken;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      // Intercept admin API routes to serve directly from gameManager
      // BUT exclude /login and /logout which need to be handled by Next.js
      if (req.url?.startsWith('/api/admin/') &&
          !req.url.includes('/login') &&
          !req.url.includes('/logout')) {
        // Check authentication
        if (!isAdminAuthenticatedSync(req)) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Handle /api/admin/games
        if (req.url === '/api/admin/games' && req.method === 'GET') {
          const allGames = gameManager.getAllGames();

          // Transform games data for admin view
          const gamesData = allGames.map(game => ({
            code: game.id,
            players: game.players.map(p => ({
              id: p.id,
              name: p.name,
              team: p.team,
              role: p.role,
            })),
            status: game.phase,
            currentTeam: game.currentTeam,
            cardsRevealed: game.cards.filter(c => c.revealed).length,
            totalCards: game.cards.length,
            createdAt: new Date(game.createdAt).toISOString(),
          }));

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ games: gamesData }));
          return;
        }

        // Handle /api/admin/game/[code]
        const gameCodeMatch = req.url.match(/^\/api\/admin\/game\/([^\/\?]+)/);
        if (gameCodeMatch && req.method === 'GET') {
          const code = gameCodeMatch[1];
          const game = gameManager.getGame(code);

          if (!game) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Game not found' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ game }));
          return;
        }

        // Handle /api/admin/jitsi
        if (req.url === '/api/admin/jitsi' && req.method === 'GET') {
          const JITSI_METRICS_URL = process.env.JITSI_METRICS_URL || 'http://localhost:8080';

          try {
            const response = await fetch(`${JITSI_METRICS_URL}/debug`, {
              headers: {
                'Accept': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Jitsi API returned ${response.status}`);
            }

            const data = await response.json();

            // Transform Jitsi data for easier consumption
            const conferences = data.conferences || {};
            const conferenceList = Object.entries(conferences).map(([id, conf]: [string, any]) => ({
              id,
              name: (conf as any).name,
              meetingId: (conf as any).meeting_id,
              participantCount: Object.keys((conf as any).endpoints || {}).length,
              participants: Object.entries((conf as any).endpoints || {}).map(([epId, name]) => ({
                id: epId,
                name,
              })),
              rtcstatsEnabled: (conf as any).rtcstatsEnabled,
            }));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: data.shutdownState,
              healthy: data.health?.success || false,
              stress: parseFloat(data['load-management']?.stress || '0'),
              overloaded: data['load-management']?.state !== 'NOT_OVERLOADED',
              jitter: data.overall_bridge_jitter || 0,
              drain: data.drain || false,
              timestamp: data.time,
              conferences: conferenceList,
              conferenceCount: conferenceList.length,
              totalParticipants: conferenceList.reduce((sum: number, conf: any) => sum + conf.participantCount, 0),
            }));
            return;
          } catch (error) {
            console.error('Error fetching Jitsi metrics:', error);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Failed to fetch Jitsi metrics',
              status: 'UNKNOWN',
              healthy: false,
              conferences: [],
              conferenceCount: 0,
              totalParticipants: 0,
            }));
            return;
          }
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track socket to player mapping for each game
  const socketPlayerMap = new Map<string, { gameId: string; playerId: string }>();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-game", ({ gameId, playerName, playerId }) => {
      console.log(`Player ${playerName} (${playerId}) joining game ${gameId}`);

      socket.join(gameId);

      // Track this socket's player
      socketPlayerMap.set(socket.id, { gameId, playerId });

      const game = gameManager.getOrCreateGame(gameId);

      const player: Player = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        team: null,
        role: null,
      };

      const updatedGame = gameManager.addPlayerToGame(gameId, player);

      if (updatedGame) {
        const isReconnect = game.players.some(p => p.id === playerId);

        socket.emit("game-state", updatedGame);
        io.to(gameId).emit("player-joined", {
          player: updatedGame.players.find(p => p.id === playerId),
          game: updatedGame,
          isReconnect,
        });
      }
    });

    socket.on("assign-role", ({ gameId, team, role }) => {
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      const updatedGame = gameManager.assignRole(gameId, playerInfo.playerId, team, role);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("reveal-card", ({ gameId, cardIndex }) => {
      const updatedGame = gameManager.revealCardInGame(gameId, cardIndex);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("end-turn", ({ gameId }) => {
      const updatedGame = gameManager.endTurnInGame(gameId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("give-clue", ({ gameId, clue }) => {
      console.log(`Clue given in game ${gameId}:`, clue);
      const updatedGame = gameManager.giveClue(gameId, clue);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("reset-game", ({ gameId }) => {
      const updatedGame = gameManager.resetGame(gameId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("chat-message", ({ gameId, message }) => {
      console.log(`Chat message in game ${gameId}:`, message);

      // Broadcast the message to all players in the game room
      io.to(gameId).emit("chat-message", message);
    });

    socket.on("update-player-name", ({ gameId, playerId, newName }) => {
      console.log(`Player ${playerId} changing name to ${newName} in game ${gameId}`);

      const updatedGame = gameManager.updatePlayerName(gameId, playerId, newName);

      if (updatedGame) {
        console.log("Broadcasting updated game state after name change");
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("join-team", ({ gameId, team }) => {
      console.log(`join-team event received: gameId=${gameId}, team=${team}`);
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) {
        console.log("No player info found for socket:", socket.id);
        return;
      }

      console.log(`Player ${playerInfo.playerId} joining team ${team}`);
      const updatedGame = gameManager.joinTeam(gameId, playerInfo.playerId, team);

      if (updatedGame) {
        console.log("Game updated, emitting new state");
        io.to(gameId).emit("game-state", updatedGame);
      } else {
        console.log("Failed to update game");
      }
    });

    socket.on("assign-spymaster", ({ gameId, team }) => {
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      const updatedGame = gameManager.assignSpymasterToTeam(gameId, playerInfo.playerId, team);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("start-game", ({ gameId }) => {
      const updatedGame = gameManager.startGame(gameId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("end-round", ({ gameId }) => {
      const updatedGame = gameManager.endRound(gameId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("reset-to-lobby", ({ gameId }) => {
      const updatedGame = gameManager.resetToLobby(gameId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("toggle-ready", ({ gameId }) => {
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      console.log(`Player ${playerInfo.playerId} toggling ready in game ${gameId}`);
      const updatedGame = gameManager.toggleReady(gameId, playerInfo.playerId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("vote-spymaster", ({ gameId, candidateId }) => {
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      console.log(`Player ${playerInfo.playerId} voting for ${candidateId} as spymaster`);
      const updatedGame = gameManager.voteForSpymaster(gameId, playerInfo.playerId, candidateId);

      if (updatedGame) {
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("start-game-from-lobby", ({ gameId }) => {
      const playerInfo = socketPlayerMap.get(socket.id);
      if (!playerInfo) return;

      const game = gameManager.getGame(gameId);
      if (!game) return;

      console.log(`Player ${playerInfo.playerId} triggering auto-advance from lobby`);
      const updatedGame = gameManager.startGameFromLobby(gameId);

      if (updatedGame) {
        console.log("Advanced to spymaster selection phase");
        io.to(gameId).emit("game-state", updatedGame);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      // Clean up socket mapping
      const playerInfo = socketPlayerMap.get(socket.id);
      if (playerInfo) {
        console.log(`Player ${playerInfo.playerId} disconnected from game ${playerInfo.gameId}`);
        socketPlayerMap.delete(socket.id);

        // Note: We don't remove the player from the game so they can reconnect
        // and retain their role and team assignment
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
