'use client';

import React, { useState, useEffect, use } from 'react';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import ChatPanel from '@/components/ChatPanel';
import QueuePanel from '@/components/QueuePanel';
import ParticipantList from '@/components/ParticipantList';
import MovieCatalogModal from '@/components/MovieCatalogModal';
import CreateRoomModal from '@/components/CreateRoomModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import {
  auth,
  ensureAuthUser,
  subscribeRoom,
  subscribeMessages,
  subscribeParticipants,
  subscribeQueue,
  updatePresence,
  changeMedia,
  RoomData,
  ChatMessage,
  Participant,
  QueueItem,
  MediaItem,
} from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  MessageSquare,
  ListVideo,
  Users,
  Film,
  Crown,
  Share2,
  Copy,
  Check,
  Radio,
  Plus,
  Popcorn,
  Sparkles,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { SampleMovie } from '@/lib/sampleMovies';

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'members'>('chat');
  const [latestReactions, setLatestReactions] = useState<{ id: string; text: string; timestamp: number }[]>([]);

  // Modals
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  // Authenticate & subscribe
  useEffect(() => {
    let unsubAuth: () => void;
    let unsubRoom: () => void;
    let unsubMsg: () => void;
    let unsubParts: () => void;
    let unsubQ: () => void;

    async function init() {
      const authUser = await ensureAuthUser();
      setUser(authUser);

      // Subscribe to room doc
      unsubRoom = subscribeRoom(roomId, (roomData) => {
        setRoom(roomData);
        setLoading(false);
      });

      // Subscribe to messages
      unsubMsg = subscribeMessages(roomId, (msgs) => {
        setMessages(msgs);
        // Extract recent reactions for floating emoji layer
        const reactions = msgs
          .filter((m) => m.type === 'reaction')
          .map((m) => ({ id: m.id, text: m.text.replace('reacted with ', ''), timestamp: m.timestamp }));
        setLatestReactions(reactions);
      });

      // Subscribe to participants
      unsubParts = subscribeParticipants(roomId, (parts) => {
        setParticipants(parts);
      });

      // Subscribe to queue
      unsubQ = subscribeQueue(roomId, (qList) => {
        setQueue(qList);
      });

      // Presence heartbeat
      const isHostUser = room ? room.hostId === authUser.uid : false;
      await updatePresence(
        roomId,
        { uid: authUser.uid, displayName: authUser.displayName || 'Guest' },
        isHostUser ? 'host' : 'viewer'
      );

      const presenceInterval = setInterval(() => {
        updatePresence(
          roomId,
          { uid: authUser.uid, displayName: authUser.displayName || 'Guest' },
          isHostUser ? 'host' : 'viewer'
        );
      }, 15000);

      return () => {
        clearInterval(presenceInterval);
      };
    }

    init();

    return () => {
      if (unsubRoom) unsubRoom();
      if (unsubMsg) unsubMsg();
      if (unsubParts) unsubParts();
      if (unsubQ) unsubQ();
    };
  }, [roomId]);

  const isHost = room && user ? room.hostId === user.uid : false;

  const handleSelectCatalogMovie = async (movie: SampleMovie) => {
    if (!user || !room) return;
    const media: MediaItem = {
      url: movie.url,
      title: movie.title,
      type: movie.type,
      thumbnail: movie.thumbnail,
    };
    await changeMedia(roomId, media, { uid: user.uid, displayName: user.displayName || 'Viewer' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center animate-spin mb-4 shadow-xl shadow-rose-500/20">
          <Popcorn className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">Connecting to WatchParty...</h3>
        <p className="text-xs text-zinc-500 mt-1">Synchronizing room state and video stream</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar
          onCreateRoom={() => setIsCreateOpen(true)}
          onJoinRoom={() => setIsJoinOpen(true)}
          onOpenCatalog={() => setIsCatalogOpen(true)}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 mb-4 shadow-xl">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Room Not Found</h2>
          <p className="text-sm text-zinc-400 max-w-md mt-2 mb-6">
            Room <code className="text-rose-400 font-mono bg-zinc-900 px-2 py-0.5 rounded">{roomId}</code> does not exist or has expired.
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-white transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-600/30 transition-colors"
            >
              Host a WatchParty
            </button>
          </div>
        </div>

        <CreateRoomModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newRoomId) => (window.location.href = `/room/${newRoomId}`)}
        />
        <JoinRoomModal
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onJoin={(targetRoomId) => (window.location.href = `/room/${targetRoomId}`)}
        />
        <MovieCatalogModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectMovie={handleSelectCatalogMovie}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar
        onCreateRoom={() => setIsCreateOpen(true)}
        onJoinRoom={() => setIsJoinOpen(true)}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {/* Main WatchParty Room View */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4">
        {/* Left Column: Video Player & Room Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Breadcrumb / Room Title Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 px-4 py-3 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white truncate">
                    {room.name}
                  </h1>
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">
                  Hosted by <span className="text-zinc-200 font-medium">{room.hostName}</span> · ID:{' '}
                  <code className="text-rose-400 font-mono">{room.id}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCatalogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Change Video</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Invite'}</span>
              </button>
            </div>
          </div>

          {/* Synchronized Real-Time Video Player */}
          <VideoPlayer
            media={room.currentMedia}
            playback={room.playback}
            roomId={roomId}
            isHost={Boolean(isHost)}
            userId={user?.uid || 'anon'}
            userName={user?.displayName || 'Guest'}
            reactions={latestReactions}
          />

          {/* Movie Details Footer Banner */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {room.currentMedia?.thumbnail && (
                <img
                  src={room.currentMedia.thumbnail}
                  alt={room.currentMedia.title}
                  className="w-16 h-11 rounded-xl object-cover bg-zinc-800 border border-zinc-700/60 shrink-0"
                />
              )}
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase font-bold tracking-wider">
                  Currently Streaming
                </span>
                <h3 className="text-sm font-bold text-white line-clamp-1">
                  {room.currentMedia?.title || 'WatchParty Video'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-white">{participants.length} Watching</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <ListVideo className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-white">{queue.length} Queued</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Chat / Queue / Members Sidebar */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col h-[580px] lg:h-auto shrink-0">
          {/* Sidebar Tabs Header */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-3">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'chat'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'queue'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" />
              <span>Queue ({queue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'members'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members ({participants.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' && (
              <ChatPanel
                roomId={roomId}
                userId={user?.uid || 'anon'}
                userName={user?.displayName || 'Guest'}
                messages={messages}
              />
            )}

            {activeTab === 'queue' && (
              <QueuePanel
                roomId={roomId}
                isHost={Boolean(isHost)}
                user={{ uid: user?.uid || 'anon', displayName: user?.displayName || 'Guest' }}
                queue={queue}
                currentMedia={room.currentMedia}
              />
            )}

            {activeTab === 'members' && (
              <ParticipantList
                participants={participants}
                hostId={room.hostId}
                currentUserId={user?.uid || 'anon'}
              />
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <MovieCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectMovie={handleSelectCatalogMovie}
      />
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newRoomId) => (window.location.href = `/room/${newRoomId}`)}
      />
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={(targetRoomId) => (window.location.href = `/room/${targetRoomId}`)}
      />
    </div>
  );
}
