import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { gameManager } from "./lib/gameManager";
import { Player } from "./types/game";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
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
