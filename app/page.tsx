"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const USERNAME_STORAGE_KEY = "codenames-username";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const router = useRouter();

  // Load saved username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    if (savedUsername) {
      setPlayerName(savedUsername);
    }
  }, []);

  const createGame = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    // Save username to localStorage
    localStorage.setItem(USERNAME_STORAGE_KEY, playerName.trim());
    const code = generateGameCode();
    router.push(`/game/${code}?name=${encodeURIComponent(playerName)}`);
  };

  const joinGame = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!gameCode.trim()) {
      alert("Please enter a game code");
      return;
    }
    // Save username to localStorage
    localStorage.setItem(USERNAME_STORAGE_KEY, playerName.trim());
    router.push(`/game/${gameCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
  };

  const generateGameCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628] p-4 overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Title Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-7xl font-black mb-4 bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-2xl">
            CODENAMES
          </h1>
          <p className="text-xl text-gray-400 font-light tracking-wide">
            Online Multiplayer Wordgame
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#111827] rounded-3xl p-10 shadow-2xl border border-gray-700/50 backdrop-blur-sm animate-slide-up">
          <div className="space-y-8">
            {/* Name Input */}
            <div className="space-y-3">
              <label htmlFor="playerName" className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createGame()}
                placeholder="Enter your name"
                className="w-full px-6 py-4 bg-[#0a1628]/50 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 transition-all duration-200 text-lg"
                maxLength={20}
              />
            </div>

            {/* Create Button */}
            <button
              onClick={createGame}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 text-lg uppercase tracking-wide"
            >
              Create New Game
            </button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600/50"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-gradient-to-br from-[#0d1b2e] to-[#111827] text-gray-400 text-sm font-semibold tracking-wider">
                  OR
                </span>
              </div>
            </div>

            {/* Game Code Input */}
            <div className="space-y-3">
              <label htmlFor="gameCode" className="block text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Game Code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                placeholder="ABCD12"
                className="w-full px-6 py-4 bg-[#0a1628]/50 border-2 border-gray-600/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-500 transition-all duration-200 text-lg uppercase font-mono tracking-widest text-center"
                maxLength={6}
              />
            </div>

            {/* Join Button */}
            <button
              onClick={joinGame}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-5 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 text-lg uppercase tracking-wide"
            >
              Join Game
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Gather your team, choose your spymaster, and start playing!
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
