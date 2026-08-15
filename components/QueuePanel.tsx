'use client';

import React, { useState } from 'react';
import { ListVideo, Plus, Play, Trash2, Link as LinkIcon, Film, Sparkles } from 'lucide-react';
import { QueueItem, MediaItem, addToQueue, removeFromQueue, changeMedia } from '@/lib/firebase';
import { SAMPLE_MOVIES } from '@/lib/sampleMovies';

interface QueuePanelProps {
  roomId: string;
  isHost: boolean;
  user: { uid: string; displayName: string };
  queue: QueueItem[];
  currentMedia: MediaItem;
}

export default function QueuePanel({
  roomId,
  isHost,
  user,
  queue,
  currentMedia,
}: QueuePanelProps) {
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let mediaType: 'youtube' | 'video' | 'hls' = 'video';
    if (urlInput.includes('youtube.com') || urlInput.includes('youtu.be')) {
      mediaType = 'youtube';
    } else if (urlInput.endsWith('.m3u8')) {
      mediaType = 'hls';
    }

    const item: MediaItem = {
      url: urlInput.trim(),
      title: titleInput.trim() || 'Custom Video Stream',
      type: mediaType,
      thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop',
    };

    await addToQueue(roomId, item, user);
    setUrlInput('');
    setTitleInput('');
    setShowAddForm(false);
  };

  const handleAddSample = async (movie: typeof SAMPLE_MOVIES[0]) => {
    const item: MediaItem = {
      url: movie.url,
      title: movie.title,
      type: movie.type,
      thumbnail: movie.thumbnail,
    };
    await addToQueue(roomId, item, user);
  };

  const handlePlayNow = async (item: QueueItem) => {
    await changeMedia(roomId, item, user);
    await removeFromQueue(roomId, item.id);
  };

  const handleRemove = async (itemId: string) => {
    await removeFromQueue(roomId, itemId);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm text-white">Playlist Queue</span>
          <span className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
            {queue.length} items
          </span>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Media</span>
        </button>
      </div>

      {/* Currently Playing Card */}
      {currentMedia && (
        <div className="p-3 bg-zinc-900/40 border-b border-zinc-800/60">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Now Playing
          </span>
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-xl">
            {currentMedia.thumbnail && (
              <img
                src={currentMedia.thumbnail}
                alt={currentMedia.title}
                className="w-14 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{currentMedia.title}</h4>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">{currentMedia.type}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleAddCustom} className="p-3 bg-zinc-900 border-b border-zinc-800/80 space-y-2">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400">Media / Video URL</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="YouTube, MP4 video link or HLS .m3u8..."
              required
              className="w-full mt-1 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400">Title (Optional)</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Inception Movie Night"
              className="w-full mt-1 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
            >
              Add to Queue
            </button>
          </div>
        </form>
      )}

      {/* Queue List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 scrollbar-thin">
        {queue.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
            <p className="text-xs font-medium text-zinc-400">Queue is empty</p>
            <p className="text-[11px] text-zinc-500 mt-1">Add videos or pick from sample movies below!</p>

            {/* Quick Add Samples */}
            <div className="mt-4 pt-3 border-t border-zinc-900 text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Quick Add Sample Movies:
              </span>
              <div className="space-y-1.5">
                {SAMPLE_MOVIES.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAddSample(m)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-xs text-zinc-300 transition-colors group"
                  >
                    <span className="truncate max-w-[180px] font-medium">{m.title}</span>
                    <span className="text-[10px] text-rose-400 font-semibold group-hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 p-2 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 rounded-xl group transition-colors"
            >
              <span className="text-xs font-bold text-zinc-500 w-4 text-center">{index + 1}</span>
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-12 h-8 rounded object-cover bg-zinc-800 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-semibold text-zinc-200 truncate">{item.title}</h5>
                <p className="text-[10px] text-zinc-500">Added by {item.addedBy}</p>
              </div>

              <div className="flex items-center gap-1">
                {isHost && (
                  <button
                    onClick={() => handlePlayNow(item)}
                    title="Play this video now"
                    className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(item.id)}
                  title="Remove from queue"
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
