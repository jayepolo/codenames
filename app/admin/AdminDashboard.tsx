'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  status: 'active' | 'ended';
  endedAt?: number;
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

interface MetricDataPoint {
  timestamp: number;
  jitter: number;
  participantCount: number;
}

function VideoQualityChart({ gameId }: { gameId: string }) {
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/games/${gameId}/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data.dataPoints || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading) {
    return (
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
        <h4 className="text-slate-300 font-semibold mb-3">Video Quality Trends</h4>
        <div className="text-slate-400 text-sm">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
        <h4 className="text-slate-300 font-semibold mb-3">Video Quality Trends</h4>
        <div className="text-slate-400 text-sm">No metrics available yet</div>
      </div>
    );
  }

  // Format data for the chart
  const chartData = metrics.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    jitter: parseFloat((point.jitter * 1000).toFixed(2)), // Convert to ms
    participants: point.participantCount,
  }));

  return (
    <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
      <h4 className="text-slate-300 font-semibold mb-4">Video Quality Trends (30 min)</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickLine={{ stroke: '#475569' }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickLine={{ stroke: '#475569' }}
            label={{ value: 'Jitter (ms)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
            labelStyle={{ color: '#cbd5e1' }}
          />
          <Line
            type="monotone"
            dataKey="jitter"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Jitter (ms)"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 text-xs text-slate-400">
        Current participants in video call: {chartData[chartData.length - 1]?.participants || 0}
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  gameId,
  gameStatus,
}: {
  player: Player;
  gameId: string;
  gameStatus: 'active' | 'ended';
}) {
  const [name, setName] = useState(player.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const teamIndicator = player.team === 'red' ? '🔴' : player.team === 'blue' ? '🔵' : '⚪';

  const handleNameUpdate = async () => {
    if (name === player.name || !name.trim() || gameStatus === 'ended') {
      setName(player.name);
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/games/${gameId}/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to update name');
      }

      // Success - name will be updated via game state refresh
    } catch (error) {
      console.error('Error updating player name:', error);
      setName(player.name); // Rollback on error
    } finally {
      setIsUpdating(false);
      setIsEditing(false);
    }
  };

  const handleSpymasterToggle = async () => {
    if (gameStatus === 'ended') return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/games/${gameId}/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleSpymaster: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle spymaster');
      }

      // Success - role will be updated via game state refresh
    } catch (error) {
      console.error('Error toggling spymaster:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <tr className="text-white text-sm hover:bg-slate-700/30">
      <td className="px-4 py-3">
        <span className="text-lg">{teamIndicator}</span>
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameUpdate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameUpdate();
              } else if (e.key === 'Escape') {
                setName(player.name);
                setIsEditing(false);
              }
            }}
            autoFocus
            disabled={isUpdating || gameStatus === 'ended'}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        ) : (
          <button
            onClick={() => gameStatus === 'active' && setIsEditing(true)}
            disabled={gameStatus === 'ended'}
            className={`text-left ${gameStatus === 'active' ? 'hover:text-blue-400' : 'cursor-not-allowed opacity-70'}`}
          >
            {player.name}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={player.role === 'spymaster'}
          onChange={handleSpymasterToggle}
          disabled={isUpdating || gameStatus === 'ended' || !player.team}
          className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const [gamesData, setGamesData] = useState<GamesData | null>(null);
  const [jitsiData, setJitsiData] = useState<JitsiData | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [gameFilter, setGameFilter] = useState<'active' | 'ended' | 'both'>('active');
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [gamesRes, jitsiRes] = await Promise.all([
        fetch(`/api/admin/games?filter=${gameFilter}`),
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
  }, [autoRefresh, gameFilter]);

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
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value as 'active' | 'ended' | 'both')}
                className="px-3 py-2 bg-slate-900 border border-slate-600 text-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active Games</option>
                <option value="ended">Ended Games</option>
                <option value="both">All Games</option>
              </select>
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
            <h2 className="text-lg font-semibold text-white">Games</h2>
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
                      <tr
                        key={game.id}
                        className={`text-white transition-colors ${
                          game.status === 'ended'
                            ? 'bg-slate-700/20 hover:bg-slate-700/40'
                            : 'hover:bg-slate-700/30'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                            className="font-mono font-semibold text-blue-400 hover:text-blue-300"
                          >
                            {game.id}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
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
                            {game.status === 'ended' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600/50 text-slate-400">
                                Ended
                              </span>
                            )}
                          </div>
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

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Players Table */}
                    <div className="lg:col-span-2 bg-slate-700/30 border border-slate-600/30 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-600/30">
                        <h4 className="text-slate-300 font-semibold">Players</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-900/50 text-slate-400 text-xs">
                              <th className="px-4 py-2 text-left font-medium">Team</th>
                              <th className="px-4 py-2 text-left font-medium">Name</th>
                              <th className="px-4 py-2 text-left font-medium">Spymaster</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {game.players.map((player) => (
                              <PlayerRow
                                key={player.id}
                                player={player}
                                gameId={game.id}
                                gameStatus={game.status}
                              />
                            ))}
                          </tbody>
                        </table>
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
                        <div>
                          <span className="text-slate-400">Teams:</span>
                          <div className="text-white ml-2">
                            🔴 {redTeam.length} | 🔵 {blueTeam.length} | ⚪ {unassigned.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Quality Chart */}
                  <div className="mt-6">
                    <VideoQualityChart gameId={game.id} />
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
