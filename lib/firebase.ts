import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseConfigJson.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigJson.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigJson.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigJson.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigJson.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(
  app,
  firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
    ? firebaseConfigJson.firestoreDatabaseId
    : undefined
);

export interface MediaItem {
  url: string;
  title: string;
  type: 'youtube' | 'video' | 'hls' | 'embed';
  duration?: number;
  thumbnail?: string;
  addedBy?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number; // Date.now() timestamp
  updatedBy: string;
  speed: number;
}

export interface RoomData {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  hostName: string;
  currentMedia: MediaItem;
  playback: PlaybackState;
  isLocked: boolean;
  isPermanent?: boolean;
  passcode?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  type: 'chat' | 'system' | 'reaction' | 'media_change';
  timestamp: number;
}

export interface Participant {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'host' | 'viewer';
  isOnline: boolean;
  lastActive: number;
  currentTime?: number;
  isBuffering?: boolean;
}

export interface QueueItem extends MediaItem {
  id: string;
  addedAt: number;
}

// Auto sign-in or retrieve user
export async function ensureAuthUser(displayName?: string): Promise<User> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (displayName && user.displayName !== displayName) {
          try {
            await updateProfile(user, { displayName });
          } catch (e) {
            console.error('Failed updating profile:', e);
          }
        }
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          const name = displayName || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
          await updateProfile(cred.user, { displayName: name });
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.error('Anonymous auth failed:', err);
          unsubscribe();
          // Fallback dummy user if auth fails offline
          resolve({
            uid: `anon_${Date.now()}`,
            displayName: displayName || 'Guest Viewer',
            isAnonymous: true,
          } as User);
        }
      }
    });
  });
}

// Room functions
export async function createRoom(
  name: string,
  hostUser: { uid: string; displayName: string },
  initialMedia?: MediaItem,
  customRoomId?: string
): Promise<string> {
  const roomId = customRoomId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 7);
  
  const defaultMedia: MediaItem = initialMedia || {
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', // Big Buck Bunny 4K Trailer
    title: 'Big Buck Bunny (Official 4K Trailer)',
    type: 'youtube',
    duration: 60,
    thumbnail: 'https://img.youtube.com/vi/aqz-KE-bpKQ/maxresdefault.jpg',
  };

  const roomDocRef = doc(db, 'rooms', roomId);
  const roomData: RoomData = {
    id: roomId,
    name: name || 'Movie Night Room',
    hostId: hostUser.uid,
    hostName: hostUser.displayName || 'Host',
    currentMedia: defaultMedia,
    playback: {
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: hostUser.uid,
      speed: 1.0,
    },
    isLocked: false,
    createdAt: Date.now(),
  };

  await setDoc(roomDocRef, roomData);

  // Add initial system message
  const msgRef = collection(db, 'rooms', roomId, 'messages');
  await addDoc(msgRef, {
    userId: 'system',
    userName: 'WatchParty Bot',
    text: `Room "${name}" was created! Welcome to the WatchParty.`,
    type: 'system',
    timestamp: Date.now(),
  });

  return roomId;
}

export function subscribeRoom(roomId: string, onData: (data: RoomData | null) => void) {
  const docRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as RoomData);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.error('Room snapshot error:', err);
    }
  );
}

export async function updatePlayback(roomId: string, playback: PlaybackState) {
  const docRef = doc(db, 'rooms', roomId);
  await updateDoc(docRef, {
    playback: {
      ...playback,
      updatedAt: Date.now(),
    },
  });
}

export async function changeMedia(roomId: string, media: MediaItem, user: { uid: string; displayName: string }) {
  const docRef = doc(db, 'rooms', roomId);
  await updateDoc(docRef, {
    currentMedia: media,
    playback: {
      isPlaying: true,
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: user.uid,
      speed: 1.0,
    },
  });

  // Post system message
  const msgRef = collection(db, 'rooms', roomId, 'messages');
  await addDoc(msgRef, {
    userId: 'system',
    userName: 'WatchParty Bot',
    text: `${user.displayName || 'Someone'} changed video to: "${media.title || media.url}"`,
    type: 'media_change',
    timestamp: Date.now(),
  });
}

export function subscribeMessages(roomId: string, onData: (messages: ChatMessage[]) => void) {
  const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'), limit(150));
  return onSnapshot(q, (snapshot) => {
    const list: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        userId: d.userId,
        userName: d.userName,
        userAvatar: d.userAvatar,
        text: d.text,
        type: d.type || 'chat',
        timestamp: d.timestamp,
      });
    });
    onData(list);
  });
}

export async function sendChatMessage(roomId: string, user: { uid: string; displayName: string; avatar?: string }, text: string, type: 'chat' | 'reaction' = 'chat') {
  const msgRef = collection(db, 'rooms', roomId, 'messages');
  await addDoc(msgRef, {
    userId: user.uid,
    userName: user.displayName || 'User',
    userAvatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    text: text.trim(),
    type,
    timestamp: Date.now(),
  });
}

export function subscribeParticipants(roomId: string, onData: (participants: Participant[]) => void) {
  const collRef = collection(db, 'rooms', roomId, 'participants');
  return onSnapshot(collRef, (snapshot) => {
    const list: Participant[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Participant);
    });
    onData(list);
  });
}

export async function updatePresence(roomId: string, user: { uid: string; displayName: string }, role: 'host' | 'viewer', currentTime: number = 0, isBuffering: boolean = false) {
  const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
  const data: Participant = {
    userId: user.uid,
    userName: user.displayName || 'Guest',
    userAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    role,
    isOnline: true,
    lastActive: Date.now(),
    currentTime,
    isBuffering,
  };
  await setDoc(participantRef, data, { merge: true });
}

export function subscribeQueue(roomId: string, onData: (queue: QueueItem[]) => void) {
  const q = query(collection(db, 'rooms', roomId, 'queue'), orderBy('addedAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list: QueueItem[] = [];
    snapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data(),
      } as QueueItem);
    });
    onData(list);
  });
}

export async function addToQueue(roomId: string, item: MediaItem, user: { displayName: string }) {
  const queueRef = collection(db, 'rooms', roomId, 'queue');
  await addDoc(queueRef, {
    ...item,
    addedBy: user.displayName || 'Viewer',
    addedAt: Date.now(),
  });
}

export async function removeFromQueue(roomId: string, itemId: string) {
  const itemRef = doc(db, 'rooms', roomId, 'queue', itemId);
  await deleteDoc(itemRef);
}
