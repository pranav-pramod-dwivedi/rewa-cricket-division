'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Crown,
  Settings,
  Sparkles,
  Zap,
  Lock,
  Radio,
  Sliders,
} from 'lucide-react';
import { MediaItem, PlaybackState, updatePlayback } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percentage horizontal
}

interface VideoPlayerProps {
  media: MediaItem;
  playback: PlaybackState;
  roomId: string;
  isHost: boolean;
  userId: string;
  userName: string;
  reactions?: { id: string; text: string; timestamp: number }[];
  onPlaybackChange?: (currentTime: number, isPlaying: boolean) => void;
}

export default function VideoPlayer({
  media,
  playback,
  roomId,
  isHost,
  userId,
  userName,
  reactions = [],
  onPlaybackChange,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(playback?.isPlaying ?? false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playedSeconds, setPlayedSeconds] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isOutOfSync, setIsOutOfSync] = useState<boolean>(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(playback?.speed || 1.0);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Trigger floating emoji when a reaction arrives
  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[reactions.length - 1];
      if (Date.now() - latest.timestamp < 3000) {
        const newEmoji: FloatingEmoji = {
          id: latest.id || `${Date.now()}_${Math.random()}`,
          emoji: latest.text,
          x: Math.floor(15 + Math.random() * 70), // 15% to 85% width
        };
        setFloatingEmojis((prev) => [...prev.slice(-15), newEmoji]);

        // Remove emoji after 2.5s
        setTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
        }, 2500);
      }
    }
  }, [reactions]);

  // Sync state from Firestore
  useEffect(() => {
    if (!playback) return;

    // Calculate expected playback time based on latency
    let expectedTime = playback.currentTime;
    if (playback.isPlaying && playback.updatedAt) {
      const elapsed = (Date.now() - playback.updatedAt) / 1000;
      expectedTime += elapsed * (playback.speed || 1.0);
    }

    // Check if local time differs significantly (> 2 seconds)
    const currentLocal = playedSeconds;
    const diff = Math.abs(currentLocal - expectedTime);

    if (diff > 2 && !isSeeking && !isHost) {
      setIsOutOfSync(true);
      // Auto-sync non-host if they haven't manually seeked recently
      if (playerRef.current && hasUserInteracted) {
        playerRef.current.seekTo(expectedTime, 'seconds');
        setIsOutOfSync(false);
      }
    } else {
      setIsOutOfSync(false);
    }

    setIsPlaying(playback.isPlaying);
    if (playback.speed && playback.speed !== playbackSpeed) {
      setPlaybackSpeed(playback.speed);
    }
  }, [playback, isHost, isSeeking, hasUserInteracted]);

  // Handle Play/Pause toggle
  const togglePlay = async () => {
    setHasUserInteracted(true);
    const newPlaying = !isPlaying;
    setIsPlaying(newPlaying);

    if (isHost) {
      const current = playerRef.current ? playerRef.current.getCurrentTime() : playedSeconds;
      await updatePlayback(roomId, {
        isPlaying: newPlaying,
        currentTime: current,
        updatedAt: Date.now(),
        updatedBy: userId,
        speed: playbackSpeed,
      });
    }
  };

  // Handle Seeking
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasUserInteracted(true);
    const target = parseFloat(e.target.value);
    setPlayedSeconds(target);
  };

  const handleSeekMouseUp = async (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const target = parseFloat((e.target as HTMLInputElement).value);
    if (playerRef.current) {
      playerRef.current.seekTo(target, 'seconds');
    }

    if (isHost) {
      await updatePlayback(roomId, {
        isPlaying,
        currentTime: target,
        updatedAt: Date.now(),
        updatedBy: userId,
        speed: playbackSpeed,
      });
    }
  };

  const handleManualSync = () => {
    setHasUserInteracted(true);
    if (!playback) return;
    let expectedTime = playback.currentTime;
    if (playback.isPlaying && playback.updatedAt) {
      const elapsed = (Date.now() - playback.updatedAt) / 1000;
      expectedTime += elapsed * (playback.speed || 1.0);
    }
    if (playerRef.current) {
      playerRef.current.seekTo(expectedTime, 'seconds');
    }
    setIsPlaying(playback.isPlaying);
    setIsOutOfSync(false);
  };

  // Speed change
  const handleSpeedChange = async (speed: number) => {
    setPlaybackSpeed(speed);
    if (isHost) {
      const current = playerRef.current ? playerRef.current.getCurrentTime() : playedSeconds;
      await updatePlayback(roomId, {
        isPlaying,
        currentTime: current,
        updatedAt: Date.now(),
        updatedBy: userId,
        speed,
      });
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Mouse move timeout for controls fade out
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={() => setHasUserInteracted(true)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 group select-none"
    >
      {/* Floating Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingEmojis.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], y: -250, scale: [0.8, 1.4, 1.2, 0.8] }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            style={{ left: `${item.x}%` }}
            className="absolute bottom-16 text-4xl filter drop-shadow-lg"
          >
            {item.emoji}
          </motion.div>
        ))}
      </div>

      {/* Sync Status Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-xs font-medium text-zinc-300">
          <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <span>{isPlaying ? 'LIVE SYNC' : 'PAUSED'}</span>
        </div>

        {isHost && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
            <span>Host Controller</span>
          </div>
        )}

        {isOutOfSync && (
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-transform active:scale-95 animate-bounce"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Out of Sync! Click to Resync</span>
          </button>
        )}
      </div>

      {/* Initial Play Overlay for Autoplay restrictions */}
      {!hasUserInteracted && !isHost && (
        <div
          onClick={handleManualSync}
          className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer text-center p-6"
        >
          <div className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-rose-600/40 animate-pulse">
            <Play className="w-8 h-8 ml-1" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Click to Join Watch Party</h3>
          <p className="text-sm text-zinc-400 max-w-sm">
            Browser autoplay requires user interaction to start synchronized playback and audio.
          </p>
        </div>
      )}

      {/* Media Player Component */}
      <div className="w-full h-full">
        <ReactPlayer
          ref={playerRef}
          url={media?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
          playing={isPlaying && hasUserInteracted}
          volume={volume}
          muted={isMuted}
          playbackRate={playbackSpeed}
          width="100%"
          height="100%"
          controls={false}
          onProgress={(state: any) => {
            if (!isSeeking) {
              setPlayedSeconds(state.playedSeconds);
              if (onPlaybackChange) {
                onPlaybackChange(state.playedSeconds, isPlaying);
              }
            }
          }}
          onDuration={(d: any) => setDuration(Number(d))}
          onError={(err) => console.error('Video player error:', err)}
          config={
            {
              youtube: {
                playerVars: { showinfo: 0, rel: 0, autoplay: 1 },
              },
              file: {
                attributes: {
                  crossOrigin: 'anonymous',
                },
              },
            } as any
          }
        />
      </div>

      {/* Player Custom Controls Overlay */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 flex flex-col justify-between p-4 sm:p-6 z-20 pointer-events-auto"
          >
            {/* Top Bar: Title & Media Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-xl">
                <span className="text-[11px] font-bold tracking-wider text-rose-400 uppercase bg-rose-950/80 border border-rose-800/50 px-2 py-0.5 rounded">
                  {media?.type || 'VIDEO'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1 line-clamp-1 drop-shadow-md">
                  {media?.title || 'WatchParty Video Stream'}
                </h2>
              </div>
            </div>

            {/* Center Big Play/Pause Button */}
            <div className="self-center flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 transform transition-all hover:scale-110 active:scale-95 backdrop-blur-md"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
            </div>

            {/* Bottom Controls Bar */}
            <div className="space-y-3">
              {/* Seek Bar / Scrubber */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-300 w-12 text-right">
                  {formatTime(playedSeconds)}
                </span>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={playedSeconds}
                    onMouseDown={() => setIsSeeking(true)}
                    onTouchStart={() => setIsSeeking(true)}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekMouseUp}
                    onTouchEnd={handleSeekMouseUp}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-2 transition-all"
                  />
                </div>
                <span className="text-xs font-mono text-zinc-400 w-12">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-zinc-300">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-2 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 group/vol">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-16 sm:w-20 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 opacity-80 group-hover/vol:opacity-100 transition-opacity"
                    />
                  </div>

                  {/* Resync Button */}
                  <button
                    onClick={handleManualSync}
                    title="Resync video with host"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sync</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Speed Selector */}
                  <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 text-xs">
                    {[1.0, 1.25, 1.5, 2.0].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          playbackSpeed === s
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
