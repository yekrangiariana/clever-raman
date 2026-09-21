import { Component, createMemo, createSignal, For, Show, createEffect, onMount, onCleanup } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { api, Song } from '../../services/api';
import { isTrackStarred, toggleTrackStar, setTrackStarredState } from '../../services/starred';
import { FadeImage } from '../common/FadeImage';
import { foldState } from '../../services/foldable';
import { TabletopControlDeck } from './TabletopControlDeck';
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
  ChevronRightIcon,
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

const MarqueeTitle: Component<{ title: string; class?: string }> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let textMeasureRef: HTMLHeadingElement | undefined;
  const [isOverflowing, setIsOverflowing] = createSignal(false);

  const check = () => {
    if (containerRef && textMeasureRef) {
      setIsOverflowing(textMeasureRef.clientWidth > containerRef.clientWidth);
    }
  };

  createEffect(() => {
    props.title;
    check();
  });

  onMount(() => {
    const ro = new ResizeObserver(() => check());
    if (containerRef) ro.observe(containerRef);
    if (textMeasureRef) ro.observe(textMeasureRef);
    onCleanup(() => ro.disconnect());
  });

  return (
    <div ref={containerRef} class={`relative overflow-hidden w-full flex items-center ${props.class || ''}`}>
      <div class="absolute opacity-0 pointer-events-none -z-10 w-max" aria-hidden="true">
        <h2 ref={textMeasureRef} class="text-xl md:text-2xl font-bold tracking-tight">
          {props.title}
        </h2>
      </div>

      <Show 
        when={isOverflowing()}
        fallback={
          <h2 class="text-xl md:text-2xl font-bold truncate tracking-tight text-white drop-shadow">
            {props.title}
          </h2>
        }
      >
        <div 
           class="w-full flex-1 overflow-hidden" 
           style={{ "mask-image": "linear-gradient(to right, black 0%, black calc(100% - 40px), transparent calc(100% - 16px))", "-webkit-mask-image": "linear-gradient(to right, black 0%, black calc(100% - 40px), transparent calc(100% - 16px))" }}
        >
          <div class="flex w-max animate-marquee-loop text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow">
            <span class="pr-12">{props.title}</span>
            <span class="pr-12">{props.title}</span>
          </div>
        </div>
        
        <div class="absolute right-0 top-0 bottom-0 flex items-center justify-end pointer-events-none">
          <ChevronRightIcon class="w-5 h-5 text-white/90 drop-shadow-md" />
        </div>
      </Show>
    </div>
  );
};

