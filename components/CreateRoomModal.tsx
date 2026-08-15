'use client';

import React, { useState } from 'react';
import { X, Plus, Film, Lock, Popcorn, Sparkles, Play } from 'lucide-react';
import { MediaItem, createRoom, ensureAuthUser } from '@/lib/firebase';
import { SAMPLE_MOVIES, SampleMovie } from '@/lib/sampleMovies';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
  initialSelectedMovie?: SampleMovie | null;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  onCreated,
  initialSelectedMovie,
}: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('Weekend Watch Party');
  const [hostName, setHostName] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<typeof SAMPLE_MOVIES[0]>(
    initialSelectedMovie
      ? SAMPLE_MOVIES.find((m) => m.url === initialSelectedMovie.url) || SAMPLE_MOVIES[0]
      : SAMPLE_MOVIES[0]
  );
  const [customUrl, setCustomUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setIsSubmitting(true);
    try {
      const user = await ensureAuthUser(hostName.trim() || undefined);

      let media: MediaItem = {
        url: selectedMovie.url,
        title: selectedMovie.title,
        type: selectedMovie.type,
        thumbnail: selectedMovie.thumbnail,
      };

      if (useCustomUrl && customUrl.trim()) {
        let type: 'youtube' | 'video' | 'hls' = 'video';
        if (customUrl.includes('youtube.com') || customUrl.includes('youtu.be')) type = 'youtube';
        else if (customUrl.endsWith('.m3u8')) type = 'hls';

        media = {
          url: customUrl.trim(),
          title: 'Custom Watch Stream',
          type,
          thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop',
        };
      }

      const roomId = await createRoom(roomName.trim(), {
        uid: user.uid,
        displayName: user.displayName || hostName.trim() || 'Host',
      }, media);

      onCreated(roomId);
      onClose();
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popcorn className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-white">Host a New WatchParty</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Watch Party Room Title
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Marvel Movie Night, Anime Chill Room"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Your Display Nickname
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Leave blank to use default guest name"
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Initial Movie / Video Selection
              </label>
              <button
                type="button"
                onClick={() => setUseCustomUrl(!useCustomUrl)}
                className="text-xs font-semibold text-rose-400 hover:underline"
              >
                {useCustomUrl ? 'Pick Sample Movie' : 'Use Custom Video URL'}
              </button>
            </div>

            {useCustomUrl ? (
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste YouTube, MP4 or HLS .m3u8 link..."
                required
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl text-white outline-none"
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {SAMPLE_MOVIES.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMovie(m)}
                    className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                      selectedMovie.id === m.id
                        ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/40'
                        : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={m.thumbnail}
                      alt={m.title}
                      className="w-12 h-8 rounded object-cover bg-zinc-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate">{m.title}</h5>
                      <span className="text-[10px] text-zinc-400">{m.category} · {m.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Creating Room...' : 'Launch WatchParty Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
