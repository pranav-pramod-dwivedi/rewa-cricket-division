'use client';

import React from 'react';
import { Users, Crown, Radio, Copy, Check, Shield } from 'lucide-react';
import { Participant } from '@/lib/firebase';

interface ParticipantListProps {
  participants: Participant[];
  hostId: string;
  currentUserId: string;
}

export default function ParticipantList({
  participants,
  hostId,
  currentUserId,
}: ParticipantListProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-sm text-white">Party Room Members</span>
          <span className="text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
            {participants.length} online
          </span>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Invite</span>
        </button>
      </div>

      {/* Participant Cards */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 scrollbar-thin">
        {participants.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-400" />
            <p className="text-xs font-medium text-zinc-400">No other members active</p>
          </div>
        ) : (
          participants.map((p) => {
            const isHost = p.userId === hostId || p.role === 'host';
            const isSelf = p.userId === currentUserId;

            return (
              <div
                key={p.userId}
                className="flex items-center justify-between p-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        p.userAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId}`
                      }
                      alt={p.userName}
                      className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                        p.isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {p.userName || 'Guest'}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono block truncate">
                      {isHost ? 'Party Host' : 'Viewer'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isHost ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Host
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                      Viewer
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