export const MobileNowPlaying: Component<MobileNowPlayingProps> = (props) => {
  const track = () => audioPlayer.currentTrack();
  const isPlaying = () => audioPlayer.isPlaying();
  const [activeSheet, setActiveSheet] = createSignal<'none' | 'queue' | 'lyrics'>('none');
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [dragTime, setDragTime] = createSignal<number | null>(null);

  let progressBarRef: HTMLDivElement | undefined;
  let tabletopProgressBarRef: HTMLDivElement | undefined;

  createEffect(() => {
    const t = track();
    if (t) {
      setTrackStarredState(t.id, Boolean(t.starred));
    }
  });

  const isStarred = () => {
    const t = track();
    return t ? isTrackStarred(t.id) : false;
  };

  const handleToggleStar = async () => {
    const t = track();
    if (!t) return;
    await toggleTrackStar(t.id);
  };

  const coverUrl = createMemo(() => {
    const t = track();
    if (!t) return '';
    return api.getSongCoverArtUrl(t, 500);
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

  function getTimeFromPointer(e: PointerEvent, targetRef?: HTMLDivElement): number {
    const ref = targetRef || progressBarRef;
    if (!ref) return 0;
    const rect = ref.getBoundingClientRect();
    const dur = audioPlayer.duration();
    if (!dur || rect.width <= 0) return 0;
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    return ratio * dur;
  }

  function handlePointerDown(e: PointerEvent, targetRef?: HTMLDivElement) {
    const ref = targetRef || progressBarRef;
    if (ref) {
      ref.setPointerCapture(e.pointerId);
    }
    setIsDragging(true);
    const targetTime = getTimeFromPointer(e, targetRef);
    setDragTime(targetTime);
  }

  function handlePointerMove(e: PointerEvent, targetRef?: HTMLDivElement) {
    if (isDragging()) {
      const targetTime = getTimeFromPointer(e, targetRef);
      setDragTime(targetTime);
    }
  }

  function handlePointerUp(e: PointerEvent, targetRef?: HTMLDivElement) {
    if (isDragging()) {
      const ref = targetRef || progressBarRef;
      if (ref && ref.hasPointerCapture(e.pointerId)) {
        ref.releasePointerCapture(e.pointerId);
      }
      const targetTime = getTimeFromPointer(e, targetRef);
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
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-queue-container="true"]')) {
      startY = 0;
      return;
    }
    if (activeSheet() !== 'none' && scrollContainer && scrollContainer.scrollTop > 0) {
      startY = 0;
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
    if (idx === 0) return;
    const offset = idx - 1;
    audioPlayer.removeFromQueue(offset);
  };

  return (
    <Show
      when={foldState().isTabletop}
      fallback={
        /* Standard Mobile / Unfolded Dual-Pane View */
        <div 
          class="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-[#2a0815] via-[#111827] to-[#0c0a09] text-white overflow-hidden select-none animate-in fade-in slide-in-from-bottom duration-300"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dynamic Full-Bleed Saturated Ambient Blurred Artwork Background */}
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <Show when={coverUrl()}>
              <FadeImage src={coverUrl()}
                alt=""
                class="w-full h-full  filter blur-3xl opacity-75 saturate-200 scale-150 transform-gpu"
              />
            </Show>
            <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75" />
          </div>

          {/* Main Layout Container (Unfolded: Dual-Pane Side-by-Side) */}
          <div class="relative z-10 flex flex-col md:flex-row h-full w-full px-4 md:px-6 pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)] justify-between md:gap-8 md:py-6">
            
            {/* LEFT PANE: Album Art, Info & Controls */}
            <div class="w-full md:w-[45%] md:shrink-0 md:min-w-0 flex flex-col h-full max-w-md mx-auto md:max-w-none md:mx-0 justify-between">
              {/* Top Dismiss Handle & Bar */}
              <div class="flex items-center justify-between pt-2 pb-2 gap-3">
                <button
                  onClick={props.onClose}
                  class="w-10 h-10 shrink-0 flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all"
                  aria-label="Collapse"
                >
                  <ChevronDownIcon class="w-6 h-6" />
                </button>

                <div class="min-w-0 flex-1 flex flex-col items-center">
                  <span class="text-[11px] font-bold uppercase tracking-widest text-white/70 mt-1 truncate w-full text-center">
                    {track()?.album || 'Now Playing'}
                  </span>
                </div>

                <div class="w-10 h-10 shrink-0 flex items-center justify-center">
                  {/* Spacer */}
                </div>
              </div>

              {/* Center: Album Artwork */}
              <div class="flex-1 flex items-center justify-center py-4 min-h-0">
                <div class={`relative aspect-square w-full max-w-[320px] max-h-[320px] md:max-w-[360px] md:max-h-[360px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20 transition-transform duration-500 ${isPlaying() ? 'scale-100' : 'scale-90 opacity-90'}`}>
                  <Show
                    when={coverUrl()}
                    fallback={
                      <div class="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <MusicNoteIcon class="w-24 h-24 text-neutral-600" />
                      </div>
                    }
                  >
                    <FadeImage
                      src={coverUrl()}
                      alt={track()?.title}
                      class="w-full h-full select-none"
                    />
                  </Show>
                </div>
              </div>

              {/* Bottom Area: Controls */}
              <div class="flex flex-col gap-5 pb-2">
                
                {/* Track Info */}
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0 flex-1 flex flex-col">
                    <MarqueeTitle title={track()?.title || 'No Track'} />
                    <p class="text-base text-neutral-300 truncate opacity-90 mt-0.5">{track()?.artist || 'Unknown Artist'}</p>
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
                <div class="flex flex-col gap-1.5">
                  <div
                    ref={progressBarRef}
                    class="relative h-6 flex items-center cursor-pointer touch-none group"
                    onPointerDown={(e) => handlePointerDown(e, progressBarRef)}
                    onPointerMove={(e) => handlePointerMove(e, progressBarRef)}
                    onPointerUp={(e) => handlePointerUp(e, progressBarRef)}
                    onPointerCancel={handlePointerCancel}
                  >
                    <div class="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-[#fa243c] rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progressPercent()}%` }}
                      />
                    </div>
                    <div
                      class="absolute h-4 w-4 bg-white rounded-full shadow border border-black/10 scale-100 group-active:scale-125 transition-transform"
                      style={{ left: `calc(${progressPercent()}% - 8px)` }}
                    />
                  </div>
                  
                  <div class="flex items-center justify-between text-[11px] font-medium text-neutral-300 font-mono">
                    <span>{formatDuration(effectiveTime())}</span>
                    <span>{remainingTime()}</span>
                  </div>
                </div>

                {/* Transport Controls */}
                <div class="flex items-center justify-between px-2">
                  <button
                    onClick={() => audioPlayer.toggleShuffle()}
                    class={`w-10 h-10 flex items-center justify-center active:scale-90 transition-transform ${
                      audioPlayer.isShuffle() ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
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
                    class="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                    aria-label={isPlaying() ? 'Pause' : 'Play'}
                  >
                    <Show when={isPlaying()} fallback={<PlayIcon class="w-8 h-8 ml-0.5" />}>
                      <PauseIcon class="w-8 h-8" />
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
                      audioPlayer.repeatMode() !== 'off' ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
                    }`}
                    aria-label="Repeat"
                  >
                    <Show when={audioPlayer.repeatMode() === 'one'} fallback={<RepeatIcon class="w-6 h-6" />}>
                      <RepeatOneIcon class="w-6 h-6" />
                    </Show>
                  </button>
                </div>

                {/* Mobile Drawer Toggle (Hidden on wide unfolded view where queue is visible side-by-side) */}
                <div class="flex items-center justify-center pt-2 md:hidden">
                  <button
                    onClick={() => setActiveSheet((s) => (s === 'queue' ? 'none' : 'queue'))}
                    class={`flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                      activeSheet() === 'queue'
                        ? 'bg-white text-black shadow-md'
                        : 'text-neutral-300 hover:text-white bg-white/10 border border-white/10 backdrop-blur-md'
                    }`}
                  >
                    <QueueListIcon class="w-5 h-5" />
                    <span>Queue ({audioPlayer.upcomingCount()})</span>
                  </button>
                </div>

              </div>

            </div>

            {/* RIGHT PANE: Playing Next Queue Side-by-Side in Unfolded Mode OR Slide-over Drawer in Folded Mode */}
            <div class={`w-full md:w-[55%] md:shrink-0 md:min-w-0 flex-col transition-all duration-300 ${
              activeSheet() === 'queue' ? 'flex' : 'hidden md:flex'
            } absolute inset-0 z-40 bg-black/80 backdrop-blur-3xl md:relative md:inset-auto md:z-auto md:bg-transparent md:backdrop-blur-none md:border-none md:rounded-none md:px-0 md:pr-6 md:h-full md:shadow-none overflow-hidden px-6 pt-[env(safe-area-inset-top,24px)] pb-[env(safe-area-inset-bottom,24px)] md:pt-16 md:pb-0`}>
              
              <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div>
                  <h2 class="text-xl font-bold text-white tracking-tight">Playing Next</h2>
                  <p class="text-xs text-neutral-300">{audioPlayer.upcomingCount()} songs in queue</p>
                </div>
                <button
                  onClick={() => setActiveSheet('none')}
                  class="px-4 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-sm font-bold text-white active:scale-95 md:hidden"
                >
                  Done
                </button>
              </div>

              <div class="flex-1 overflow-y-auto py-3 space-y-1 divide-y divide-white/5" ref={scrollContainer} data-queue-container="true">
                <For each={audioPlayer.playedHistory()}>
                  {(song: Song) => (
                    <div
                      onClick={() => audioPlayer.playHistoryItem(song)}
                      class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors opacity-50 hover:bg-white/5 text-neutral-300 cursor-pointer"
                    >
                      <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0 grayscale brightness-75">
                          <FadeImage
                            src={api.getSongCoverArtUrl(song, 120)}
                            alt={song.title}
                            class="w-full h-full"
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
                          isCurrent() ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/5 text-neutral-200'
                        }`}
                      >
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                          <div class="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden shrink-0">
                              <FadeImage
                                src={api.getSongCoverArtUrl(song, 120)}
                                alt={song.title}
                                class="w-full h-full"
                              />
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="text-sm font-semibold truncate leading-tight">{song.title}</p>
                            <p class="text-xs text-neutral-300 truncate mt-0.5">{song.artist}</p>
                          </div>
                        </div>

                        <div class="flex items-center gap-3 shrink-0 ml-2">
                          <span class="text-xs text-neutral-400 font-mono">
                            {formatDuration(song.duration)}
                          </span>
                          <Show when={!isCurrent()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromQueue(idx());
                              }}
                              class="p-1.5 text-neutral-400 hover:text-red-400"
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

          </div>
        </div>
      }
    >
      {/* Tabletop Flex Mode View */}
      <div class="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-3xl text-white overflow-hidden select-none animate-in fade-in duration-300">
        
        {/* Full-Screen Dynamic Ambient Blur Background (Extends across both top & bottom panels) */}
        <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
          <Show when={coverUrl()}>
            <FadeImage src={coverUrl()}
              alt=""
              class="w-full h-full  filter blur-3xl scale-125 transform-gpu saturate-150"
            />
          </Show>
          <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
        </div>

        {/* TOP HALF: Standing Screen (Gradient, Album Art + Track Info side by side) */}
        <div class="relative z-10 w-full h-[50vh] flex flex-col justify-center p-6 overflow-hidden">

          {/* Hero Content: Cover Art + Title/Artist Side-by-Side */}
          <div class="flex items-center gap-6 my-auto px-4">
            {/* Cover Art */}
            <div class="w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-2xl border border-white/20 shrink-0 bg-neutral-900 relative">
              <Show
                when={coverUrl()}
                fallback={
                  <div class="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <MusicNoteIcon class="w-16 h-16 text-neutral-600" />
                  </div>
                }
              >
                <FadeImage src={coverUrl()} alt={track()?.title} class="w-full h-full relative z-10" />
                <div class="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-800 absolute inset-0 z-0">
                  <MusicNoteIcon class="w-16 h-16" />
                </div>
              </Show>
            </div>

            {/* Title & Artist */}
            <div class="flex flex-col min-w-0 flex-1 drop-shadow-md">
              <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2">
                {track()?.title || 'No Track Playing'}
              </h1>
              <p class="text-base md:text-lg font-semibold text-white/80 truncate mt-1">
                {track()?.artist || 'Unknown Artist'}
              </p>
              <Show when={track()?.album}>
                <p class="text-xs font-medium text-white/50 truncate mt-1">
                  {track()?.album}
                </p>
              </Show>
            </div>
          </div>
        </div>

        {/* BOTTOM HALF: Tabletop Control Deck */}
        <div class="relative z-10 w-full h-[50vh]">
          <TabletopControlDeck onClose={props.onClose} />
        </div>
      </div>
    </Show>
  );
};
