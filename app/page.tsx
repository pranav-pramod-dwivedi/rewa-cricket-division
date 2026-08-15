'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MovieCatalogModal from '@/components/MovieCatalogModal';
import CreateRoomModal from '@/components/CreateRoomModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import { SAMPLE_MOVIES, SampleMovie } from '@/lib/sampleMovies';
import { db, RoomData } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  Popcorn,
  Play,
  Users,
  Film,
  Sparkles,
  Tv,
  Radio,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  MessageSquare,
} from 'lucide-react';

export default function Home() {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<SampleMovie | null>(null);
  const [activeRooms, setActiveRooms] = useState<RoomData[]>([]);

  // Stream live rooms from Firestore
  useEffect(() => {
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(8));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: RoomData[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as RoomData);
      });
      setActiveRooms(list);
    });
    return () => unsub();
  }, []);

  const handleStartMovieRoom = (movie: SampleMovie) => {
    setSelectedMovie(movie);
    setIsCreateOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      <Navbar
        onCreateRoom={() => setIsCreateOpen(true)}
        onJoinRoom={() => setIsJoinOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[200px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Firebase Real-Time Synchronized Watch Parties</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Watch Movies & Videos Together in <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-amber-500 bg-clip-text text-transparent">Real-Time Sync</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mt-4 mb-8 leading-relaxed">
            Create instant watch party rooms for YouTube, MP4 movies, open film projects & HLS streams. Live chat, send flying reactions, and enjoy frame-perfect synced playback.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Host WatchParty</span>
            </button>

            <button
              onClick={() => setIsCatalogOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-sm sm:text-base rounded-2xl transition-all"
            >
              <Film className="w-5 h-5 text-amber-400" />
              <span>Browse Movies</span>
            </button>

            <button
              onClick={() => setIsJoinOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-sm sm:text-base rounded-2xl transition-all"
            >
              <Users className="w-5 h-5 text-blue-400" />
              <span>Join Active Room</span>
            </button>
          </div>
        </div>
      </section>

      {/* Live Active WatchParty Rooms */}
      <section className="py-12 bg-zinc-950 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white">Live WatchParty Rooms</h2>
            </div>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <span>View All Rooms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
              <Popcorn className="w-10 h-10 mx-auto text-rose-500 mb-2 opacity-50" />
              <h3 className="text-base font-bold text-white">No Active Rooms Right Now</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Be the first to host a WatchParty room and invite friends!
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Host a Room Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeRooms.map((room) => (
                <a
                  key={room.id}
                  href={`/room/${room.id}`}
                  className="group bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-rose-500/50 p-4 rounded-2xl transition-all shadow-lg flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">ID: {room.id}</span>
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                      {room.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      Watching: {room.currentMedia?.title || 'Video Stream'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span className="truncate">Host: {room.hostName}</span>
                    <span className="font-semibold text-rose-400 group-hover:underline flex items-center gap-1 shrink-0">
                      Join <Play className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Movie Catalog Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1">
              Curated Library
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Popular Movies & Trailers</h2>
          </div>

          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold rounded-xl text-zinc-200"
          >
            <Film className="w-4 h-4 text-amber-400" />
            <span>Explore Full Catalog</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_MOVIES.slice(0, 6).map((movie) => (
            <div
              key={movie.id}
              className="group bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 rounded-2xl overflow-hidden transition-all shadow-xl flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
                <img
                  src={movie.backdrop || movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-black/70 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded uppercase">
                    {movie.category}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300 bg-black/70 px-2 py-0.5 rounded">
                    {movie.duration}
                  </span>
                </div>

                <button
                  onClick={() => handleStartMovieRoom(movie)}
                  className="absolute bottom-3 right-3 p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transform transition-transform hover:scale-110 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-rose-400 transition-colors">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{movie.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{movie.year}</span>
                  <button
                    onClick={() => handleStartMovieRoom(movie)}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <span>Host WatchParty</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 bg-zinc-900/50 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Why WatchParty?</h2>
            <p className="text-sm text-zinc-400 mt-2">
              Powered by Google Firebase Firestore for real-time latency-minimized video synchronization across all room participants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">Frame-Perfect Playback Sync</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When the host plays, pauses, or seeks, everyone's video player stays perfectly synchronized in real time.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">Live Chat & Floating Reactions</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                React instantly with emojis that float directly over the video stream for shared emotional moments with friends.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white mb-1">Universal Media Support</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Watch YouTube videos, MP4 film streams, HLS live streams, or choose from our built-in open movie library.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-zinc-950 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Popcorn className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-zinc-300">WatchParty Platform</span>
          </div>
          <p>© {new Date().getFullYear()} WatchParty. Powered by Next.js and Firebase Firestore.</p>
        </div>
      </footer>

      {/* Modals */}
      <MovieCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectMovie={(movie) => handleStartMovieRoom(movie)}
      />
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialSelectedMovie={selectedMovie}
        onCreated={(roomId) => (window.location.href = `/room/${roomId}`)}
      />
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={(roomId) => (window.location.href = `/room/${roomId}`)}
      />
    </div>
  );
}
