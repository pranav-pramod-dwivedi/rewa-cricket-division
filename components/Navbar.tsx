'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Popcorn, Plus, Users, Film, ShieldAlert, Sparkles, LogIn, User as UserIcon, Play } from 'lucide-react';
import { auth, ensureAuthUser } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface NavbarProps {
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
  onOpenCatalog?: () => void;
}

export default function Navbar({ onCreateRoom, onJoinRoom, onOpenCatalog }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.displayName) setNameInput(u.displayName);
    });
    return () => unsub();
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await ensureAuthUser(nameInput.trim());
    setIsEditingName(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Popcorn className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Watch<span className="text-rose-500">Party</span>
              </span>
              <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 -mt-1 hidden sm:block">Sync Movies & Videos Real-Time</p>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenCatalog && (
            <button
              onClick={onOpenCatalog}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Movie Catalog</span>
            </button>
          )}

          {onJoinRoom && (
            <button
              onClick={onJoinRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Join Room</span>
            </button>
          )}

          {onCreateRoom && (
            <button
              onClick={onCreateRoom}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-lg shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Host Party</span>
            </button>
          )}

          {/* User Profile / Nickname */}
          <div className="pl-2 border-l border-zinc-800 flex items-center gap-2">
            {user ? (
              isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-24 px-2 py-1 text-xs bg-zinc-900 border border-amber-500/50 rounded text-white focus:outline-none"
                    placeholder="Nickname"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2 py-1 text-[11px] bg-amber-500 text-black font-semibold rounded hover:bg-amber-400"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  title="Click to change display name"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-xs text-zinc-300 transition-colors"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt="avatar"
                    className="w-5 h-5 rounded-full bg-zinc-800"
                  />
                  <span className="font-medium max-w-[90px] truncate text-zinc-200">
                    {user.displayName || 'Guest'}
                  </span>
                </button>
              )
            ) : (
              <button
                onClick={() => ensureAuthUser()}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
