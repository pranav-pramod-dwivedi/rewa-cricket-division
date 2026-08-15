'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smile,
  Popcorn,
  Flame,
  Heart,
  Laugh,
  ThumbsUp,
  Sparkles,
  MessageSquare,
  ListVideo,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessage, sendChatMessage } from '@/lib/firebase';
import confetti from 'canvas-confetti';

interface ChatPanelProps {
  roomId: string;
  userId: string;
  userName: string;
  messages: ChatMessage[];
  onSendReaction?: (emoji: string) => void;
}

const QUICK_REACTIONS = [
  { emoji: '🍿', label: 'Popcorn' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😱', label: 'Shock' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🚀', label: 'Rocket' },
];

export default function ChatPanel({
  roomId,
  userId,
  userName,
  messages,
  onSendReaction,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    await sendChatMessage(roomId, { uid: userId, displayName: userName }, textToSend, 'chat');
  };

  const handleReactionClick = async (emoji: string) => {
    // Confetti effect on party or popcorn
    if (emoji === '🎉' || emoji === '🍿') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }

    if (onSendReaction) {
      onSendReaction(emoji);
    }

    await sendChatMessage(
      roomId,
      { uid: userId, displayName: userName },
      `reacted with ${emoji}`,
      'reaction'
    );
  };

  const handleCopyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header */}
      <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose-500" />
          <span className="font-bold text-sm text-white">Live Chat</span>
          <span className="text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
            {messages.length} msgs
          </span>
        </div>

        <button
          onClick={handleCopyInvite}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg transition-all active:scale-95"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-rose-400" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <Popcorn className="w-10 h-10 mb-2 opacity-30 text-rose-400" />
            <p className="text-sm font-medium text-zinc-400">Welcome to WatchParty!</p>
            <p className="text-xs text-zinc-500 mt-1">Say hi to everyone or react with emojis below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.userId === userId;
            const isSystem = msg.type === 'system' || msg.type === 'media_change';
            const isReaction = msg.type === 'reaction';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="my-2 py-1.5 px-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (isReaction) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSelf ? 'justify-end' : 'justify-start'} my-1`}
                >
                  <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300 flex items-center gap-1.5 shadow-sm">
                    <span className="font-semibold text-rose-400">{isSelf ? 'You' : msg.userName}</span>
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <img
                  src={
                    msg.userAvatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId}`
                  }
                  alt="avatar"
                  className="w-7 h-7 rounded-full bg-zinc-800 shrink-0 border border-zinc-700/50"
                />
                <div className={`max-w-[80%] ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                    <span className="text-xs font-semibold text-zinc-300">
                      {isSelf ? 'You' : msg.userName}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-md ${
                      isSelf
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-tr-none font-medium'
                        : 'bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Emoji Reaction Bar */}
      <div className="px-3 py-2 bg-zinc-900/50 border-t border-zinc-800/80 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {QUICK_REACTIONS.map((item) => (
          <button
            key={item.label}
            onClick={() => handleReactionClick(item.emoji)}
            title={item.label}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-lg transform hover:scale-125 transition-transform active:scale-95 shrink-0"
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 bg-zinc-900 border-t border-zinc-800/80 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message to the room..."
          className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl text-white placeholder-zinc-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
