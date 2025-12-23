"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { GameState, Player, Team, Role } from "@/types/game";

interface ChatMessage {
  id: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameCode = params.code as string;
  const playerName = searchParams.get("name") || "Anonymous";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`codenames-chat-${gameCode}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [chatInput, setChatInput] = useState("");
  const [clueInput, setClueInput] = useState("");
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [peekedCardIndex, setPeekedCardIndex] = useState<number | null>(null);
  const [clickedCardIndex, setClickedCardIndex] = useState<number | null>(null);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [previousTeam, setPreviousTeam] = useState<"red" | "blue" | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // User menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangeNameModalOpen, setIsChangeNameModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Help modal state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Session scoring
  const [sessionScore, setSessionScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`codenames-session-score-${gameCode}`);
      return saved ? JSON.parse(saved) : { red: 0, blue: 0 };
    }
    return { red: 0, blue: 0 };
  });

  // Resize state - load from localStorage
  const [videoHeight, setVideoHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('codenames-video-height');
      return saved ? parseInt(saved, 10) : 480;
    }
    return 480;
  });
  const [isResizingVideo, setIsResizingVideo] = useState(false);

  // Use refs for smooth dragging without state updates
  const videoRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Generate or retrieve persistent player ID
    const getOrCreatePlayerId = () => {
      const storageKey = `codenames-player-${gameCode}`;
      let playerId = localStorage.getItem(storageKey);

      if (!playerId) {
        playerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(storageKey, playerId);
      }

      return playerId;
    };

    const playerId = getOrCreatePlayerId();

    const newSocket = io({
      path: "/socket.io",
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
      newSocket.emit("join-game", { gameId: gameCode, playerName, playerId });
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    newSocket.on("game-state", (state: GameState) => {
      console.log("Received game state:", state);
      setGameState(state);

      const player = state.players.find((p) => p.id === playerId);
      if (player) {
        setCurrentPlayer(player);
      }
    });

    newSocket.on("player-joined", ({ player, game }: { player: Player; game: GameState }) => {
      console.log("Player joined:", player);
      setGameState(game);
    });

    newSocket.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [gameCode, playerName]);

  // Auto-scroll chat to bottom and persist to localStorage
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Save chat messages to localStorage
    if (chatMessages.length > 0) {
      localStorage.setItem(`codenames-chat-${gameCode}`, JSON.stringify(chatMessages));
    }
  }, [chatMessages, gameCode]);

  // Persist resize settings
  useEffect(() => {
    localStorage.setItem('codenames-video-height', String(videoHeight));
  }, [videoHeight]);

  // Persist session score
  useEffect(() => {
    localStorage.setItem(`codenames-session-score-${gameCode}`, JSON.stringify(sessionScore));
  }, [sessionScore, gameCode]);

  // Track game wins for session score
  useEffect(() => {
    if (gameState?.gameOver && gameState?.winner) {
      // Check if we've already counted this win
      const lastWinKey = `codenames-last-win-${gameCode}`;
      const lastWin = localStorage.getItem(lastWinKey);
      const currentWinId = `${gameState.winner}-${Date.now()}`;

      if (lastWin !== currentWinId.substring(0, currentWinId.lastIndexOf('-'))) {
        const winner = gameState.winner as 'red' | 'blue';
        setSessionScore((prev: { red: number; blue: number }) => ({
          ...prev,
          [winner]: prev[winner] + 1
        }));
        localStorage.setItem(lastWinKey, winner);
      }
    }
  }, [gameState?.gameOver, gameState?.winner, gameCode]);

  // Auto-advance from lobby to spymaster selection when all players are ready
  useEffect(() => {
    if (!gameState || !socket || gameState.phase !== "lobby") return;

    const redPlayers = gameState.players.filter(p => p.team === "red");
    const bluePlayers = gameState.players.filter(p => p.team === "blue");
    const playersOnTeams = gameState.players.filter(p => p.team);
    const allReady = playersOnTeams.length > 0 && playersOnTeams.every(p => (gameState.readyPlayers || []).includes(p.id));

    // Check if we should auto-advance
    if (allReady && redPlayers.length >= 2 && bluePlayers.length >= 2) {
      console.log("All players ready! Auto-advancing to spymaster selection...");
      // Small delay so users see the "All players ready!" message
      setTimeout(() => {
        socket.emit("start-game-from-lobby", { gameId: gameCode });
      }, 1500);
    }
  }, [gameState?.phase, gameState?.readyPlayers, gameState?.players, socket, gameCode]);

  // Handle video resize with requestAnimationFrame for smooth dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (isResizingVideo && videoRef.current) {
          const sidebarElement = document.getElementById('sidebar-container');
          if (sidebarElement) {
            const sidebarRect = sidebarElement.getBoundingClientRect();
            const newHeight = e.clientY - sidebarRect.top - 50; // 50px for header
            const clampedHeight = Math.max(200, Math.min(800, newHeight));
            videoRef.current.style.height = `${clampedHeight}px`;
          }
        }
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Save final state on mouse up
      if (isResizingVideo && videoRef.current) {
        const sidebarElement = document.getElementById('sidebar-container');
        if (sidebarElement) {
          const sidebarRect = sidebarElement.getBoundingClientRect();
          const newHeight = e.clientY - sidebarRect.top - 50;
          const clampedHeight = Math.max(200, Math.min(800, newHeight));
          setVideoHeight(clampedHeight);
        }
      }

      setIsResizingVideo(false);
    };

    if (isResizingVideo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingVideo]);

  // Detect turn changes and show transition
  useEffect(() => {
    if (gameState && gameState.phase === "active") {
      if (previousTeam !== null && previousTeam !== gameState.currentTeam) {
        // Turn changed!
        setShowTurnTransition(true);
        const timer = setTimeout(() => {
          setShowTurnTransition(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
      setPreviousTeam(gameState.currentTeam);
    }
  }, [gameState?.currentTeam, gameState?.phase]);

  // Clear clicked card animation after delay
  useEffect(() => {
    if (clickedCardIndex !== null) {
      const timer = setTimeout(() => {
        setClickedCardIndex(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [clickedCardIndex]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  const handleRoleSelect = (team: Team, role: Role) => {
    if (socket) {
      socket.emit("assign-role", { gameId: gameCode, team, role });
    }
  };

  const handleCardClick = (cardIndex: number) => {
    if (!gameState || !currentPlayer || !socket) return;

    // Only allow operatives to click cards
    if (currentPlayer.role !== "operative") return;

    // Only allow clicks for the current team
    if (currentPlayer.team !== gameState.currentTeam) return;

    // Don't allow clicking cards until a clue has been given
    if (!gameState.clueGivenThisTurn) return;

    // Don't allow clicking revealed cards
    if (gameState.cards[cardIndex].revealed) return;

    // Trigger click animation
    setClickedCardIndex(cardIndex);

    socket.emit("reveal-card", { gameId: gameCode, cardIndex });
  };

  const handleEndTurn = () => {
    if (socket) {
      socket.emit("end-turn", { gameId: gameCode });
    }
  };

  const handleResetGame = () => {
    if (socket) {
      socket.emit("reset-game", { gameId: gameCode });
      // Clear chat history on new game
      setChatMessages([]);
      localStorage.removeItem(`codenames-chat-${gameCode}`);
    }
  };

  const handleJoinTeam = (team: Team | null) => {
    console.log("=== handleJoinTeam called ===");
    console.log("Team:", team);
    console.log("Socket exists:", !!socket);
    console.log("Socket connected:", socket?.connected);
    console.log("GameCode:", gameCode);
    console.log("CurrentPlayer:", currentPlayer);

    // Check if player is ready - cannot change teams if ready
    if (gameState && currentPlayer && (gameState.readyPlayers || []).includes(currentPlayer.id)) {
      alert("You must un-ready before changing teams");
      return;
    }

    if (!socket) {
      console.error("No socket available!");
      alert("Error: Not connected to server");
      return;
    }

    if (!socket.connected) {
      console.error("Socket not connected!");
      alert("Error: Disconnected from server");
      return;
    }

    console.log("Emitting join-team event...");
    socket.emit("join-team", { gameId: gameCode, team });
    console.log("✓ Emitted join-team event");
  };

  const handleAssignSpymaster = (team: Team) => {
    if (socket) {
      socket.emit("assign-spymaster", { gameId: gameCode, team });
    }
  };

  const handleToggleReady = () => {
    console.log("=== handleToggleReady called ===");
    console.log("Socket exists:", !!socket);
    console.log("Socket connected:", socket?.connected);
    console.log("GameCode:", gameCode);

    if (!socket) {
      alert("Error: Not connected to server");
      return;
    }

    if (!socket.connected) {
      alert("Error: Disconnected from server");
      return;
    }

    console.log("Emitting toggle-ready event...");
    socket.emit("toggle-ready", { gameId: gameCode });
    console.log("✓ Emitted toggle-ready event");
  };

  const handleVoteSpymaster = (candidateId: string) => {
    if (socket) {
      console.log("Voting for spymaster:", candidateId);
      socket.emit("vote-spymaster", { gameId: gameCode, candidateId });
    }
  };

  const handleStartGameFromLobby = () => {
    if (socket) {
      console.log("Starting game from lobby (host)");
      socket.emit("start-game-from-lobby", { gameId: gameCode });
    }
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit("start-game", { gameId: gameCode });
    }
  };

  const handleEndRound = () => {
    if (socket) {
      socket.emit("end-round", { gameId: gameCode });
    }
  };

  const handleResetToLobby = () => {
    if (socket) {
      socket.emit("reset-to-lobby", { gameId: gameCode });
      // Clear chat history when going back to lobby
      setChatMessages([]);
      localStorage.removeItem(`codenames-chat-${gameCode}`);
    }
  };

  const copyGameLink = () => {
    const url = `${window.location.origin}/game/${gameCode}`;
    navigator.clipboard.writeText(url);
    alert("Game link copied! Share it with your friends.");
  };

  const handleOpenChangeName = () => {
    setNewName(currentPlayer?.name || "");
    setIsChangeNameModalOpen(true);
    setIsUserMenuOpen(false);
  };

  const handleChangeName = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert("Please enter a name");
      return;
    }

    if (!socket || !currentPlayer) return;

    // Update localStorage
    localStorage.setItem("codenames-username", trimmedName);

    // Emit socket event to update name on server
    socket.emit("update-player-name", {
      gameId: gameCode,
      playerId: currentPlayer.id,
      newName: trimmedName
    });

    setIsChangeNameModalOpen(false);
  };

  const handleLeaveGame = () => {
    if (confirm("Are you sure you want to leave this game?")) {
      window.location.href = "/";
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !chatInput.trim()) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      playerName,
      message: chatInput.trim(),
      timestamp: Date.now(),
    };

    socket.emit("chat-message", { gameId: gameCode, message });
    setChatInput("");
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-white text-2xl font-bold">Connecting...</div>
      </div>
    );
  }

  if (!gameState || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
        <div className="text-white text-2xl font-bold">Loading game...</div>
      </div>
    );
  }

  const isSpymaster = currentPlayer.role === "spymaster";
  const canRevealCards = currentPlayer.role === "operative" && currentPlayer.team === gameState.currentTeam;

  // Jitsi room URL with custom config
  const jitsiRoomName = `codenames-${gameCode}`;

  // Use current player name (updates when they change it)
  const displayName = currentPlayer?.name || playerName || "Anonymous";

  const jitsiConfig = {
    startWithAudioMuted: true,
    startWithVideoMuted: true,
    prejoinPageEnabled: false,
    disableModeratorIndicator: true,
  };

  const jitsiInterfaceConfig = {
    TOOLBAR_BUTTONS: [
      'microphone',
      'camera',
      'hangup',
      'settings',
      'participants-pane',
      'tileview',
    ],
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    DEFAULT_REMOTE_DISPLAY_NAME: 'Guest',
    MOBILE_APP_PROMO: false,
    TILE_VIEW_MAX_COLUMNS: 4,
  };

  const configParams = new URLSearchParams({
    ...Object.entries(jitsiConfig).reduce((acc, [key, value]) => {
      acc[`config.${key}`] = String(value);
      return acc;
    }, {} as Record<string, string>),
    ...Object.entries(jitsiInterfaceConfig).reduce((acc, [key, value]) => {
      acc[`interfaceConfig.${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return acc;
    }, {} as Record<string, string>),
  });

  // Jitsi reads userInfo from URL fragment for display name
  const jitsiUrl = `https://meet.pololabs.io/${jitsiRoomName}?${configParams.toString()}#userInfo.displayName="${encodeURIComponent(displayName)}"`;

  return (
    <div className="h-screen bg-[#0a1628] text-white flex overflow-hidden">
      {/* Left Game Info Panel */}
      <div className="w-64 flex flex-col pt-8 pb-4 pl-8 pr-3">
        {/* Game Info Content */}
        <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {/* Session Score */}
                  <div className="bg-[#0d1b2e] rounded-lg p-3 border-2 border-gray-600 mb-4">
                    <h4 className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Session Score</h4>
                    <div className="flex justify-around items-center">
                      <div className="text-center">
                        <p className="text-2xl font-black text-red-400">{sessionScore.red}</p>
                        <p className="text-xs text-red-300">Red</p>
                      </div>
                      <div className="text-gray-500 text-xl">-</div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-blue-400">{sessionScore.blue}</p>
                        <p className="text-xs text-blue-300">Blue</p>
                      </div>
                    </div>
                  </div>
                  {/* Red Team Section */}
                  <div className={`rounded-lg p-2 border-4 transition-all duration-300 ${
                    gameState.currentTeam === "red" && !gameState.gameOver
                      ? "border-red-500 shadow-lg shadow-red-500/50 bg-red-900 bg-opacity-20"
                      : "border-red-800 bg-red-900 bg-opacity-10"
                  }`}>
                    <div className="bg-red-900 bg-opacity-40 rounded-lg px-3 py-2 border-2 border-red-600 mb-2 flex items-center gap-2">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center card-shadow relative">
                        {/* Replace /images/red-team.png with your custom image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/40 to-red-900/60" />
                        <svg className="w-7 h-7 text-white opacity-60 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-red-300 uppercase tracking-wider leading-none">Red Team</p>
                        <p className="text-2xl font-black text-red-400 leading-none mt-0.5">{gameState.redRemaining}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 min-h-[100px]">
                      {gameState.players
                        .filter((p) => p.team === "red")
                        .map((p) => {
                          const isReady = (gameState.readyPlayers || []).includes(p.id);
                          const displayName = gameState.phase === "lobby" && !isReady ? `(${p.name})` : p.name;

                          return (
                            <div key={p.id} className="bg-red-900 bg-opacity-30 rounded px-3 py-2.5 flex items-center gap-2">
                              <div className="text-sm font-medium flex-1">{displayName}</div>
                              {/* Spymaster indicator (active phase) */}
                              {gameState.phase === "active" && p.role === "spymaster" && (
                                <svg className="w-4 h-4 text-red-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Spymaster">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      {gameState.players.filter((p) => p.team === "red").length === 0 && (
                        <p className="text-gray-500 text-xs italic">No players yet</p>
                      )}
                    </div>
                  </div>

                  {/* Blue Team Section */}
                  <div className={`rounded-lg p-2 border-4 transition-all duration-300 ${
                    gameState.currentTeam === "blue" && !gameState.gameOver
                      ? "border-blue-500 shadow-lg shadow-blue-500/50 bg-blue-900 bg-opacity-20"
                      : "border-blue-800 bg-blue-900 bg-opacity-10"
                  }`}>
                    <div className="bg-blue-900 bg-opacity-40 rounded-lg px-3 py-2 border-2 border-blue-600 mb-2 flex items-center gap-2">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center card-shadow relative">
                        {/* Replace /images/blue-team.png with your custom image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 to-blue-900/60" />
                        <svg className="w-7 h-7 text-white opacity-60 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-blue-300 uppercase tracking-wider leading-none">Blue Team</p>
                        <p className="text-2xl font-black text-blue-400 leading-none mt-0.5">{gameState.blueRemaining}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 min-h-[100px]">
                      {gameState.players
                        .filter((p) => p.team === "blue")
                        .map((p) => {
                          const isReady = (gameState.readyPlayers || []).includes(p.id);
                          const displayName = gameState.phase === "lobby" && !isReady ? `(${p.name})` : p.name;

                          return (
                            <div key={p.id} className="bg-blue-900 bg-opacity-30 rounded px-3 py-2.5 flex items-center gap-2">
                              <div className="text-sm font-medium flex-1">{displayName}</div>
                              {/* Spymaster indicator (active phase) */}
                              {gameState.phase === "active" && p.role === "spymaster" && (
                                <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Spymaster">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      {gameState.players.filter((p) => p.team === "blue").length === 0 && (
                        <p className="text-gray-500 text-xs italic">No players yet</p>
                      )}
                    </div>
                  </div>

                  {/* Unassigned Players */}
                  {gameState.players.filter((p) => !p.team).length > 0 && (
                    <div>
                      <h4 className="text-gray-400 font-bold mb-3 text-sm uppercase tracking-wide">Unassigned</h4>
                      <div className="space-y-1.5">
                        {gameState.players
                          .filter((p) => !p.team)
                          .map((p) => (
                            <div key={p.id} className="bg-gray-700 bg-opacity-30 rounded px-3 py-2.5">
                              <div className="text-sm font-medium">{p.name}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4 relative">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 mt-4">
          <div className="flex justify-between items-start max-w-[90%] mx-auto">
            <div>
              <h1 className="text-6xl font-black tracking-tight text-white">CODENAMES</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-xl font-bold smooth-transition"
              >
                Help
              </button>
              <button
                onClick={copyGameLink}
                className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-xl font-bold smooth-transition"
              >
                Copy Invite Link
              </button>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 border-2 border-gray-400 bg-transparent text-white hover:bg-gray-700 px-6 py-3 rounded-xl font-semibold smooth-transition"
                >
                  <span>{currentPlayer?.name || "Anonymous"}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0d1b2e] border-2 border-gray-600 rounded-xl shadow-xl z-50">
                    <button
                      onClick={handleOpenChangeName}
                      className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 flex items-center gap-2 rounded-t-xl smooth-transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Change Name
                    </button>
                    <div className="border-t border-gray-600"></div>
                    <button
                      onClick={handleLeaveGame}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-700 flex items-center gap-2 rounded-b-xl smooth-transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lobby Phase - Team Selection */}
        {(!gameState.phase || gameState.phase === "lobby") ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#0d1b2e] rounded-2xl p-12 border-2 border-gray-700 card-shadow-lg">
              <h2 className="text-4xl font-black mb-4 text-center bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Lobby
              </h2>
              <p className="text-gray-400 text-center mb-10 text-lg">
                Choose your team and get ready to play
              </p>

              {/* Team Selection Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => handleJoinTeam("red")}
                  className={`py-6 px-8 rounded-xl font-bold text-2xl transition-all duration-200 ${
                    currentPlayer.team === "red"
                      ? "bg-red-600 text-white scale-105 shadow-lg shadow-red-500/50"
                      : "bg-red-900/30 border-2 border-red-700 text-red-300 hover:bg-red-900/50 hover:scale-105"
                  }`}
                >
                  {currentPlayer.team === "red" ? "✓ Red Team" : "Join Red"}
                </button>
                <button
                  onClick={() => handleJoinTeam("blue")}
                  className={`py-6 px-8 rounded-xl font-bold text-2xl transition-all duration-200 ${
                    currentPlayer.team === "blue"
                      ? "bg-blue-600 text-white scale-105 shadow-lg shadow-blue-500/50"
                      : "bg-blue-900/30 border-2 border-blue-700 text-blue-300 hover:bg-blue-900/50 hover:scale-105"
                  }`}
                >
                  {currentPlayer.team === "blue" ? "✓ Blue Team" : "Join Blue"}
                </button>
              </div>

              {/* Ready Button */}
              {currentPlayer.team && (
                <div className="mb-8">
                  <button
                    onClick={handleToggleReady}
                    className={`w-full py-5 rounded-xl font-bold text-xl transition-all duration-200 ${
                      (gameState.readyPlayers || []).includes(currentPlayer.id)
                        ? "bg-green-600 text-white shadow-lg shadow-green-500/50"
                        : "bg-gray-700 border-2 border-gray-600 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {(gameState.readyPlayers || []).includes(currentPlayer.id) ? "✓ Ready" : "Ready Up"}
                  </button>
                  <p className="text-gray-500 text-sm text-center mt-2">
                    {(gameState.readyPlayers || []).includes(currentPlayer.id)
                      ? "Click Ready again to unlock team selection"
                      : "You can change teams until you click Ready"}
                  </p>
                </div>
              )}

              {/* Status Message */}
              <div className="text-center">
                {(() => {
                  const redPlayers = gameState.players.filter(p => p.team === "red");
                  const bluePlayers = gameState.players.filter(p => p.team === "blue");
                  const playersOnTeams = gameState.players.filter(p => p.team);
                  const allReady = playersOnTeams.length > 0 && playersOnTeams.every(p => (gameState.readyPlayers || []).includes(p.id));

                  if (allReady && redPlayers.length >= 2 && bluePlayers.length >= 2) {
                    return (
                      <p className="text-green-400 text-lg font-bold animate-pulse">
                        All players ready! Starting spymaster selection...
                      </p>
                    );
                  }

                  return (
                    <p className="text-gray-400 text-sm">
                      Waiting for players to ready up
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : gameState.phase === "spymaster-selection" ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#0d1b2e] rounded-2xl p-12 border-2 border-gray-700 card-shadow-lg">
              <h2 className="text-4xl font-black mb-4 text-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Select Spymasters
              </h2>
              <p className="text-gray-400 text-center mb-10 text-lg">
                Click on a teammate to vote for them as Spymaster (51% needed)
              </p>

              <div className="grid grid-cols-2 gap-8">
                {/* Red Team Voting */}
                <div className="bg-red-900/20 rounded-xl p-6 border-2 border-red-700">
                  <h3 className="text-2xl font-bold text-red-300 mb-4 text-center">Red Team</h3>
                  <div className="space-y-3">
                    {gameState.players
                      .filter(p => p.team === "red")
                      .map(p => {
                        const votes = Object.values(gameState.spymasterVotes?.red || {}).filter(v => v === p.id).length;
                        const redPlayerCount = gameState.players.filter(p => p.team === "red").length;
                        const majorityNeeded = Math.ceil(redPlayerCount / 2);
                        const isWinner = gameState.redSpymaster === p.id;

                        return (
                          <button
                            key={p.id}
                            onClick={() => handleVoteSpymaster(p.id)}
                            disabled={currentPlayer.team !== "red" || isWinner}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all ${
                              isWinner
                                ? "bg-yellow-500 text-black shadow-lg"
                                : currentPlayer.team === "red"
                                ? "bg-red-800 hover:bg-red-700 text-red-200"
                                : "bg-red-900/30 text-red-400 cursor-not-allowed"
                            }`}
                          >
                            {p.name} {isWinner && "👁️ SPYMASTER"} ({votes}/{majorityNeeded})
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Blue Team Voting */}
                <div className="bg-blue-900/20 rounded-xl p-6 border-2 border-blue-700">
                  <h3 className="text-2xl font-bold text-blue-300 mb-4 text-center">Blue Team</h3>
                  <div className="space-y-3">
                    {gameState.players
                      .filter(p => p.team === "blue")
                      .map(p => {
                        const votes = Object.values(gameState.spymasterVotes?.blue || {}).filter(v => v === p.id).length;
                        const bluePlayerCount = gameState.players.filter(p => p.team === "blue").length;
                        const majorityNeeded = Math.ceil(bluePlayerCount / 2);
                        const isWinner = gameState.blueSpymaster === p.id;

                        return (
                          <button
                            key={p.id}
                            onClick={() => handleVoteSpymaster(p.id)}
                            disabled={currentPlayer.team !== "blue" || isWinner}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all ${
                              isWinner
                                ? "bg-yellow-500 text-black shadow-lg"
                                : currentPlayer.team === "blue"
                                ? "bg-blue-800 hover:bg-blue-700 text-blue-200"
                                : "bg-blue-900/30 text-blue-400 cursor-not-allowed"
                            }`}
                          >
                            {p.name} {isWinner && "👁️ SPYMASTER"} ({votes}/{majorityNeeded})
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <p className="text-center text-gray-400 mt-8 text-lg">
                {gameState.redSpymaster && gameState.blueSpymaster
                  ? "Both spymasters selected! Starting game..."
                  : "Waiting for both teams to select spymasters..."}
              </p>
            </div>
          </div>
        ) : gameState.phase === "active" ? (
          <>
            {/* Turn Transition Banner */}
            {showTurnTransition && (
              <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className={`${
                  gameState.currentTeam === "red"
                    ? "bg-red-600 border-red-400"
                    : "bg-blue-600 border-blue-400"
                } border-4 rounded-2xl px-16 py-8 shadow-2xl`}>
                  <p className={`text-6xl font-black uppercase tracking-wider text-white`}>
                    {gameState.currentTeam === "red" ? "🔴 RED" : "🔵 BLUE"} TEAM'S TURN
                  </p>
                </div>
              </div>
            )}

            {/* Current Clue Display */}
            <div className="max-w-[90%] mx-auto mb-6">
              {gameState.currentClue ? (
                <div className={`${
                  gameState.currentClue.team === "red"
                    ? "bg-red-900 border-red-500"
                    : "bg-blue-900 border-blue-500"
                } bg-opacity-30 border-2 rounded-lg px-6 py-3 flex items-center justify-center gap-4`}>
                  <p className="text-gray-300 text-sm font-medium">
                    {gameState.currentClue.team === "red" ? "RED" : "BLUE"} TEAM CLUE:
                  </p>
                  <p className={`${
                    gameState.currentClue.team === "red" ? "text-red-400" : "text-blue-400"
                  } text-3xl font-bold uppercase`}>
                    {gameState.currentClue.word}
                  </p>
                  <p className={`${
                    gameState.currentClue.team === "red" ? "text-red-400" : "text-blue-400"
                  } text-3xl font-bold`}>
                    {gameState.currentClue.number}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 bg-opacity-50 border-2 border-gray-600 rounded-lg px-6 py-3 text-center">
                  <p className="text-gray-400 text-base">
                    Waiting for {gameState.currentTeam === "red" ? "Red" : "Blue"} spymaster to give a clue...
                  </p>
                </div>
              )}
            </div>

            {/* Game Board */}
            <div className="grid grid-cols-5 gap-3 mb-6 max-w-[90%] mx-auto">
              {gameState.cards.map((card, index) => {
                const isRevealed = card.revealed;
                const canClick = canRevealCards && !isRevealed && !gameState.gameOver;

                // Spymaster view colors (when not revealed)
                let bgColor = "bg-gray-700";
                if (!isRevealed && isSpymaster) {
                  if (card.type === "red") bgColor = "bg-red-900 border-2 border-red-500";
                  else if (card.type === "blue") bgColor = "bg-blue-900 border-2 border-blue-500";
                  else if (card.type === "neutral") bgColor = "bg-gray-600 border-2 border-gray-400";
                  else if (card.type === "assassin") bgColor = "bg-gray-900 border-2 border-gray-400";
                }

                // Cover card colors (when revealed)
                let coverColor = "";
                let coverIcon = "";
                if (isRevealed) {
                  if (card.type === "red") {
                    coverColor = "bg-red-600";
                    coverIcon = "🕵️";
                  } else if (card.type === "blue") {
                    coverColor = "bg-blue-600";
                    coverIcon = "🕵️";
                  } else if (card.type === "neutral") {
                    coverColor = "bg-gray-500";
                    coverIcon = "👤";
                  } else if (card.type === "assassin") {
                    coverColor = "bg-black";
                    coverIcon = "💀";
                  }
                }

                const isPeeking = peekedCardIndex === index;

                // Background color for revealed cards when peeking
                let peekBgColor = "";
                if (isRevealed && isPeeking) {
                  if (card.type === "red") peekBgColor = "bg-red-900 border-2 border-red-500";
                  else if (card.type === "blue") peekBgColor = "bg-blue-900 border-2 border-blue-500";
                  else if (card.type === "neutral") peekBgColor = "bg-gray-600 border-2 border-gray-400";
                  else if (card.type === "assassin") peekBgColor = "bg-gray-900 border-2 border-gray-400";
                }

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (isRevealed) {
                        // Click to peek under revealed cards
                        setPeekedCardIndex(index);
                      } else {
                        // Normal card click for unrevealed cards
                        handleCardClick(index);
                      }
                    }}
                    onMouseLeave={() => {
                      // Hide peek when mouse leaves
                      if (isRevealed && isPeeking) {
                        setPeekedCardIndex(null);
                      }
                    }}
                    disabled={!canClick && !isRevealed}
                    className={`${isPeeking ? peekBgColor : bgColor} ${
                      canClick ? "hover:opacity-80 cursor-pointer" : ""
                    } ${
                      isRevealed ? "cursor-pointer" : ""
                    } ${
                      clickedCardIndex === index ? "ring-4 ring-white shadow-2xl shadow-white/50" : ""
                    } rounded-lg h-24 flex items-center justify-center text-center font-bold transition-all relative overflow-hidden ${
                      !canClick && !isSpymaster && !isRevealed ? "cursor-default" : ""
                    }`}
                  >
                    {/* Word - always visible underneath or when peeking */}
                    <span className="p-6">{card.word}</span>

                    {/* Cover card overlay - shown when revealed and not peeking */}
                    {isRevealed && !isPeeking && (
                      <div className={`${coverColor} absolute inset-0 flex items-center justify-center transition-all`}>
                        <span className="text-5xl">{coverIcon}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex gap-4 justify-center">
              {currentPlayer.team === gameState.currentTeam && currentPlayer.role === "operative" && !gameState.gameOver && (
                <button
                  onClick={handleEndTurn}
                  disabled={!gameState.clueGivenThisTurn}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-black text-lg uppercase tracking-wide smooth-transition hover:scale-105 card-shadow-lg"
                >
                  End Turn
                </button>
              )}
              {gameState.gameOver && (
                <div className="text-center bg-[#0d1b2e] rounded-2xl p-8 border-2 border-gray-700 card-shadow-lg">
                  <p className="text-5xl font-black mb-6 uppercase">
                    {gameState.winner === "red" ? (
                      <span className="text-red-400 drop-shadow-lg">🎉 Red Team Wins! 🎉</span>
                    ) : (
                      <span className="text-blue-400 drop-shadow-lg">🎉 Blue Team Wins! 🎉</span>
                    )}
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleEndRound}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-10 py-4 rounded-xl font-black text-xl uppercase tracking-wide smooth-transition hover:scale-105 card-shadow-lg"
                    >
                      Next Round
                    </button>
                    <button
                      onClick={handleResetToLobby}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 px-10 py-4 rounded-xl font-black text-xl uppercase tracking-wide smooth-transition hover:scale-105 card-shadow-lg"
                    >
                      Back to Lobby
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Spymaster Clue Input - Only show if it's your turn and clue hasn't been given */}
            {isSpymaster && !gameState.gameOver && gameState.currentTeam === currentPlayer.team && !gameState.clueGivenThisTurn && (
              <div className="mt-8 max-w-[90%] mx-auto">
                <div className="bg-[#0d1b2e] rounded-2xl p-6 border-2 border-gray-700">
                  <div className="mb-4">
                    <p className={`text-lg font-bold uppercase ${
                      gameState.currentTeam === "red" ? "text-red-400" : "text-blue-400"
                    }`}>
                      Give Your Clue:
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder="Enter your clue..."
                      className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                      maxLength={50}
                      autoFocus
                    />
                    <input
                      type="number"
                      min="0"
                      max="9"
                      value={clueNumber}
                      onChange={(e) => setClueNumber(parseInt(e.target.value) || 0)}
                      placeholder="#"
                      className="w-20 bg-gray-800 text-white px-4 py-3 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                    />
                    <button
                      onClick={() => {
                        if (clueInput.trim() && clueNumber >= 0 && socket) {
                          socket.emit("give-clue", {
                            gameId: gameCode,
                            clue: {
                              word: clueInput.trim(),
                              number: clueNumber,
                            },
                          });
                          setClueInput("");
                          setClueNumber(1);
                        }
                      }}
                      disabled={!clueInput.trim() || clueNumber < 0}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-bold smooth-transition"
                    >
                      Give Clue
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        ) : null}
        </div>
      </div>


      {/* Right Panel - Video & Chat */}
      <div id="sidebar-container" className="w-[450px] flex flex-col pt-8 pb-4 pr-8 pl-4">
        {/* Video Container */}
        <div className="mb-2">
          <div ref={videoRef} className="bg-black rounded-lg overflow-hidden border-2 border-gray-700" style={{ height: `${videoHeight}px` }}>
            <iframe
              src={jitsiUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
              title="Video Chat"
            />
          </div>
        </div>

        {/* Vertical Resize Handle */}
        <div
          className="h-1 cursor-ns-resize mb-2"
          onMouseDown={() => setIsResizingVideo(true)}
        >
          <div className="h-full bg-gray-700 hover:bg-blue-500 active:bg-blue-600 transition-colors rounded-full" />
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col bg-[#0d1b2e] rounded-lg border-2 border-gray-700 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <h4 className="font-semibold text-sm">Game Chat</h4>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-4">No messages yet. Say hello!</p>
              ) : (
                chatMessages.map((msg) => {
                  // Find player by name to get their team
                  const player = gameState?.players.find(p => p.name === msg.playerName);
                  const team = player?.team;

                  // Color based on team
                  let nameColor = "text-gray-400"; // No team
                  if (team === "red") nameColor = "text-red-400";
                  else if (team === "blue") nameColor = "text-blue-400";

                  return (
                    <div key={msg.id} className="text-sm">
                      <span className={`font-semibold ${nameColor}`}>{msg.playerName}:</span>{" "}
                      <span className="text-gray-200">{msg.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-bold smooth-transition"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Change Name Modal */}
      {isChangeNameModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setIsChangeNameModalOpen(false)}>
          <div className="bg-[#0d1b2e] rounded-2xl p-8 border-2 border-gray-600 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-black mb-6 text-white">Change Your Name</h2>

            <div className="mb-6">
              <label htmlFor="newName" className="block text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">
                New Name
              </label>
              <input
                id="newName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChangeName()}
                placeholder="Enter your new name"
                className="w-full px-4 py-3 bg-[#0a1628]/50 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 transition-all duration-200"
                maxLength={20}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleChangeName}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Save
              </button>
              <button
                onClick={() => setIsChangeNameModalOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsHelpModalOpen(false)}>
          <div className="bg-[#0d1b2e] rounded-2xl p-8 border-2 border-gray-600 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-4xl font-black text-white">How to Play Codenames</h2>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 text-gray-200">
              {/* Setup Section */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Setup</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-blue-300">Form Teams:</strong> Players divide into two teams of at least two people each.</li>
                  <li><strong className="text-blue-300">Assign Roles:</strong> Each team chooses one Spymaster; the rest are Field Operatives.</li>
                  <li><strong className="text-blue-300">Spymaster View:</strong> The Spymasters&apos; screens display a key, which secretly shows which words are Red, Blue, Neutral (Bystander), or the Assassin (Black - avoid at all costs!).</li>
                  <li><strong className="text-blue-300">Starting Team:</strong> The team with 9 cards to find goes first.</li>
                </ul>
              </div>

              {/* How to Play Section */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">How to Play</h3>
                <p className="mb-3">Teams alternate turns, starting with the first team. A turn consists of two phases:</p>

                {/* Clue Phase */}
                <div className="ml-4 mb-4">
                  <h4 className="text-xl font-bold text-red-300 mb-2">1. The Clue Phase (Spymaster)</h4>
                  <p className="mb-2">The Spymaster gives a clue consisting of exactly one word and one number (e.g., &quot;Nature, 2&quot;).</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li><strong className="text-blue-300">The Clue:</strong> Should relate to as many of your team&apos;s words as possible.</li>
                    <li><strong className="text-blue-300">The Number:</strong> Indicates how many words on the board the clue relates to.</li>
                    <li><strong className="text-blue-300">Illegal Clues:</strong> You cannot use any part of a word currently visible on the board.</li>
                  </ul>
                </div>

                {/* Guessing Phase */}
                <div className="ml-4">
                  <h4 className="text-xl font-bold text-red-300 mb-2">2. The Guessing Phase (Operatives)</h4>
                  <p className="mb-2">Operatives discuss and then touch a card to guess it.</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li><strong className="text-blue-300">Correct Guess:</strong> If the word belongs to your team, the Spymaster covers it with your color. You may then choose to make another guess.</li>
                    <li><strong className="text-blue-300">Innocent Bystander:</strong> If the word is tan, the Spymaster covers it with a bystander tile and your turn ends immediately.</li>
                    <li><strong className="text-blue-300">Opposing Team&apos;s Agent:</strong> If the word belongs to the other team, they get a tile on that word and your turn ends immediately.</li>
                    <li><strong className="text-blue-300">The Assassin:</strong> If you pick the assassin word (black square), your team loses immediately.</li>
                    <li><strong className="text-blue-300">Number of Guesses:</strong> You must make at least one guess. You can make up to N+1 guesses, where N is the number the Spymaster gave.</li>
                  </ul>
                </div>
              </div>

              {/* Winning the Game Section */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Winning the Game</h3>
                <p>The first team to identify all their agents wins. The game also ends if a team touches the assassin, resulting in an immediate loss for them and a win for the other team.</p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
