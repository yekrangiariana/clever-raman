import { createSignal, createRoot, createMemo } from 'solid-js';
import { api, Song } from './api';
import { MediaSession } from '@capgo/capacitor-media-session';

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

  const preloadAudio = new Audio();
  preloadAudio.preload = 'auto';
  let preloadedTrackId: string | null = null;

  const [currentTrack, setCurrentTrack] = createSignal<Song | null>(null);
  const [isPlaying, setIsPlaying] = createSignal<boolean>(false);
  const [isBuffering, setIsBuffering] = createSignal<boolean>(false);
  const [currentTime, setCurrentTime] = createSignal<number>(0);
  const [duration, setDuration] = createSignal<number>(0);
  const [isSeeking, setIsSeeking] = createSignal<boolean>(false);
  const [seekPreviewTime, setSeekPreviewTime] = createSignal<number | null>(null);
  const [seekOffsetBadge, setSeekOffsetBadge] = createSignal<string | null>(null);

  // Layer 1: Context Queue (Album or Playlist)
  const [contextQueue, setContextQueue] = createSignal<Song[]>([]);
  const [originalContextQueue, setOriginalContextQueue] = createSignal<Song[]>([]);
  const [contextIndex, setContextIndex] = createSignal<number>(0);

  // Layer 2a: User Queue Next (plays before context queue resumes)
  const [userQueueNext, setUserQueueNext] = createSignal<Song[]>([]);
  // Layer 2b: User Queue Last (plays after context queue finishes)
  const [userQueueLast, setUserQueueLast] = createSignal<Song[]>([]);

  // Layer 3: Played History (Tracks that finished playing during current session)
  const [playedHistory, setPlayedHistory] = createSignal<Song[]>([]);

  function recordHistory(song: Song) {
    setPlayedHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].id === song.id) return prev;
      const updated = [...prev, song];
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
    });
  }

  // Playback modes
  const [isShuffle, setIsShuffle] = createSignal<boolean>(false);
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>('off');

  // Unified derived upcoming count: manual songs + upcoming songs in context
  const upcomingCount = createMemo(() => {
    const uqLen = userQueueNext().length + userQueueLast().length;
    const cqLen = contextQueue().length;
    const cIdx = contextIndex();
    const remainingContext = Math.max(0, cqLen - 1 - cIdx);
    return uqLen + remainingContext;
  });

  // Flat queue: [current, ...playNext, ...upcomingContext, ...playLast]
  const queue = createMemo(() => {
    const curr = currentTrack();
    const uqNext = userQueueNext();
    const uqLast = userQueueLast();
    const cq = contextQueue();
    const cIdx = contextIndex();
    const upcomingContext = cIdx < cq.length - 1 ? cq.slice(cIdx + 1) : [];
    return [
      ...(curr ? [curr] : []),
      ...uqNext,
      ...upcomingContext,
      ...uqLast,
    ];
  });

  const queueIndex = createMemo(() => 0); // Current track is always first in active derived queue

  audio.addEventListener('timeupdate', () => {
    if (!isSeeking()) {
      setCurrentTime(audio.currentTime || 0);
    }
  });

  audio.addEventListener('durationchange', () => {
    setDuration(audio.duration || 0);
  });

  audio.addEventListener('play', () => {
    setIsPlaying(true);
    updateMediaSessionPlaybackState('playing');
  });

  audio.addEventListener('playing', () => {
    setIsBuffering(false);
    setIsPlaying(true);
    updateMediaSessionPlaybackState('playing');
    const track = currentTrack();
    if (track) {
      updateMediaSessionArtwork(track);
    }
    // Preload next track once current track is actively playing
    setTimeout(() => preloadNextTrack(), 1000);
  });

  audio.addEventListener('waiting', () => {
    setIsBuffering(true);
  });

  audio.addEventListener('canplay', () => {
    setIsBuffering(false);
  });

  audio.addEventListener('pause', () => {
    setIsPlaying(false);
    setIsBuffering(false);
    updateMediaSessionPlaybackState('paused');
  });

  audio.addEventListener('ended', () => {
    setIsBuffering(false);
    playNextInHierarchy(false);
  });

  audio.addEventListener('error', (e) => {
    console.error('Audio playback error', e);
    setIsBuffering(false);
    const track = currentTrack();
    // If raw stream failed asynchronously during decoding, recover with mp3 transcode
    if (track && audio.src && !audio.src.includes('format=mp3')) {
      console.log(`Audio error on raw stream, recovering with mp3 transcode for: ${track.id}`);
      audio.src = api.getStreamUrl(track.id, 'mp3', 320);
      audio.play().catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  });

  function updateMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
    try {
      MediaSession.setPlaybackState({ playbackState: state }).catch(() => {});
    } catch (e) {}
  }

  function setupMediaSessionActionHandlers() {
    if ('mediaSession' in navigator) {
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
      } catch (e) {}
    }

    try {
      MediaSession.setActionHandler({ action: 'play' }, () => play()).catch(() => {});
      MediaSession.setActionHandler({ action: 'pause' }, () => pause()).catch(() => {});
      MediaSession.setActionHandler({ action: 'previoustrack' }, () => previousTrack()).catch(() => {});
      MediaSession.setActionHandler({ action: 'nexttrack' }, () => nextTrack()).catch(() => {});
      MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
        if (details.seekTime != null) {
          seek(details.seekTime);
        }
      }).catch(() => {});
    } catch (e) {}
  }

  setupMediaSessionActionHandlers();

  function updateMediaSessionMetadata(track: Song) {
    const metadata = {
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      artwork: [],
    };

    if ('mediaSession' in navigator) {
      const coverUrl = api.getCoverArtUrl(track.coverArt || track.id, 300);
      navigator.mediaSession.metadata = new MediaMetadata({
        ...metadata,
        artwork: coverUrl ? [{ src: coverUrl, sizes: '300x300', type: 'image/png' }] : [],
      });
    }

    try {
      // In native Android Capacitor, avoid sending artwork upfront so it doesn't do a synchronous blocking HttpURLConnection
      MediaSession.setMetadata(metadata).catch(() => {});
    } catch (e) {}
  }

  function updateMediaSessionArtwork(track: Song) {
    const coverUrl = api.getCoverArtUrl(track.coverArt || track.id, 300);
    if (!coverUrl) return;

    const metadataWithArtwork = {
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      artwork: [{ src: coverUrl, sizes: '300x300', type: 'image/png' }],
    };

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata(metadataWithArtwork);
    }

    try {
      MediaSession.setMetadata(metadataWithArtwork).catch(() => {});
    } catch (e) {}
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

  function getOptimalStreamUrl(track: Song): string {
    const suffix = (track.suffix || '').toLowerCase();
    const contentType = (track.contentType || '').toLowerCase();
    const bitRate = track.bitRate || 0;

    // Android Chromium cannot decode ALAC (Apple Lossless in .m4a or .alac containers).
    // Note: Navidrome reports M4A ALAC tracks with contentType: "audio/mp4" and bitRate > 384.
    const canPlayAlac = audio.canPlayType('audio/mp4; codecs="alac"') !== '';
    const isAlac = !canPlayAlac && (
      suffix === 'alac' ||
      (suffix === 'm4a' && (contentType.includes('alac') || contentType.includes('apple-lossless') || bitRate > 384))
    );

    // Only transcode codecs that are genuinely unsupported by Android Chromium WebView.
    // FLAC is fully supported natively — raw streaming has zero TTFB overhead on LAN.
    // Requesting format=mp3 for FLAC causes Navidrome to spawn ffmpeg which adds 1-3s startup delay.
    if (isAlac || suffix === 'wma' || suffix === 'ape' || suffix === 'dsf') {
      console.log(`[audio] Transcoding unsupported codec (${suffix || contentType}) → mp3 for track ${track.id}`);
      return api.getStreamUrl(track.id, 'mp3', 320);
    }

    // FLAC, MP3, AAC, OGG/Opus — all natively supported — stream raw for instant start
    return api.getStreamUrl(track.id);
  }

  function preloadNextTrack() {
    const q = queue();
    // In derived active queue, index 0 is current, index 1 is next
    if (q.length > 1) {
      const nextTrack = q[1];
      if (nextTrack && nextTrack.id !== preloadedTrackId) {
        preloadedTrackId = nextTrack.id;
        try {
          preloadAudio.src = getOptimalStreamUrl(nextTrack);
          preloadAudio.load();
        } catch (e) {}
      }
    }
  }

  function startPlaybackStream(track: Song, isRewind = false, skipHistoryRecording = false) {
    const prevTrack = currentTrack();
    if (prevTrack && prevTrack.id !== track.id && !isRewind && !skipHistoryRecording) {
      recordHistory(prevTrack);
    }
    setCurrentTrack(track);
    setIsBuffering(true);

    // Stop current playback cleanly without destroying the native AudioTrack pipeline
    audio.pause();

    const streamUrl = getOptimalStreamUrl(track);
    audio.src = streamUrl;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to start audio playback', err);
          // Fallback to transcoding (mp3) if the initial stream failed
          if (!streamUrl.includes('format=mp3')) {
            console.log(`Playback failed for ${track.id}, falling back to mp3 transcode`);
            audio.src = api.getStreamUrl(track.id, 'mp3', 320);
            audio.play().catch((e) => {
              if (e.name !== 'AbortError') console.error('Transcode fallback also failed', e);
            });
          }
        }
      });
    }
    updateMediaSessionMetadata(track);
  }

  /**
   * Starts playback of a track with collection context.
   * If `collection` is supplied, sets the active Context Queue.
   * Clears user queue for fresh album playback.
   */
  function playTrack(track: Song, collection?: Song[], index?: number) {
    // Starting a new track/album resets history and clears user queue
    setPlayedHistory([]);
    setUserQueueNext([]);
    setUserQueueLast([]);
    setCurrentTrack(null);

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

    // 1. Check User Queue Next (plays before context resumes)
    const uqNext = userQueueNext();
    if (uqNext.length > 0) {
      const nextSong = uqNext[0];
      setUserQueueNext(uqNext.slice(1));
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

    // 3. Check User Queue Last (plays after context finishes)
    const uqLast = userQueueLast();
    if (uqLast.length > 0) {
      const nextSong = uqLast[0];
      setUserQueueLast(uqLast.slice(1));
      startPlaybackStream(nextSong);
      return;
    }

    // 4. Reached end of everything
    if (repeatMode() === 'all' && cq.length > 0) {
      setContextIndex(0);
      startPlaybackStream(cq[0]);
    } else {
      // Natural stop
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

    const history = playedHistory();
    const cq = contextQueue();

    if (history.length > 0) {
      const prevTrack = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setPlayedHistory(newHistory);

      const currTrack = currentTrack();
      if (currTrack) {
        const currCqIdx = cq.findIndex((s) => s.id === currTrack.id);
        if (currCqIdx === -1) {
          setUserQueueNext([currTrack, ...userQueueNext()]);
        }
      }

      const prevCqIdx = cq.findIndex((s) => s.id === prevTrack.id);
      if (prevCqIdx >= 0) {
        setContextIndex(prevCqIdx);
      } else {
        let lastContextIdx = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const idxInCq = cq.findIndex((s) => s.id === newHistory[i].id);
          if (idxInCq >= 0) {
            lastContextIdx = idxInCq;
            break;
          }
        }
        setContextIndex(lastContextIdx);
      }

      startPlaybackStream(prevTrack, true);
      return;
    }

    if (cq.length === 0) return;
    let prevIdx = contextIndex() - 1;
    if (prevIdx < 0) {
      if (repeatMode() === 'all') {
        prevIdx = cq.length - 1;
      } else {
        prevIdx = 0;
        audio.currentTime = 0;
        return;
      }
    }
    setContextIndex(prevIdx);
    startPlaybackStream(cq[prevIdx], true);
  }

  function nextTrack() {
    playNextInHierarchy(true);
  }

  let seekDebounceTimer: any = null;
  let seekBadgeTimer: any = null;
  let accumulatedStep = 0;
  let stepAccumulatorTimer: any = null;

  function seek(seconds: number) {
    if (audio.duration) {
      const clamped = Math.max(0, Math.min(seconds, audio.duration));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
      setIsSeeking(false);
      setSeekPreviewTime(null);
      setSeekOffsetBadge(null);
    }
  }

  function seekDebounced(targetSeconds: number) {
    const dur = duration() || audio.duration;
    if (!dur) return;

    const clamped = Math.max(0, Math.min(targetSeconds, dur));
    setIsSeeking(true);
    setSeekPreviewTime(clamped);

    if (seekDebounceTimer) clearTimeout(seekDebounceTimer);

    seekDebounceTimer = setTimeout(() => {
      audio.currentTime = clamped;
      setCurrentTime(clamped);
      setIsSeeking(false);
      setSeekPreviewTime(null);
      if (seekBadgeTimer) clearTimeout(seekBadgeTimer);
      seekBadgeTimer = setTimeout(() => setSeekOffsetBadge(null), 800);
    }, 250);
  }

  function seekStep(offsetSeconds: number) {
    const dur = duration() || audio.duration;
    if (!dur) return;

    const baseTime = seekPreviewTime() !== null ? seekPreviewTime()! : currentTime();
    const target = Math.max(0, Math.min(baseTime + offsetSeconds, dur));

    // Accumulate badge display string (+5s, +10s, -15s, etc.)
    if (stepAccumulatorTimer) clearTimeout(stepAccumulatorTimer);
    accumulatedStep += offsetSeconds;
    const sign = accumulatedStep > 0 ? '+' : '';
    setSeekOffsetBadge(`${sign}${accumulatedStep}s`);

    stepAccumulatorTimer = setTimeout(() => {
      accumulatedStep = 0;
    }, 1200);

    seekDebounced(target);
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
      // Play Next: insert before the context queue resumes
      setUserQueueNext([...list, ...userQueueNext()]);
    } else {
      // Play Last: insert after the context queue finishes
      setUserQueueLast([...userQueueLast(), ...list]);
    }
  }

  function removeFromUserQueue(songId: string) {
    setUserQueueNext(userQueueNext().filter((s) => s.id !== songId));
    setUserQueueLast(userQueueLast().filter((s) => s.id !== songId));
    if (explicitSingleQueueIds().has(songId)) {
      const nextSet = new Set(explicitSingleQueueIds());
      nextSet.delete(songId);
      setExplicitSingleQueueIds(nextSet);
    }
  }

  function removeFromUserQueueByIndex(index: number) {
    const uqNext = userQueueNext();
    if (index < uqNext.length) {
      removeFromUserQueue(uqNext[index].id);
    } else {
      const lastIndex = index - uqNext.length;
      const uqLast = userQueueLast();
      if (lastIndex >= 0 && lastIndex < uqLast.length) {
        removeFromUserQueue(uqLast[lastIndex].id);
      }
    }
  }

  function isSongInUserQueue(songId: string): boolean {
    return userQueueNext().some((s) => s.id === songId) || userQueueLast().some((s) => s.id === songId);
  }

  function isExplicitUserQueued(songId: string): boolean {
    return explicitSingleQueueIds().has(songId);
  }

  /**
   * Clear ONLY the manual User Queue, keeping the active album/context completely intact.
   */
  function clearUserQueue() {
    setUserQueueNext([]);
    setUserQueueLast([]);
    setExplicitSingleQueueIds(new Set<string>());
    showToast('Queue Cleared');
  }

  function jumpToUserQueueIndex(index: number) {
    const uqNext = userQueueNext();
    if (index >= 0 && index < uqNext.length) {
      const song = uqNext[index];

      // Manually record history before jumping — pass skipHistoryRecording=true
      // to startPlaybackStream so it doesn't push a second time.
      const newHistory = [...playedHistory()];
      const curr = currentTrack();
      if (curr) newHistory.push(curr);
      for (let i = 0; i < index; i++) {
        newHistory.push(uqNext[i]);
      }
      setPlayedHistory(newHistory);

      const tracksToRemove = new Set<string>();
      for (let i = 0; i <= index; i++) {
        tracksToRemove.add(uqNext[i].id);
      }
      setUserQueueNext(uqNext.slice(index + 1));

      const nextSet = new Set(explicitSingleQueueIds());
      tracksToRemove.forEach((id) => nextSet.delete(id));
      setExplicitSingleQueueIds(nextSet);

      // skipHistoryRecording=true — we already pushed above
      startPlaybackStream(song, false, true);
    }
  }

  function jumpToContextIndex(index: number) {
    const cq = contextQueue();
    if (index >= 0 && index < cq.length) {
      const isRewind = index < contextIndex();

      if (isRewind) {
        const history = playedHistory();
        const targetSong = cq[index];
        const hIdx = history.findIndex((s) => s.id === targetSong.id);
        if (hIdx >= 0) {
          setPlayedHistory(history.slice(0, hIdx));
        }
      } else if (index > contextIndex()) {
        // Manually push skipped songs into history
        const newHistory = [...playedHistory()];
        const curr = currentTrack();
        if (curr) newHistory.push(curr);

        const uqNext = userQueueNext();
        uqNext.forEach(s => newHistory.push(s));

        for (let i = contextIndex() + 1; i < index; i++) {
          newHistory.push(cq[i]);
        }
        setPlayedHistory(newHistory);

        setUserQueueNext([]);
        const nextSet = new Set(explicitSingleQueueIds());
        uqNext.forEach(s => nextSet.delete(s.id));
        setExplicitSingleQueueIds(nextSet);
      }

      setContextIndex(index);
      // skipHistoryRecording=true when jumping forward — we handled it above
      startPlaybackStream(cq[index], isRewind, !isRewind);
    }
  }

  // Backwards compatibility aliases
  function addToQueue(tracks: Song | Song[], playNext = false) {
    addToUserQueue(tracks, playNext, !Array.isArray(tracks));
  }

  function removeFromQueue(index: number, _silent = false) {
    const uqNext = userQueueNext();
    const cq = contextQueue();
    const cIdx = contextIndex();
    const upcomingContextLen = Math.max(0, cq.length - 1 - cIdx);

    if (index < uqNext.length) {
      removeFromUserQueueByIndex(index);
    } else if (index < uqNext.length + upcomingContextLen) {
      const contextOffset = index - uqNext.length;
      const targetCtxIdx = cIdx + 1 + contextOffset;
      removeFromContextQueueByIndex(targetCtxIdx);
    } else {
      const lastIndex = index - uqNext.length - upcomingContextLen;
      const uqLast = userQueueLast();
      if (lastIndex >= 0 && lastIndex < uqLast.length) {
        removeFromUserQueue(uqLast[lastIndex].id);
      }
    }
  }

  function removeFromQueueBySongId(songId: string) {
    removeFromUserQueue(songId);
  }

  function removeSongsFromQueue(songIds: Set<string>) {
    setUserQueueNext(userQueueNext().filter((s) => !songIds.has(s.id)));
    setUserQueueLast(userQueueLast().filter((s) => !songIds.has(s.id)));
    const nextSet = new Set(explicitSingleQueueIds());
    songIds.forEach((id) => nextSet.delete(id));
    setExplicitSingleQueueIds(nextSet);
  }

  function isSongInQueue(songId: string): boolean {
    return isSongInUserQueue(songId);
  }

  function clearQueue() {
    setUserQueueNext([]);
    setUserQueueLast([]);
    setExplicitSingleQueueIds(new Set<string>());
    const cIdx = contextIndex();
    setContextQueue(contextQueue().slice(0, cIdx + 1));
    showToast('Queue Cleared');
  }

  function removeFromContextQueueByIndex(actualIdx: number) {
    const cq = contextQueue();
    if (actualIdx >= 0 && actualIdx < cq.length) {
      const newCq = [...cq];
      newCq.splice(actualIdx, 1);
      setContextQueue(newCq);
    }
  }

  function jumpToQueueIndex(index: number) {
    const uqNext = userQueueNext();
    const cq = contextQueue();
    const cIdx = contextIndex();
    const upcomingContextLen = Math.max(0, cq.length - 1 - cIdx);

    if (index < uqNext.length) {
      jumpToUserQueueIndex(index);
    } else if (index < uqNext.length + upcomingContextLen) {
      const contextOffset = index - uqNext.length;
      const targetCtxIdx = cIdx + 1 + contextOffset;
      jumpToContextIndex(targetCtxIdx);
    } else {
      // Clicking a userQueueLast item — treat like a user queue jump
      const lastIndex = index - uqNext.length - upcomingContextLen;
      const uqLast = userQueueLast();
      if (lastIndex >= 0 && lastIndex < uqLast.length) {
        const song = uqLast[lastIndex];

        const newHistory = [...playedHistory()];
        const curr = currentTrack();
        if (curr) newHistory.push(curr);
        uqNext.forEach(s => newHistory.push(s));
        for (let i = cIdx + 1; i < cq.length; i++) newHistory.push(cq[i]);
        for (let i = 0; i < lastIndex; i++) newHistory.push(uqLast[i]);
        setPlayedHistory(newHistory);

        setUserQueueNext([]);
        setUserQueueLast(uqLast.slice(lastIndex + 1));
        setContextIndex(cq.length);

        const nextSet = new Set(explicitSingleQueueIds());
        uqNext.forEach(s => nextSet.delete(s.id));
        for (let i = 0; i <= lastIndex; i++) {
          nextSet.delete(uqLast[i].id);
        }
        setExplicitSingleQueueIds(nextSet);

        startPlaybackStream(song, false, true);
      }
    }
  }

  function playHistoryItem(song: Song) {
    const history = playedHistory();
    const hIdx = history.findIndex((s) => s.id === song.id);
    if (hIdx >= 0) {
      const newHistory = history.slice(0, hIdx);
      const tracksToRequeue = history.slice(hIdx + 1);
      setPlayedHistory(newHistory);

      const cq = contextQueue();
      const currTrack = currentTrack();

      // Only re-queue tracks that aren't already in the context queue (i.e. manually queued ones)
      const customTracksToRequeue = tracksToRequeue.filter((s) => cq.findIndex((x) => x.id === s.id) === -1);

      if (currTrack && cq.findIndex((s) => s.id === currTrack.id) === -1) {
        customTracksToRequeue.push(currTrack);
      }

      if (customTracksToRequeue.length > 0) {
        setUserQueueNext([...customTracksToRequeue, ...userQueueNext()]);
      }

      const prevCqIdx = cq.findIndex((s) => s.id === song.id);
      if (prevCqIdx >= 0) {
        setContextIndex(prevCqIdx);
      } else {
        let lastContextIdx = -1;
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const idxInCq = cq.findIndex((s) => s.id === newHistory[i].id);
          if (idxInCq >= 0) {
            lastContextIdx = idxInCq;
            break;
          }
        }
        setContextIndex(lastContextIdx);
      }

      // isRewind=true so startPlaybackStream skips history recording
      startPlaybackStream(song, true);
    }
  }

  return {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    contextQueue,
    contextIndex,
    userQueueNext,
    userQueueLast,
    // Backwards-compatible: combined view of both manual queues
    userQueue: () => [...userQueueNext(), ...userQueueLast()],
    playedHistory,
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
    removeFromContextQueueByIndex,
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
    playHistoryItem,
    toggleShuffle,
    toggleRepeatMode,
    playTrack,
    play,
    pause,
    togglePlay,
    previousTrack,
    nextTrack,
    seek,
    isSeeking,
    seekPreviewTime,
    seekOffsetBadge,
    seekDebounced,
    seekStep,
    formatRemainingTime,
    formatElapsedTime,
  };
}

export const audioPlayer = createRoot(createAudioPlayer);
