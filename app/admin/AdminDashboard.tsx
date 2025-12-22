'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  id: string;
  name: string;
  team: string | null;
  role: string | null;
}

interface Game {
  id: string;
  phase: string;
  playerCount: number;
  players: Player[];
  redScore: number;
  blueScore: number;
  redRemaining: number;
  blueRemaining: number;
  currentTeam: string;
  gameOver: boolean;
  winner: string | null;
  createdAt: number;
  elapsedTime: number;
  currentClue: { word: string; number: number; team: string } | null;
  redSpymaster: string | null;
  blueSpymaster: string | null;
}

interface GamesData {
  games: Game[];
  totalGames: number;
  totalPlayers: number;
}

interface JitsiData {
  status: string;
  healthy: boolean;
  stress: number;
  jitter: number;
  conferences: Array<{
    id: string;
    name: string;
    participantCount: number;
    participants: Array<{ id: string; name: string }>;
  }>;
  conferenceCount: number;
  totalParticipants: number;
  error?: string;
}

export default function AdminDashboard() {
  const [gamesData, setGamesData] = useState<GamesData | null>(null);
  const [jitsiData, setJitsiData] = useState<JitsiData | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [gamesRes, jitsiRes] = await Promise.all([
        fetch('/api/admin/games'),
        fetch('/api/admin/jitsi'),
      ]);

      if (!gamesRes.ok || !jitsiRes.ok) {
        if (gamesRes.status === 401 || jitsiRes.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const games = await gamesRes.json();
      const jitsi = await jitsiRes.json();

      setGamesData(games);
      setJitsiData(jitsi);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatPhase = (phase: string) => {
    const phases: Record<string, string> = {
      lobby: 'Lobby',
      'spymaster-selection': 'Selecting Spymasters',
      active: 'Active',
      finished: 'Finished',
    };
    return phases[phase] || phase;
  };

  const getJitsiDataForGame = (gameId: string) => {
    if (!jitsiData) return null;
    const roomName = `codenames-${gameId.toLowerCase()}@muc.meet.jitsi`;
    return jitsiData.conferences.find((conf) => conf.name === roomName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Codenames Admin</h1>
              <p className="text-slate-400 text-sm">Administration Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                Auto-refresh (5s)
              </label>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-1">Active Games</div>
            <div className="text-3xl font-bold text-white">{gamesData?.totalGames || 0}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-1">Total Players</div>
            <div className="text-3xl font-bold text-white">{gamesData?.totalPlayers || 0}</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-1">Jitsi Status</div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  jitsiData?.healthy ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></span>
              <span className="text-xl font-bold text-white">
                {jitsiData?.healthy ? 'Healthy' : 'Error'}
              </span>
            </div>
            {jitsiData?.error && (
              <div className="text-xs text-red-400 mt-1">{jitsiData.error}</div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium mb-1">Server Stress</div>
            <div className="text-3xl font-bold text-white">
              {jitsiData?.stress ? `${(jitsiData.stress * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Games Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Active Games</h2>
          </div>

          {gamesData && gamesData.games.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              No active games at the moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-300 text-sm">
                    <th className="px-6 py-3 text-left font-medium">Game Code</th>
                    <th className="px-6 py-3 text-left font-medium">Phase</th>
                    <th className="px-6 py-3 text-left font-medium">Players</th>
                    <th className="px-6 py-3 text-left font-medium">Score</th>
                    <th className="px-6 py-3 text-left font-medium">Duration</th>
                    <th className="px-6 py-3 text-left font-medium">Video</th>
                    <th className="px-6 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gamesData?.games.map((game) => {
                    const jitsiConf = getJitsiDataForGame(game.id);
                    const isExpanded = expandedGame === game.id;

                    return (
                      <tr key={game.id} className="text-white hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                            className="font-mono font-semibold text-blue-400 hover:text-blue-300"
                          >
                            {game.id}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              game.phase === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : game.phase === 'finished'
                                ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {formatPhase(game.phase)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{game.playerCount} players</div>
                          <div className="text-xs text-slate-400">
                            🔴 {game.players.filter((p) => p.team === 'red').length} | 🔵{' '}
                            {game.players.filter((p) => p.team === 'blue').length}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-semibold">{game.redScore}</span>
                            <span className="text-slate-500">-</span>
                            <span className="text-blue-400 font-semibold">{game.blueScore}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            ({game.redRemaining} - {game.blueRemaining} left)
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {formatTime(game.elapsedTime)}
                        </td>
                        <td className="px-6 py-4">
                          {jitsiConf ? (
                            <div className="text-sm">
                              <div className="text-green-400 font-medium">
                                {jitsiConf.participantCount} in call
                              </div>
                              <div className="text-xs text-slate-400">
                                Jitter: {(jitsiData?.jitter || 0).toExponential(1)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">No video data</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://meet.pololabs.io/codenames-${game.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            Join Video
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expanded Game Details */}
        {expandedGame && gamesData && (
          <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            {(() => {
              const game = gamesData.games.find((g) => g.id === expandedGame);
              if (!game) return null;

              const redTeam = game.players.filter((p) => p.team === 'red');
              const blueTeam = game.players.filter((p) => p.team === 'blue');
              const unassigned = game.players.filter((p) => !p.team);

              return (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Game Details: {game.id}</h3>
                    <button
                      onClick={() => setExpandedGame(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Red Team */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-red-400 font-semibold mb-3">Red Team ({redTeam.length})</h4>
                      <div className="space-y-2">
                        {redTeam.map((player) => (
                          <div key={player.id} className="text-sm">
                            <div className="text-white">{player.name}</div>
                            <div className="text-red-300 text-xs">
                              {player.role === 'spymaster' ? '👑 Spymaster' : 'Operative'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blue Team */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h4 className="text-blue-400 font-semibold mb-3">Blue Team ({blueTeam.length})</h4>
                      <div className="space-y-2">
                        {blueTeam.map((player) => (
                          <div key={player.id} className="text-sm">
                            <div className="text-white">{player.name}</div>
                            <div className="text-blue-300 text-xs">
                              {player.role === 'spymaster' ? '👑 Spymaster' : 'Operative'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Game Info */}
                    <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                      <h4 className="text-slate-300 font-semibold mb-3">Game Info</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-slate-400">Current Turn:</span>
                          <span className="text-white ml-2">
                            {game.currentTeam === 'red' ? '🔴 Red' : '🔵 Blue'}
                          </span>
                        </div>
                        {game.currentClue && (
                          <div>
                            <span className="text-slate-400">Current Clue:</span>
                            <span className="text-white ml-2">
                              "{game.currentClue.word}", {game.currentClue.number}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400">Status:</span>
                          <span className="text-white ml-2">
                            {game.gameOver
                              ? `Won by ${game.winner === 'red' ? '🔴 Red' : '🔵 Blue'}`
                              : 'In Progress'}
                          </span>
                        </div>
                        {unassigned.length > 0 && (
                          <div>
                            <span className="text-slate-400">Unassigned:</span>
                            <span className="text-white ml-2">{unassigned.length} players</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
