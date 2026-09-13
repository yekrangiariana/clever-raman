import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { api, Song } from '../../services/api';
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
  LyricsIcon,
  ChevronDownIcon,
  MusicNoteIcon,
  TrashIcon,
} from '../common/Icons';

interface MobileNowPlayingProps {
  onClose: () => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MobileNowPlaying: Component<MobileNowPlayingProps> = (props) => {
  const track = () => audioPlayer.currentTrack();
  const isPlaying = () => audioPlayer.isPlaying();
  const [isStarred, setIsStarred] = createSignal<boolean>(false);
  const [activeSheet, setActiveSheet] = createSignal<'none' | 'queue' | 'lyrics'>('none');
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [dragTime, setDragTime] = createSignal<number | null>(null);

  let progressBarRef: HTMLDivElement | undefined;

  const coverUrl = createMemo(() => {
    const t = track();
    if (!t) return '';
    if (t.starred) setIsStarred(true);
    return api.getSongCoverArtUrl(t, 600);
  });

  const effectiveTime = createMemo(() => {
    if (isDragging() && dragTime() !== null) return dragTime()!;
    return audioPlayer.currentTime();
  });

  const progressPercent = createMemo(() => {
    const dur = audioPlayer.duration();
    const cur = effectiveTime();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  const remainingTime = createMemo(() => {
    const dur = audioPlayer.duration();
    const cur = effectiveTime();
    const rem = Math.max(0, dur - cur);
    return `-${formatDuration(rem)}`;
  });

  const handleToggleStar = async () => {
    const t = track();
    if (!t) return;
    const nextState = !isStarred();
    setIsStarred(nextState);
    if (nextState) {
      await api.starItem(t.id);
    } else {
      await api.unstarItem(t.id);
    }
  };

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

  // Swipe down to close logic
  let startY = 0;
  let currentY = 0;
  let scrollContainer: HTMLDivElement | undefined;

  const handleTouchStart = (e: TouchEvent) => {
    // If we're scrolling inside the queue sheet, don't hijack swipe unless at the top
    if (activeSheet() !== 'none' && scrollContainer && scrollContainer.scrollTop > 0) {
      return;
    }
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY > 0) {
      currentY = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    if (startY > 0 && currentY > startY) {
      const diff = currentY - startY;
      if (diff > 100) {
        if (activeSheet() !== 'none') {
          setActiveSheet('none');
        } else {
          props.onClose();
        }
      }
    }
    startY = 0;
    currentY = 0;
  };

  const handleRemoveFromQueue = (idx: number) => {
    if (idx === 0) return; // Cannot remove current track
    const uqLen = audioPlayer.userQueue().length;
    const offset = idx - 1;
    if (offset < uqLen) {
      audioPlayer.removeFromUserQueueByIndex(offset);
    } else {
      const contextOffset = offset - uqLen;
      const targetCtxIdx = audioPlayer.contextIndex() + 1 + contextOffset;
      audioPlayer.removeFromContextQueueByIndex(targetCtxIdx);
    }
  };

  return (
    <div 
      class="fixed inset-0 z-50 flex flex-col bg-[#121216] text-white overflow-hidden select-none animate-in fade-in slide-in-from-bottom duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Dynamic Ambient Blur */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <Show when={coverUrl()}>
          <img
            src={coverUrl()}
            alt=""
            class="w-full h-full object-cover filter blur-3xl scale-125 transform-gpu"
          />
        </Show>
        <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-[#0e0e12]" />
      </div>

      {/* Main Container */}
      <div class="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-6 pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)] justify-between">
        
        {/* Top Dismiss Handle & Bar */}
        <div class="flex items-center justify-between pt-3 pb-2">
          <button
            onClick={props.onClose}
            class="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-95 transition-transform"
            aria-label="Collapse"
          >
            <ChevronDownIcon class="w-7 h-7" />
          </button>

          <div class="flex flex-col items-center">
            <span class="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mt-2">
              {track()?.album || 'Now Playing'}
            </span>
          </div>

          <div class="w-10 h-10 -mr-2 flex items-center justify-center">
            {/* Context menu spacer */}
          </div>
        </div>

        {/* Center: Album Artwork */}
        <div class="flex-1 flex items-center justify-center py-4 min-h-0">
          <div class={`relative aspect-square w-full max-w-[340px] max-h-[340px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500 ${isPlaying() ? 'scale-100' : 'scale-90 opacity-90'}`}>
            <Show
              when={coverUrl()}
              fallback={
                <div class="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <MusicNoteIcon class="w-24 h-24 text-neutral-600" />
                </div>
              }
            >
              <img
                src={coverUrl()}
                alt={track()?.title}
                class="w-full h-full object-cover select-none"
              />
            </Show>
          </div>
        </div>

        {/* Bottom Area: Controls */}
        <div class="flex flex-col gap-6 pb-2">
          
          {/* Track Info */}
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0 flex-1 flex flex-col">
              <h2 class="text-xl md:text-2xl font-bold truncate tracking-tight">{track()?.title || 'No Track'}</h2>
              <p class="text-base text-neutral-300 truncate opacity-80">{track()?.artist || 'Unknown Artist'}</p>
            </div>
            <button
              onClick={handleToggleStar}
              class={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors ${
                isStarred() ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <HeartIcon class="w-7 h-7" filled={isStarred()} />
            </button>
          </div>

          {/* Timeline / Scrubber */}
          <div class="flex flex-col gap-2">
            <div
              ref={progressBarRef}
              class="relative h-6 flex items-center cursor-pointer touch-none group"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div class="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  class="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progressPercent()}%` }}
                />
              </div>
              <div
                class="absolute h-4 w-4 bg-white rounded-full shadow border border-black/10 scale-0 group-active:scale-100 transition-transform"
                style={{ left: `calc(${progressPercent()}% - 8px)` }}
              />
            </div>
            
            <div class="flex items-center justify-between text-[11px] font-medium text-neutral-400 font-mono">
              <span>{formatDuration(effectiveTime())}</span>
              <span>{remainingTime()}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div class="flex items-center justify-between px-2">
            <button
              onClick={() => audioPlayer.toggleShuffle()}
              class={`w-10 h-10 flex items-center justify-center active:scale-90 transition-transform ${
                audioPlayer.isShuffle() ? 'text-[#fa243c]' : 'text-neutral-500 hover:text-white'
              }`}
              aria-label="Shuffle"
            >
              <ShuffleIcon class="w-6 h-6" />
            </button>

            <button
              onClick={() => audioPlayer.previousTrack()}
              class="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform"
              aria-label="Previous Track"
            >
              <SkipPrevIcon class="w-9 h-9" />
            </button>

            <button
              onClick={() => audioPlayer.togglePlay()}
              class="w-18 h-18 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
              aria-label={isPlaying() ? 'Pause' : 'Play'}
            >
              <Show when={isPlaying()} fallback={<PlayIcon class="w-9 h-9 ml-1" />}>
                <PauseIcon class="w-9 h-9" />
              </Show>
            </button>

            <button
              onClick={() => audioPlayer.nextTrack()}
              class="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform"
              aria-label="Next Track"
            >
              <SkipNextIcon class="w-9 h-9" />
            </button>

            <button
              onClick={() => audioPlayer.toggleRepeatMode()}
              class={`w-10 h-10 flex items-center justify-center active:scale-90 transition-transform ${
                audioPlayer.repeatMode() !== 'off' ? 'text-[#fa243c]' : 'text-neutral-500 hover:text-white'
              }`}
              aria-label="Repeat"
            >
              <Show when={audioPlayer.repeatMode() === 'one'} fallback={<RepeatIcon class="w-6 h-6" />}>
                <RepeatOneIcon class="w-6 h-6" />
              </Show>
            </button>
          </div>

          {/* Bottom Utility Drawer Actions (Queue) */}
          <div class="flex items-center justify-center pt-2 border-t border-white/10">
            <button
              onClick={() => setActiveSheet((s) => (s === 'queue' ? 'none' : 'queue'))}
              class={`flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                activeSheet() === 'queue'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white bg-white/5'
              }`}
            >
              <QueueListIcon class="w-5 h-5" />
              <span>Queue ({audioPlayer.upcomingCount()})</span>
            </button>
          </div>

        </div>

      </div>

      {/* Slide-over Queue Drawer */}
      <Show when={activeSheet() === 'queue'}>
        <div class="absolute inset-0 z-40 bg-[#14141a]/95 backdrop-blur-2xl flex flex-col px-6 pt-[env(safe-area-inset-top,24px)] pb-[env(safe-area-inset-bottom,24px)] animate-in slide-in-from-bottom duration-300">
          <div class="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 class="text-xl font-bold text-white">Playing Next</h2>
              <p class="text-xs text-neutral-400">{audioPlayer.upcomingCount()} songs in queue</p>
            </div>
            <button
              onClick={() => setActiveSheet('none')}
              class="px-4 py-1.5 bg-white/10 rounded-full text-sm font-bold text-white active:scale-95"
            >
              Done
            </button>
          </div>

          <div class="flex-1 overflow-y-auto py-3 space-y-1 divide-y divide-white/5" ref={scrollContainer}>
            <For each={audioPlayer.playedHistory()}>
              {(song: Song) => (
                <div
                  onClick={() => audioPlayer.playHistoryItem(song)}
                  class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors opacity-50 hover:bg-white/5 text-neutral-300 cursor-pointer"
                >
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0 grayscale brightness-75">
                      <img
                        src={api.getSongCoverArtUrl(song, 120)}
                        alt={song.title}
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold truncate leading-tight">{song.title}</p>
                      <p class="text-xs text-neutral-400 truncate mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0 ml-2">
                    <span class="text-xs text-neutral-500 font-mono">
                      {formatDuration(song.duration)}
                    </span>
                  </div>
                </div>
              )}
            </For>

            <For each={audioPlayer.queue()}>
              {(song: Song, idx) => {
                const isCurrent = () => audioPlayer.currentTrack()?.id === song.id;
                return (
                  <div
                    onClick={() => {
                      if (!isCurrent()) audioPlayer.jumpToQueueIndex(idx() - 1);
                    }}
                    class={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                      isCurrent() ? 'bg-white/15 text-white font-bold' : 'hover:bg-white/5 text-neutral-300'
                    }`}
                  >
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                        <img
                          src={api.getSongCoverArtUrl(song, 120)}
                          alt={song.title}
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold truncate leading-tight">{song.title}</p>
                        <p class="text-xs text-neutral-400 truncate mt-0.5">{song.artist}</p>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 shrink-0 ml-2">
                      <span class="text-xs text-neutral-500 font-mono">
                        {formatDuration(song.duration)}
                      </span>
                      <Show when={!isCurrent()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromQueue(idx());
                          }}
                          class="p-1.5 text-neutral-500 hover:text-red-400"
                          title="Remove from queue"
                        >
                          <TrashIcon class="w-4 h-4" />
                        </button>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

    </div>
  );
};
