'use client';

import React, { useState } from 'react';
import { X, Play, Film, Sparkles, Clock, Star, Popcorn, Plus } from 'lucide-react';
import { SAMPLE_MOVIES, SampleMovie } from '@/lib/sampleMovies';

interface MovieCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: SampleMovie) => void;
}

const CATEGORIES = ['All', 'Full Movie', 'Animation', 'Sci-Fi', 'Trailer', 'Nature / Space'];

export default function MovieCatalogModal({
  isOpen,
  onClose,
  onSelectMovie,
}: MovieCatalogModalProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState<SampleMovie | null>(SAMPLE_MOVIES[0]);

  if (!isOpen) return null;

  const filteredMovies =
    activeCategory === 'All'
      ? SAMPLE_MOVIES
      : SAMPLE_MOVIES.filter((m) => m.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popcorn className="w-6 h-6 text-rose-500" />
            <h2 className="text-lg font-bold text-white">WatchParty Movie Catalog</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Movie Showcase Banner */}
        {selectedMovie && (
          <div className="relative h-56 sm:h-64 w-full bg-zinc-900 overflow-hidden border-b border-zinc-800 shrink-0">
            <img
              src={selectedMovie.backdrop}
              alt={selectedMovie.title}
              className="w-full h-full object-cover opacity-40 filter blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase">
                    {selectedMovie.category}
                  </span>
                  <span className="text-xs font-mono text-zinc-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> {selectedMovie.duration}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                    {selectedMovie.year}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
                  {selectedMovie.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 line-clamp-2">
                  {selectedMovie.description}
                </p>
              </div>

              <button
                onClick={() => {
                  onSelectMovie(selectedMovie);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Watch Party</span>
              </button>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Movie Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 scrollbar-thin">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie)}
              className={`group relative rounded-xl overflow-hidden bg-zinc-900 border transition-all cursor-pointer ${
                selectedMovie?.id === movie.id
                  ? 'border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="aspect-video w-full overflow-hidden bg-zinc-800 relative">
                <img
                  src={movie.thumbnail}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-10 h-10 text-white fill-current filter drop-shadow-md" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold bg-black/80 text-white px-1.5 py-0.5 rounded">
                  {movie.duration}
                </span>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                  <span className="font-semibold text-rose-400">{movie.category}</span>
                  <span>{movie.year}</span>
                </div>
                <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                  {movie.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
