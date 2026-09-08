import { createSignal, createRoot, createMemo } from 'solid-js';
import { api, Song } from './api';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlaybackState {
  currentTrack: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  contextQueue: Song[];
  contextIndex: number;
  userQueue: Song[];
  isShuffle: boolean;
  repeatMode: RepeatMode;
}

function createAudioPlayer() {
  const audio = new Audio();
  audio.preload = 'auto';

  const [currentTrack, setCurrentTrack] = createSignal<Song | null>(null);
  const [isPlaying, setIsPlaying] = createSignal<boolean>(false);
  const [currentTime, setCurrentTime] = createSignal<number>(0);
  const [duration, setDuration] = createSignal<number>(0);

  // Layer 1: Context Queue (Album or Playlist)
  const [contextQueue, setContextQueue] = createSignal<Song[]>([]);
  const [originalContextQueue, setOriginalContextQueue] = createSignal<Song[]>([]);
  const [contextIndex, setContextIndex] = createSignal<number>(0);

  // Layer 2: User Queue (Explicitly queued songs by user)
  const [userQueue, setUserQueue] = createSignal<Song[]>([]);

  // Playback modes
  const [isShuffle, setIsShuffle] = createSignal<boolean>(false);
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('off');

  // Unified derived upcoming count: manual songs + upcoming songs in context
  const upcomingCount = createMemo(() => {
    const uqLen = userQueue().length;
    const cqLen = contextQueue().length;
    const cIdx = contextIndex();
    const remainingContext = Math.max(0, cqLen - 1 - cIdx);
    return uqLen + remainingContext;
  });

  // Flat queue representation for components that need a combined view
  const queue = createMemo(() => {
    const curr = currentTrack();
    const uq = userQueue();
    const cq = contextQueue();
    const cIdx = contextIndex();
    const upcomingContext = cIdx < cq.length - 1 ? cq.slice(cIdx + 1) : [];
    return [
      ...(curr ? [curr] : []),
      ...uq,
      ...upcomingContext,
    ];
  });

  const queueIndex = createMemo(() => 0); // Current track is always first in active derived queue

  audio.addEventListener('timeupdate', () => {
    setCurrentTime(audio.currentTime || 0);
  });

  audio.addEventListener('durationchange', () => {
    setDuration(audio.duration || 0);
  });

  audio.addEventListener('play', () => {
    setIsPlaying(true);
    updateMediaSessionPlaybackState('playing');
  });

  audio.addEventListener('pause', () => {
    setIsPlaying(false);
    updateMediaSessionPlaybackState('paused');
  });

  audio.addEventListener('ended', () => {
    playNextInHierarchy(false);
  });

  audio.addEventListener('error', (e) => {
    console.error('Audio playback error', e);
    setIsPlaying(false);
  });

  function updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  function updateMediaSessionMetadata(track: Song) {
    if ('mediaSession' in navigator) {
      const coverUrl = api.getCoverArtUrl(track.coverArt || track.id, 800);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || '',
        artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/png' }] : [],
      });

      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            seek(details.seekTime);
          }
        });
      } catch (e) {
        // seekto fallback
      }
    }
  }

  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function toggleShuffle() {
    const nextShuffle = !isShuffle();
    setIsShuffle(nextShuffle);

    const orig = originalContextQueue();
    if (orig.length > 0) {
      if (nextShuffle) {
        const curr = currentTrack();
        const remaining = orig.filter((s) => s.id !== curr?.id);
        const shuffled = shuffleArray(remaining);
        const newQueue = curr ? [curr, ...shuffled] : shuffled;
        setContextQueue(newQueue);
        setContextIndex(0);
      } else {
        setContextQueue(orig);
        const curr = currentTrack();
        if (curr) {
          const idx = orig.findIndex((s) => s.id === curr.id);
          setContextIndex(idx >= 0 ? idx : 0);
        }
      }
    }
    showToast(nextShuffle ? 'Shuffle On' : 'Shuffle Off');
  }

  function toggleRepeatMode() {
    const current = repeatMode();
    let next: RepeatMode = 'off';
    let label = 'Repeat Off';
    if (current === 'off') {
      next = 'all';
      label = 'Repeat All';
    } else if (current === 'all') {
      next = 'one';
      label = 'Repeat One';
    } else {
      next = 'off';
      label = 'Repeat Off';
    }
    setRepeatMode(next);
    showToast(label);
  }

  function startPlaybackStream(track: Song) {
    setCurrentTrack(track);
    const streamUrl = api.getStreamUrl(track.id);
    audio.src = streamUrl;
    audio.play().catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('Failed to start audio playback', err);
      }
    });
    updateMediaSessionMetadata(track);
  }

  /**
   * Starts playback of a track with collection context.
   * If `collection` is supplied, sets the active Context Queue.
   * Clears user queue for fresh album playback.
   */
  function playTrack(track: Song, collection?: Song[], index?: number) {
    if (collection && collection.length > 0) {
      setOriginalContextQueue([...collection]);
      if (isShuffle()) {
        const remaining = collection.filter((s) => s.id !== track.id);
        const shuffled = [track, ...shuffleArray(remaining)];
        setContextQueue(shuffled);
        setContextIndex(0);
      } else {
        setContextQueue([...collection]);
        const targetIdx = index ?? collection.findIndex((s) => s.id === track.id);
        setContextIndex(targetIdx >= 0 ? targetIdx : 0);
      }
    } else {
      setOriginalContextQueue([track]);
      setContextQueue([track]);
      setContextIndex(0);
    }

    // Starting a new track/album sets a clean user queue
    setUserQueue([]);

    startPlaybackStream(track);
  }

  /**
   * Priority Resolution:
   * 1. Repeat One -> replay current track
   * 2. User Queue -> pop & play top track from userQueue (contextIndex preserved)
   * 3. Context Queue -> advance contextIndex and play next album track
   * 4. End of Context -> Repeat All loops to track 1; Repeat Off stops cleanly
   */
  function playNextInHierarchy(userInitiated = false) {
    if (!userInitiated && repeatMode() === 'one') {
      seek(0);
      play();
      return;
    }

    // 1. Check User Queue (Explicit Priority)
    const uq = userQueue();
    if (uq.length > 0) {
      const nextSong = uq[0];
      setUserQueue(uq.slice(1));
      startPlaybackStream(nextSong);
      return;
    }

    // 2. Check Context Queue (Passive Album/Playlist Flow)
    const cq = contextQueue();
    const nextCtxIdx = contextIndex() + 1;
    if (nextCtxIdx < cq.length) {
      setContextIndex(nextCtxIdx);
      startPlaybackStream(cq[nextCtxIdx]);
      return;
    }

    // 3. Reached end of Context
    if (repeatMode() === 'all' && cq.length > 0) {
      setContextIndex(0);
      startPlaybackStream(cq[0]);
    } else {
      // Natural stop — no infinite loop!
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
      updateMediaSessionPlaybackState('none');
    }
  }

  function play() {
    if (audio.src) {
      audio.play().catch((err) => console.error('Play error', err));
    } else if (contextQueue().length > 0) {
      const idx = contextIndex();
      startPlaybackStream(contextQueue()[idx] || contextQueue()[0]);
    }
  }

  function pause() {
    audio.pause();
  }

  function togglePlay() {
    if (isPlaying()) {
      pause();
    } else {
      play();
    }
  }

  function previousTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const cq = contextQueue();
    if (cq.length === 0) return;

    let prevIdx = contextIndex() - 1;
    if (prevIdx < 0) {
      if (repeatMode() === 'all') {
        prevIdx = cq.length - 1;
      } else {
        prevIdx = 0;
      }
    }
    setContextIndex(prevIdx);
    startPlaybackStream(cq[prevIdx]);
  }

  function nextTrack() {
    playNextInHierarchy(true);
  }

  function seek(seconds: number) {
    if (audio.duration) {
      const clamped = Math.max(0, Math.min(seconds, audio.duration));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    }
  }

  function formatRemainingTime(): string {
    const dur = duration();
    const cur = currentTime();
    if (!dur || isNaN(dur)) return '-00:00';
    const rem = Math.max(0, dur - cur);
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    return `-${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function formatElapsedTime(): string {
    const cur = currentTime();
    if (!cur || isNaN(cur)) return '00:00';
    const m = Math.floor(cur / 60);
    const s = Math.floor(cur % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const [toastMessage, setToastMessage] = createSignal<string | null>(null);
  let toastTimer: any = null;

  function showToast(msg: string) {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(msg);
    toastTimer = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }

  // --- USER QUEUE MANAGEMENT ---
  const [explicitSingleQueueIds, setExplicitSingleQueueIds] = createSignal<Set<string>>(new Set());

  function addToUserQueue(tracks: Song | Song[], playNext = false, isSingle = false) {
    const list = Array.isArray(tracks) ? tracks : [tracks];
    if (list.length === 0) return;

    if (!currentTrack()) {
      playTrack(list[0], list, 0);
      return;
    }

    if (isSingle) {
      const nextSet = new Set(explicitSingleQueueIds());
      list.forEach((s) => nextSet.add(s.id));
      setExplicitSingleQueueIds(nextSet);
    }

    if (playNext) {
      setUserQueue([...list, ...userQueue()]);
    } else {
      setUserQueue([...userQueue(), ...list]);
    }
  }

  function removeFromUserQueue(songId: string) {
    setUserQueue(userQueue().filter((s) => s.id !== songId));
    if (explicitSingleQueueIds().has(songId)) {
      const nextSet = new Set(explicitSingleQueueIds());
      nextSet.delete(songId);
      setExplicitSingleQueueIds(nextSet);
    }
  }

  function removeFromUserQueueByIndex(index: number) {
    const uq = userQueue();
    if (index >= 0 && index < uq.length) {
      const s = uq[index];
      removeFromUserQueue(s.id);
    }
  }

  function isSongInUserQueue(songId: string): boolean {
    return userQueue().some((s) => s.id === songId);
  }

  function isExplicitUserQueued(songId: string): boolean {
    return explicitSingleQueueIds().has(songId);
  }

  /**
   * Clear ONLY the manual User Queue, keeping the active album/context completely intact.
   */
  function clearUserQueue() {
    setUserQueue([]);
    setExplicitSingleQueueIds(new Set());
    showToast('Queue Cleared');
  }

  function jumpToUserQueueIndex(index: number) {
    const uq = userQueue();
    if (index >= 0 && index < uq.length) {
      const song = uq[index];
      removeFromUserQueueByIndex(index);
      startPlaybackStream(song);
    }
  }

  function jumpToContextIndex(index: number) {
    const cq = contextQueue();
    if (index >= 0 && index < cq.length) {
      setContextIndex(index);
      startPlaybackStream(cq[index]);
    }
  }

  // Backwards compatibility aliases
  function addToQueue(tracks: Song | Song[], playNext = false) {
    addToUserQueue(tracks, playNext, !Array.isArray(tracks));
  }

  function removeFromQueue(index: number, _silent = false) {
    removeFromUserQueueByIndex(index);
  }

  function removeFromQueueBySongId(songId: string) {
    removeFromUserQueue(songId);
  }

  function removeSongsFromQueue(songIds: Set<string>) {
    setUserQueue(userQueue().filter((s) => !songIds.has(s.id)));
    const nextSet = new Set(explicitSingleQueueIds());
    songIds.forEach((id) => nextSet.delete(id));
    setExplicitSingleQueueIds(nextSet);
  }

  function isSongInQueue(songId: string): boolean {
    return isSongInUserQueue(songId);
  }

  function clearQueue() {
    clearUserQueue();
  }

  function jumpToQueueIndex(index: number) {
    // If index is within userQueue
    const uq = userQueue();
    if (index < uq.length) {
      jumpToUserQueueIndex(index);
    } else {
      // index is within contextQueue (offset by contextIndex + 1)
      const contextOffset = index - uq.length;
      const targetCtxIdx = contextIndex() + 1 + contextOffset;
      jumpToContextIndex(targetCtxIdx);
    }
  }

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    contextQueue,
    contextIndex,
    userQueue,
    isShuffle,
    repeatMode,
    upcomingCount,
    queue,
    queueIndex,
    toastMessage,
    showToast,
    addToQueue,
    addToUserQueue,
    removeFromQueue,
    removeFromUserQueue,
    removeFromUserQueueByIndex,
    removeFromQueueBySongId,
    removeSongsFromQueue,
    isSongInQueue,
    isSongInUserQueue,
    isExplicitUserQueued,
    clearQueue,
    clearUserQueue,
    jumpToQueueIndex,
    jumpToUserQueueIndex,
    jumpToContextIndex,
    toggleShuffle,
    toggleRepeatMode,
    playTrack,
    play,
    pause,
    togglePlay,
    previousTrack,
    nextTrack,
    seek,
    formatRemainingTime,
    formatElapsedTime,
  };
}

export const audioPlayer = createRoot(createAudioPlayer);
