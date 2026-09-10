import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { audioPlayer } from '../services/audio';
import { api, Song } from '../services/api';
import { focusEngine } from '../services/focus';
import {
  PlayIcon,
  PauseIcon,
  SkipNextIcon,
  SkipPrevIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  HeartIcon,
  QueueListIcon,
  CloseIcon,
  MusicNoteIcon,
  CheckIcon,
} from './common/Icons';

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const NowPlayingView: Component = () => {
  const track = () => audioPlayer.currentTrack();
  const [isStarred, setIsStarred] = createSignal<boolean>(false);
  const [showQueue, setShowQueue] = createSignal<boolean>(false);
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [dragTime, setDragTime] = createSignal<number | null>(null);

  let progressBarRef: HTMLDivElement | undefined;

  const coverUrl = createMemo(() => {
    const t = track();
    if (!t) return '';
    if (t.starred) setIsStarred(true);
    return api.getSongCoverArtUrl(t, 800);
  });

  const effectiveTime = createMemo(() => {
    if (isDragging() && dragTime() !== null) return dragTime()!;
    if (audioPlayer.isSeeking() && audioPlayer.seekPreviewTime() !== null) return audioPlayer.seekPreviewTime()!;
    return audioPlayer.currentTime();
  });

  const progressPercent = createMemo(() => {
    const dur = audioPlayer.duration();
    const cur = effectiveTime();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  function getTimeFromPointer(e: PointerEvent): number {
    if (!progressBarRef) return 0;
    const rect = progressBarRef.getBoundingClientRect();
    const dur = audioPlayer.duration();
    if (!dur || rect.width <= 0) return 0;
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    return ratio * dur;
  }

  function handlePointerDown(e: PointerEvent) {
    e.stopPropagation();
    focusEngine.setFocus('nowPlaying', 8, true);
    if (progressBarRef) {
      progressBarRef.setPointerCapture(e.pointerId);
    }
    setIsDragging(true);
    const targetTime = getTimeFromPointer(e);
    setDragTime(targetTime);
  }

  function handlePointerMove(e: PointerEvent) {
    if (isDragging()) {
      const targetTime = getTimeFromPointer(e);
      setDragTime(targetTime);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (isDragging()) {
      if (progressBarRef && progressBarRef.hasPointerCapture(e.pointerId)) {
        progressBarRef.releasePointerCapture(e.pointerId);
      }
      const targetTime = getTimeFromPointer(e);
      audioPlayer.seek(targetTime);
      setIsDragging(false);
      setDragTime(null);
    }
  }

  function handlePointerCancel() {
    if (isDragging()) {
      setIsDragging(false);
      setDragTime(null);
    }
  }

  const userQueue = () => audioPlayer.userQueue();
  const contextQueue = () => audioPlayer.contextQueue();
  const contextIndex = () => audioPlayer.contextIndex();

  const upcomingContext = createMemo(() => {
    const cq = contextQueue();
    const cIdx = contextIndex();
    return cIdx < cq.length - 1 ? cq.slice(cIdx + 1) : [];
  });

  const pastContext = createMemo(() => {
    const history = audioPlayer.playedHistory();
    const cq = contextQueue();
    const cIdx = contextIndex();
    const pastCq = cIdx > 0 ? cq.slice(0, cIdx) : [];

    const map = new Map<string, Song>();
    history.forEach((s) => map.set(s.id, s));
    pastCq.forEach((s) => map.set(s.id, s));

    const curr = track();
    if (curr) {
      map.delete(curr.id);
    }

    return Array.from(map.values());
  });

  const hasClear = createMemo(() => userQueue().length > 0 || upcomingContext().length > 0);

  async function handleToggleStar() {
    const t = track();
    if (!t) return;
    const nextState = !isStarred();
    setIsStarred(nextState);
    if (nextState) {
      await api.star(t.id, false);
    } else {
      await api.unstar(t.id, false);
    }
  }

  function handleToggleQueue() {
    const next = !showQueue();
    setShowQueue(next);
    if (next) {
      setTimeout(() => {
        const playingIndex = pastContext().length;
        focusEngine.setFocus('nowPlayingQueue', playingIndex);
      }, 50);
    } else {
      focusEngine.setFocus('nowPlaying', 7);
    }
  }

  function handleClearUserQueue() {
    audioPlayer.clearQueue();
    setTimeout(() => {
      const firstItem = document.querySelector('[data-section="nowPlayingQueue"][data-index="0"]');
      if (firstItem) {
        focusEngine.setFocus('nowPlayingQueue', 0);
      } else {
        focusEngine.setFocus('nowPlaying', 7);
      }
    }, 50);
  }

  function handleRemoveUserQueueItem(idx: number, e: Event) {
    e.stopPropagation();
    audioPlayer.removeFromUserQueueByIndex(idx);
  }

  function handleRemoveContextItem(relIdx: number, e: Event) {
    e.stopPropagation();
    const actualIdx = contextIndex() + 1 + relIdx;
    audioPlayer.removeFromContextQueueByIndex(actualIdx);
  }

  return (
    <div class="fixed inset-0 z-50 bg-black/20 flex flex-col justify-between p-12 overflow-hidden">
      {/* Top Header: Back Button Top Left */}
      <div class="flex items-center justify-end z-20 shrink-0">
        <span class="text-2xl font-extrabold text-neutral-400 tracking-wide truncate max-w-xl">
          {track()?.album ? `Album: ${track()!.album}` : 'Now Playing'}
        </span>
      </div>

      {/* Center Stage: 50/50 Split layout when queue is open, centered layout when closed */}
      <div class="flex-1 flex gap-16 items-center justify-center z-20 my-auto min-h-0 w-full px-4">
        {/* Left Side: Artwork, Metadata, Controls */}
        <div class={`flex flex-col items-center justify-center gap-6 transition-all duration-300 ${showQueue() ? 'w-1/2 shrink-0' : 'w-full max-w-2xl'}`}>
          {/* Square Album Art */}
          <div class={`rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl relative border border-white/10 shrink-0 transition-all duration-300 ${showQueue() ? 'w-[380px] h-[380px]' : 'w-[440px] h-[440px]'}`}>
            {coverUrl() ? (
              <img
                src={coverUrl()}
                alt={track()?.title || 'Now Playing'}
                class="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <div class="w-full h-full flex items-center justify-center text-neutral-700 rounded-3xl">
                <MusicNoteIcon class="w-32 h-32" />
              </div>
            )}
          </div>

          {/* Track Metadata Centered directly below Artwork */}
          <div class="flex flex-col items-center justify-center text-center gap-1 mt-1 w-full truncate">
            <h2 class="text-4xl font-black text-white tracking-normal truncate w-full px-4">
              {track()?.title || 'No Track Playing'}
            </h2>
            <p class="text-2xl font-bold text-neutral-300 truncate w-full px-4">
              {track()?.artist || 'Select an album to start playback'}
            </p>
          </div>

          {/* Transport Controls */}
          <div class="flex items-center gap-6 mt-1">
            {/* Previous Track */}
            <button
              onClick={() => audioPlayer.previousTrack()}
              class="w-16 h-16 rounded-full bg-neutral-900/90 flex items-center justify-center text-white hover:bg-neutral-800 border border-neutral-800 shadow-md"
              data-focusable="true"
              data-section="nowPlaying"
              data-index="0"
            >
              <SkipPrevIcon class="w-8 h-8" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={() => audioPlayer.togglePlay()}
              class="w-20 h-20 rounded-full bg-white flex items-center justify-center text-black shadow-2xl hover:scale-105"
              data-focusable="true"
              data-section="nowPlaying"
              data-index="1"
            >
              {audioPlayer.isPlaying() ? (
                <PauseIcon class="w-10 h-10" />
              ) : (
                <PlayIcon class="w-10 h-10 ml-1" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={() => audioPlayer.nextTrack()}
              class="w-16 h-16 rounded-full bg-neutral-900/90 flex items-center justify-center text-white hover:bg-neutral-800 border border-neutral-800 shadow-md"
              data-focusable="true"
              data-section="nowPlaying"
              data-index="2"
            >
              <SkipNextIcon class="w-8 h-8" />
            </button>

            {/* Shuffle Toggle */}
            <button
              onClick={() => audioPlayer.toggleShuffle()}
              class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                audioPlayer.isShuffle() ? 'text-black bg-white border-white shadow-lg' : 'text-neutral-400 bg-neutral-900/60 border-neutral-800 hover:text-white'
              }`}
              data-focusable="true"
              data-section="nowPlaying"
              data-index="3"
              title="Shuffle"
            >
              <ShuffleIcon class="w-7 h-7" />
            </button>

            {/* Repeat Toggle */}
            <button
              onClick={() => audioPlayer.toggleRepeatMode()}
              class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                audioPlayer.repeatMode() !== 'off' ? 'text-black bg-white border-white shadow-lg' : 'text-neutral-400 bg-neutral-900/60 border-neutral-800 hover:text-white'
              }`}
              data-focusable="true"
              data-section="nowPlaying"
              data-index="4"
              title={`Repeat: ${audioPlayer.repeatMode()}`}
            >
              {audioPlayer.repeatMode() === 'one' ? (
                <RepeatOneIcon class="w-7 h-7" />
              ) : (
                <RepeatIcon class="w-7 h-7" />
              )}
            </button>

            {/* Star Button */}
            <button
              onClick={handleToggleStar}
              class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                isStarred() ? 'text-white bg-rose-600 border-rose-500 shadow-lg' : 'text-neutral-400 bg-neutral-900/60 border-neutral-800 hover:text-white'
              }`}
              data-focusable="true"
              data-section="nowPlaying"
              data-index="5"
            >
              <HeartIcon filled={isStarred()} class="w-7 h-7" />
            </button>

            {/* Up Next Queue Toggle Button */}
            <button
              onClick={handleToggleQueue}
              class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all relative ${
                showQueue() ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              data-focusable="true"
              data-section="nowPlaying"
              data-index="6"
              title="Up Next Queue"
            >
              <QueueListIcon class="w-7 h-7" />
              {audioPlayer.upcomingCount() > 0 && (
                <span class={`absolute -top-2 -right-2 px-2.5 py-0.5 min-w-[28px] rounded-full text-base font-black leading-none flex items-center justify-center shadow-lg border border-black/20 ${
                  showQueue() ? 'bg-black text-white' : 'bg-white text-black'
                }`}>
                  {audioPlayer.upcomingCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: 50% Full-Height Up Next Stage (Single Unified Column) */}
        <Show when={showQueue()}>
          <div class="w-1/2 h-[640px] flex flex-col justify-start pl-8 pr-4 min-h-0 animate-fade-in">
            {/* Section Header */}
            <div class="flex items-center justify-between shrink-0 mb-3">
              <h2 class="text-4xl font-black text-white tracking-tight">Up Next</h2>

              <div class="flex items-center gap-3">
                {hasClear() && (
                  <button
                    onClick={handleClearUserQueue}
                    class="px-5 py-2 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-base font-extrabold transition-all"
                    data-focusable="true"
                    data-section="nowPlayingQueue_header"
                    data-index="0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Thin Horizontal Divider Line */}
            <div class="w-full h-px bg-white/15 mb-4 shrink-0" />

            {/* Queue Scrollable List */}
            <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 px-8 py-6 -mx-8 -my-6 [scroll-padding:24px]">
              {/* 1. Completed Past Context Queue Items (Dimmed State with Checkmark) */}
              <For each={pastContext()}>
                {(song, pastIndex) => {
                  return (
                    <div class="flex flex-col w-full opacity-45 hover:opacity-80 transition-opacity">
                      <div
                        onClick={() => {
                          audioPlayer.playHistoryItem(song);
                        }}
                        class="h-24 px-5 rounded-2xl flex items-center justify-between cursor-pointer border border-transparent transition-all relative bg-transparent text-neutral-300 hover:bg-neutral-800/60"
                        data-focusable="true"
                        data-variant="list"
                        data-section="nowPlayingQueue"
                        data-index={pastIndex()}
                      >
                        <div class="flex items-center gap-5 truncate flex-1 min-w-0">
                          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 shadow-md border border-white/10 opacity-70">
                            {song.coverArt || song.albumId || song.id ? (
                              <img
                                src={api.getSongCoverArtUrl(song, 300)}
                                alt={song.title}
                                class="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div class="w-full h-full flex items-center justify-center text-neutral-600">
                                <MusicNoteIcon class="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          <div class="w-8 flex items-center justify-center shrink-0">
                            <CheckIcon class="w-6 h-6 text-neutral-400 font-bold" />
                          </div>

                          <div class="flex flex-col truncate min-w-0 flex-1">
                            <span class="text-2xl font-bold truncate leading-snug text-neutral-300">{song.title}</span>
                            <span class="text-lg truncate font-medium text-neutral-400">{song.artist}</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-6 shrink-0 ml-4">
                          <span class="font-mono text-xl font-medium text-neutral-400">
                            {formatDuration(song.duration)}
                          </span>
                        </div>
                      </div>
                      <div class="w-full h-px bg-white/10 my-0.5" />
                    </div>
                  );
                }}
              </For>

              {/* 2. Currently Playing Track */}
              <Show when={track()}>
                <div class="flex flex-col w-full">
                  <div
                    class="h-24 px-5 rounded-2xl flex items-center justify-between cursor-pointer border border-transparent transition-all relative bg-white text-black font-extrabold shadow-xl scale-[1.01]"
                    data-focusable="true"
                    data-variant="list"
                    data-playing="true"
                    data-section="nowPlayingQueue"
                    data-index={pastContext().length}
                  >
                    <div class="flex items-center gap-5 truncate flex-1 min-w-0">
                      <div class="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 shadow-md border border-white/10">
                        {coverUrl() ? (
                          <img src={coverUrl()} alt={track()!.title} class="w-full h-full object-cover" />
                        ) : (
                          <div class="w-full h-full flex items-center justify-center text-neutral-600">
                            <MusicNoteIcon class="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <span class="w-3.5 h-3.5 rounded-full bg-black inline-block animate-pulse play-indicator shrink-0 mr-1" />

                      <div class="flex flex-col truncate min-w-0 flex-1">
                        <span class="text-2xl font-extrabold truncate leading-snug">{track()!.title}</span>
                        <span class="text-lg truncate font-medium text-neutral-700">{track()!.artist}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-6 shrink-0 ml-4">
                      <span class="font-mono text-xl font-medium text-black">
                        {formatDuration(track()!.duration || audioPlayer.duration())}
                      </span>
                    </div>
                  </div>
                  <div class="w-full h-px bg-white/10 my-0.5" />
                </div>
              </Show>

              {/* 3. Manually Added User Queue Items */}
              <For each={userQueue()}>
                {(song, uqIndex) => {
                  return (
                    <div class="flex flex-col w-full">
                      <div
                        onClick={() => audioPlayer.jumpToUserQueueIndex(uqIndex())}
                        class="h-24 px-5 rounded-2xl flex items-center justify-between cursor-pointer border border-transparent transition-all relative bg-transparent text-neutral-200 hover:bg-neutral-800/60"
                        data-focusable="true"
                        data-variant="list"
                        data-section="nowPlayingQueue"
                        data-index={pastContext().length + (track() ? 1 : 0) + uqIndex()}
                      >
                        <div class="flex items-center gap-5 truncate flex-1 min-w-0">
                          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 shadow-md border border-white/10">
                            {song.coverArt || song.albumId || song.id ? (
                              <img
                                src={api.getSongCoverArtUrl(song, 300)}
                                alt={song.title}
                                class="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div class="w-full h-full flex items-center justify-center text-neutral-600">
                                <MusicNoteIcon class="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          <span class="font-mono text-xl font-black text-emerald-400 shrink-0">
                            •
                          </span>

                          <div class="flex flex-col truncate min-w-0 flex-1">
                            <span class="text-2xl font-extrabold truncate leading-snug">{song.title}</span>
                            <span class="text-lg truncate font-medium text-neutral-400">{song.artist}</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-6 shrink-0 ml-4">
                          <span class="font-mono text-xl font-medium text-neutral-400">
                            {formatDuration(song.duration)}
                          </span>
                          <button
                            onClick={(e) => handleRemoveUserQueueItem(uqIndex(), e)}
                            class="p-2.5 rounded-full transition-all flex items-center justify-center border shadow-md bg-neutral-800/90 border-neutral-700/80 text-neutral-400 hover:text-white hover:bg-neutral-700 shrink-0"
                            data-focusable="true"
                            data-variant="topPick"
                            data-section="nowPlayingQueue_remove"
                            data-index={pastContext().length + (track() ? 1 : 0) + uqIndex()}
                            title="Remove from Queue"
                          >
                            <CloseIcon class="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div class="w-full h-px bg-white/10 my-0.5" />
                    </div>
                  );
                }}
              </For>

              {/* 4. Subtle Context Separator (Apple Music style) */}
              <Show when={userQueue().length > 0 && upcomingContext().length > 0}>
                <div class="flex items-center gap-4 my-3 px-3">
                  <div class="h-px bg-white/15 flex-1" />
                  <span class="text-xs font-bold tracking-wider text-neutral-400 uppercase">
                    Resuming
                  </span>
                  <div class="h-px bg-white/15 flex-1" />
                </div>
              </Show>

              {/* 5. Upcoming Context Queue Items */}
              <For each={upcomingContext()}>
                {(song, relIndex) => {
                  const actualContextIndex = contextIndex() + 1 + relIndex();
                  return (
                    <div class="flex flex-col w-full">
                      <div
                        onClick={() => audioPlayer.jumpToContextIndex(actualContextIndex)}
                        class="h-24 px-5 rounded-2xl flex items-center justify-between cursor-pointer border border-transparent transition-all relative bg-transparent text-neutral-200 hover:bg-neutral-800/60"
                        data-focusable="true"
                        data-variant="list"
                        data-section="nowPlayingQueue"
                        data-index={pastContext().length + (track() ? 1 : 0) + userQueue().length + relIndex()}
                      >
                        <div class="flex items-center gap-5 truncate flex-1 min-w-0">
                          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 shadow-md border border-white/10">
                            {song.coverArt || song.albumId || song.id ? (
                              <img
                                src={api.getSongCoverArtUrl(song, 300)}
                                alt={song.title}
                                class="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div class="w-full h-full flex items-center justify-center text-neutral-600">
                                <MusicNoteIcon class="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          <span class="font-mono text-2xl font-black text-neutral-500 shrink-0">
                            {song.track || actualContextIndex + 1}.
                          </span>

                          <div class="flex flex-col truncate min-w-0 flex-1">
                            <span class="text-2xl font-extrabold truncate leading-snug">{song.title}</span>
                            <span class="text-lg truncate font-medium text-neutral-400">{song.artist}</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-6 shrink-0 ml-4">
                          <span class="font-mono text-xl font-medium text-neutral-400">
                            {formatDuration(song.duration)}
                          </span>
                          <button
                            onClick={(e) => handleRemoveContextItem(relIndex(), e)}
                            class="p-2.5 rounded-full transition-all flex items-center justify-center border shadow-md bg-neutral-800/90 border-neutral-700/80 text-neutral-400 hover:text-white hover:bg-neutral-700 shrink-0"
                            data-focusable="true"
                            data-variant="topPick"
                            data-section="nowPlayingQueue_remove"
                            data-index={pastContext().length + (track() ? 1 : 0) + userQueue().length + relIndex()}
                            title="Remove from Queue"
                          >
                            <CloseIcon class="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div class="w-full h-px bg-white/10 my-0.5" />
                    </div>
                  );
                }}
              </For>

              {/* Empty Queue State */}
              <Show when={userQueue().length === 0 && upcomingContext().length === 0 && !track()}>
                <div class="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <p class="text-2xl font-bold">No upcoming tracks</p>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* Bottom Stage: Full-Width Interactive Progress Bar */}
      <div class="w-full flex flex-col items-center gap-2 z-20 px-4 shrink-0 relative">
        <div
          ref={progressBarRef}
          class="w-full py-2 cursor-pointer group select-none flex flex-col justify-center rounded-2xl"
          data-focusable="true"
          data-variant="seekBar"
          data-section="nowPlaying"
          data-index="7"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div class="w-full h-3.5 rounded-full bg-neutral-800/90 relative flex items-center overflow-hidden border border-white/10 [.focused_&]:border-white [.focused_&]:ring-2 [.focused_&]:ring-white">
            <div
              class="absolute inset-y-0 left-0 w-full bg-white transition-none origin-left"
              style={{ transform: `scaleX(${progressPercent() / 100})` }}
            />
          </div>
        </div>

        <div class="w-full flex justify-between text-2xl font-mono font-bold text-white tracking-wider px-1">
          <span>{formatDuration(effectiveTime())}</span>
          <span>{audioPlayer.formatRemainingTime()}</span>
        </div>
      </div>
    </div>
  );
};
