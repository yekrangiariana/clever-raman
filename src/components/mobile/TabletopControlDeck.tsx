import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { api, Song } from '../../services/api';
import { setGlobalSelectedAlbumId } from '../../services/uiState';
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
  AlbumIcon,
  TrashIcon,
} from '../common/Icons';

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface TabletopControlDeckProps {
  onClose?: () => void;
}

export const TabletopControlDeck: Component<TabletopControlDeckProps> = (props) => {
  const track = () => audioPlayer.currentTrack();
  const isPlaying = () => audioPlayer.isPlaying();
  const [isStarred, setIsStarred] = createSignal<boolean>(false);
  const [activeSheet, setActiveSheet] = createSignal<'none' | 'queue'>('none');
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [dragTime, setDragTime] = createSignal<number | null>(null);

  let progressBarRef: HTMLDivElement | undefined;

  createMemo(() => {
    const t = track();
    if (t && t.starred) setIsStarred(true);
    else setIsStarred(false);
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
      await api.star(t.id);
    } else {
      await api.unstar(t.id);
    }
  };

  const handleGoToAlbum = () => {
    const t = track();
    if (t && t.albumId) {
      setGlobalSelectedAlbumId(t.albumId);
      props.onClose?.();
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

  const handleRemoveFromQueue = (idx: number) => {
    if (idx === 0) return;
    const offset = idx - 1;
    audioPlayer.removeFromQueue(offset);
  };

  return (
    <div class="relative w-full h-full flex flex-col justify-between p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,16px))] bg-transparent select-none text-white gap-2">
      
      {/* ROW 1: TOP BAR (4 Equal Width Icons: Exit X | Album Disc | Heart | Queue) */}
      <div class="grid grid-cols-4 gap-2 w-full">
        {/* Button 1: Exit X */}
        <button
          onClick={() => props.onClose?.()}
          class="h-14 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 rounded-2xl flex items-center justify-center text-white transition-all shadow-md"
          title="Exit Player"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Button 2: Album Icon (Go to Album) */}
        <button
          onClick={handleGoToAlbum}
          class="h-14 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 rounded-2xl flex items-center justify-center text-white transition-all shadow-md"
          title="View Album"
        >
          <AlbumIcon class="w-6 h-6 text-white/90" />
        </button>

        {/* Button 3: Heart / Favorite */}
        <button
          onClick={handleToggleStar}
          class={`h-14 border rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-md ${
            isStarred()
              ? 'bg-[#fa243c]/30 border-[#fa243c] text-[#fa243c]'
              : 'bg-white/10 border-white/15 text-white/80 hover:text-white'
          }`}
          title="Favorite"
        >
          <HeartIcon class="w-6 h-6" filled={isStarred()} />
        </button>

        {/* Button 4: Queue List / Playing Next */}
        <button
          onClick={() => setActiveSheet((s) => (s === 'queue' ? 'none' : 'queue'))}
          class={`h-14 border rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-md ${
            activeSheet() === 'queue'
              ? 'bg-white text-black border-white shadow-lg'
              : 'bg-white/10 border-white/15 text-white/80 hover:text-white'
          }`}
          title="Queue"
        >
          <QueueListIcon class="w-6 h-6" />
        </button>
      </div>

      {/* ROW 2: MAIN HERO CONTROL PADS (Netflix Style 3 Equal Height Large Rectangular Cards Next to Each Other) */}
      <div class="grid grid-cols-3 gap-2 my-auto items-stretch h-32">
        {/* Rewind -10s Card */}
        <button
          onClick={() => audioPlayer.seekStep(-10)}
          class="bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg"
          title="Rewind 10 seconds"
        >
          <div class="relative flex items-center justify-center">
            <svg class="w-10 h-10 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="absolute text-[11px] font-black tracking-tighter text-white">10</span>
          </div>
        </button>

        {/* Center Main Play/Pause Hero Card */}
        <button
          onClick={() => audioPlayer.togglePlay()}
          class="bg-[#fa243c] hover:bg-[#e01e35] text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all"
        >
          <Show when={isPlaying()} fallback={<PlayIcon class="w-12 h-12 ml-1" />}>
            <PauseIcon class="w-12 h-12" />
          </Show>
        </button>

        {/* Forward +10s Card */}
        <button
          onClick={() => audioPlayer.seekStep(10)}
          class="bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg"
          title="Forward 10 seconds"
        >
          <div class="relative flex items-center justify-center">
            <svg class="w-10 h-10 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 4v5h-.582m0 0a8.001 8.001 0 00-15.356 2m15.356-2H15m-11 11v-5h.581m0 0a8.003 8.003 0 0015.357-2m-15.357 2H9" />
            </svg>
            <span class="absolute text-[11px] font-black tracking-tighter text-white">10</span>
          </div>
        </button>
      </div>

      {/* ROW 3: FULL WIDTH CONTINUOUS SCRUBBER CARD */}
      <div class="bg-white/10 border border-white/15 rounded-2xl p-3 flex flex-col gap-1.5 shadow-lg">
        <div
          ref={progressBarRef}
          class="relative h-6 flex items-center cursor-pointer touch-none group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div class="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              class="h-full bg-[#fa243c] rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progressPercent()}%` }}
            />
          </div>
          <div
            class="absolute h-5 w-5 bg-white rounded-full shadow-md border border-black/20 scale-100 transition-transform group-active:scale-125"
            style={{ left: `calc(${progressPercent()}% - 10px)` }}
          />
        </div>
        <div class="flex items-center justify-between text-xs font-mono font-medium text-neutral-300 px-1">
          <span>{formatDuration(effectiveTime())}</span>
          <span>{remainingTime()}</span>
        </div>
      </div>

      {/* ROW 4: BOTTOM PILL BAR (4 Equal Rounded Action Pills: Prev | Shuffle | Repeat | Next) */}
      <div class="grid grid-cols-4 gap-2">
        {/* Previous Track Pill */}
        <button
          onClick={() => audioPlayer.previousTrack()}
          class="h-14 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition-all shadow-md"
          title="Previous Track"
        >
          <SkipPrevIcon class="w-6 h-6" />
        </button>

        {/* Shuffle Pill */}
        <button
          onClick={() => audioPlayer.toggleShuffle()}
          class={`h-14 border rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md ${
            audioPlayer.isShuffle()
              ? 'bg-[#fa243c]/30 border-[#fa243c] text-[#fa243c]'
              : 'bg-white/10 border-white/15 text-white/90 hover:text-white'
          }`}
          title="Shuffle"
        >
          <ShuffleIcon class="w-6 h-6" />
        </button>

        {/* Repeat Pill */}
        <button
          onClick={() => audioPlayer.toggleRepeatMode()}
          class={`h-14 border rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-md ${
            audioPlayer.repeatMode() !== 'off'
              ? 'bg-[#fa243c]/30 border-[#fa243c] text-[#fa243c]'
              : 'bg-white/10 border-white/15 text-white/90 hover:text-white'
          }`}
          title="Repeat"
        >
          <Show when={audioPlayer.repeatMode() === 'one'} fallback={<RepeatIcon class="w-6 h-6" />}>
            <RepeatOneIcon class="w-6 h-6" />
          </Show>
        </button>

        {/* Next Track Pill */}
        <button
          onClick={() => audioPlayer.nextTrack()}
          class="h-14 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition-all shadow-md"
          title="Next Track"
        >
          <SkipNextIcon class="w-6 h-6" />
        </button>
      </div>

      {/* Tabletop Queue Drawer */}
      <Show when={activeSheet() === 'queue'}>
        <div class="absolute inset-0 z-40 bg-[#121217]/98 backdrop-blur-2xl flex flex-col px-6 pt-[env(safe-area-inset-top,24px)] pb-[env(safe-area-inset-bottom,24px)] animate-in slide-in-from-bottom duration-300 rounded-t-3xl">
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

          <div class="flex-1 overflow-y-auto py-3 space-y-1 divide-y divide-white/5">
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
