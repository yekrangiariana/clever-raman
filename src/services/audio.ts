import { createSignal, createRoot } from 'solid-js';
import { api, Song } from './api';

export interface PlaybackState {
  currentTrack: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: Song[];
  queueIndex: number;
  isShuffle: boolean;
}

function createAudioPlayer() {
  const audio = new Audio();
  audio.preload = 'auto';

  const [currentTrack, setCurrentTrack] = createSignal<Song | null>(null);
  const [isPlaying, setIsPlaying] = createSignal<boolean>(false);
  const [currentTime, setCurrentTime] = createSignal<number>(0);
  const [duration, setDuration] = createSignal<number>(0);
  const [queue, setQueue] = createSignal<Song[]>([]);
  const [originalQueue, setOriginalQueue] = createSignal<Song[]>([]);
  const [queueIndex, setQueueIndex] = createSignal<number>(0);
  const [isShuffle, setIsShuffle] = createSignal<boolean>(false);

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
    const q = queue();
    const currIdx = queueIndex();
    if (currIdx + 1 < q.length) {
      nextTrack();
    } else {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
      updateMediaSessionPlaybackState('none');
    }
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
    const newShuffle = !isShuffle();
    setIsShuffle(newShuffle);

    const orig = originalQueue();
    if (orig.length > 0) {
      if (newShuffle) {
        const shuffled = shuffleArray(orig);
        const curr = currentTrack();
        if (curr) {
          // Keep current track first in queue
          const filtered = shuffled.filter(s => s.id !== curr.id);
          const finalQueue = [curr, ...filtered];
          setQueue(finalQueue);
          setQueueIndex(0);
        } else {
          setQueue(shuffled);
        }
      } else {
        setQueue(orig);
        const curr = currentTrack();
        if (curr) {
          const idx = orig.findIndex(s => s.id === curr.id);
          setQueueIndex(idx >= 0 ? idx : 0);
        }
      }
    }
  }

  function playTrack(track: Song, trackQueue?: Song[], index?: number) {
    if (trackQueue && trackQueue.length > 0) {
      setOriginalQueue([...trackQueue]);
      if (isShuffle()) {
        const shuffled = shuffleArray(trackQueue);
        const filtered = shuffled.filter(s => s.id !== track.id);
        const finalQueue = [track, ...filtered];
        setQueue(finalQueue);
        setQueueIndex(0);
      } else {
        setQueue([...trackQueue]);
        setQueueIndex(index ?? trackQueue.findIndex((s) => s.id === track.id));
      }
    } else if (queue().length === 0) {
      setOriginalQueue([track]);
      setQueue([track]);
      setQueueIndex(0);
    }

    setCurrentTrack(track);
    const streamUrl = api.getStreamUrl(track.id);
    audio.src = streamUrl;
    audio.play().catch((err) => {
      console.error('Failed to start audio playback', err);
    });

    updateMediaSessionMetadata(track);
  }

  function play() {
    if (audio.src) {
      audio.play().catch((err) => console.error('Play error', err));
    } else if (queue().length > 0) {
      const idx = queueIndex();
      playTrack(queue()[idx] || queue()[0], queue(), idx);
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
    const q = queue();
    if (q.length === 0) return;
    
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let nextIdx = queueIndex() - 1;
    if (nextIdx < 0) {
      nextIdx = q.length - 1;
    }
    setQueueIndex(nextIdx);
    playTrack(q[nextIdx], q, nextIdx);
  }

  function nextTrack() {
    const q = queue();
    if (q.length === 0) return;
    let nextIdx = queueIndex() + 1;
    if (nextIdx >= q.length) {
      nextIdx = 0;
    }
    setQueueIndex(nextIdx);
    playTrack(q[nextIdx], q, nextIdx);
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

  function addToQueue(tracks: Song | Song[], playNext = false) {
    const list = Array.isArray(tracks) ? tracks : [tracks];
    if (list.length === 0) return;

    const currentQ = queue();
    if (currentQ.length === 0) {
      playTrack(list[0], list, 0);
      return;
    }

    if (playNext) {
      const idx = queueIndex();
      const newQ = [...currentQ.slice(0, idx + 1), ...list, ...currentQ.slice(idx + 1)];
      setQueue(newQ);
      setOriginalQueue(newQ);
    } else {
      const newQ = [...currentQ, ...list];
      setQueue(newQ);
      setOriginalQueue(newQ);
    }
  }

  function removeFromQueue(index: number, silent = false) {
    const currentQ = queue();
    if (index < 0 || index >= currentQ.length) return;
    const newQ = currentQ.filter((_, i) => i !== index);
    setQueue(newQ);
    setOriginalQueue(newQ);
    const currIdx = queueIndex();
    if (index < currIdx) {
      setQueueIndex(currIdx - 1);
    } else if (index === currIdx && newQ.length > 0) {
      const nextIdx = Math.min(currIdx, newQ.length - 1);
      setQueueIndex(nextIdx);
      playTrack(newQ[nextIdx], newQ, nextIdx);
    }
    if (!silent) {
      showToast('Removed from Queue');
    }
  }

  function removeFromQueueBySongId(songId: string) {
    const currentQ = queue();
    const idx = currentQ.findIndex((s) => s.id === songId);
    if (idx !== -1) {
      removeFromQueue(idx, true);
    }
  }

  function removeSongsFromQueue(songIds: Set<string>) {
    const currentQ = queue();
    const newQ = currentQ.filter((s) => !songIds.has(s.id));
    setQueue(newQ);
    setOriginalQueue(newQ);
    const curr = currentTrack();
    if (curr && songIds.has(curr.id) && newQ.length > 0) {
      setQueueIndex(0);
      playTrack(newQ[0], newQ, 0);
    } else if (curr) {
      const newIdx = newQ.findIndex((s) => s.id === curr.id);
      setQueueIndex(newIdx >= 0 ? newIdx : 0);
    }
  }

  function isSongInQueue(songId: string): boolean {
    return queue().some((s) => s.id === songId);
  }

  function clearQueue() {
    const curr = currentTrack();
    if (curr) {
      setQueue([curr]);
      setOriginalQueue([curr]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setOriginalQueue([]);
      setQueueIndex(0);
    }
    showToast('Queue Cleared');
  }

  function jumpToQueueIndex(index: number) {
    const currentQ = queue();
    if (index >= 0 && index < currentQ.length) {
      setQueueIndex(index);
      playTrack(currentQ[index], currentQ, index);
    }
  }

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    queue,
    queueIndex,
    isShuffle,
    toastMessage,
    showToast,
    addToQueue,
    removeFromQueue,
    removeFromQueueBySongId,
    removeSongsFromQueue,
    isSongInQueue,
    clearQueue,
    jumpToQueueIndex,
    toggleShuffle,
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
