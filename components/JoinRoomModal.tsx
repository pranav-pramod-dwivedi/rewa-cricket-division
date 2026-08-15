'use client';

import React, { useState, useEffect } from 'react';
import { X, LogIn, Users, Radio, Sparkles, Popcorn } from 'lucide-react';
import { db, RoomData } from '@/lib/firebase';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  onJoin,
}: JoinRoomModalProps) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRooms, setActiveRooms] = useState<RoomData[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: RoomData[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as RoomData);
      });
      setActiveRooms(list);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;
    onJoin(roomIdInput.trim().toLowerCase());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Join a WatchParty Room</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 block">
              Enter Room ID or Direct Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="e.g. movie-night-alpha, room-123..."
                required
                className="flex-1 px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl text-white outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Join</span>
              </button>
            </div>
          </form>

          {/* Active Public Rooms Stream */}
          <div className="pt-3 border-t border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Active Public Rooms
            </span>

            {activeRooms.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                No active rooms found right now. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {activeRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => {
                      onJoin(room.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-blue-500/50 cursor-pointer transition-all group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {room.name}
                        </h5>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                        Host: {room.hostName} · Watching: {room.currentMedia?.title || 'Video Stream'}
                      </p>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      Join Room
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
