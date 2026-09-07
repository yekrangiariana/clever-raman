import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { audioPlayer } from '../services/audio';
import { api, Song } from '../services/api';
import { focusEngine } from '../services/focus';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, ShuffleIcon, HeartIcon, QueueListIcon, TrashIcon, ArrowLeftIcon, MusicNoteIcon } from './common/Icons';

interface NowPlayingViewProps {
  onBack?: () => void;
  backLabel?: string;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const NowPlayingView: Component<NowPlayingViewProps> = (props) => {
  const track = () => audioPlayer.currentTrack();
  const [isStarred, setIsStarred] = createSignal<boolean>(false);
  const [showQueue, setShowQueue] = createSignal<boolean>(false);

  const coverUrl = createMemo(() => {
    const t = track();
    if (!t) return '';
    if (t.starred) setIsStarred(true);
    return api.getCoverArtUrl(t.coverArt || t.id, 800);
  });

  const progressPercent = createMemo(() => {
    const dur = audioPlayer.duration();
    const cur = audioPlayer.currentTime();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  const queue = () => audioPlayer.queue();
  const queueIndex = () => audioPlayer.queueIndex();

  const upcomingCount = () => {
    const q = queue();
    const idx = queueIndex();
    return Math.max(0, q.length - 1 - idx);
  };

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

  function handleRemoveFromQueue(idx: number, e: Event) {
    e.stopPropagation();
    const currentLen = queue().length;
    audioPlayer.removeFromQueue(idx);
    const remLen = currentLen - 1;
    if (remLen <= 0) {
      setShowQueue(false);
      focusEngine.setFocus('nowPlaying', 6);
    } else {
      const targetIdx = Math.min(idx, remLen - 1);
      const focusIdx = remLen > 1 ? targetIdx + 1 : targetIdx;
      setTimeout(() => {
        focusEngine.setFocus('nowPlayingQueue_remove', focusIdx);
      }, 50);
    }
  }

  function handleBack() {
    if (props.onBack) {
      props.onBack();
    } else {
      focusEngine.setActiveModal('albumDetail');
      focusEngine.setFocus('albumDetail', 1);
    }
  }

  function handleToggleQueue() {
    const next = !showQueue();
    setShowQueue(next);
    if (next) {
      setTimeout(() => {
        focusEngine.setFocus('nowPlayingQueue', queue().length > 1 ? 0 : 1);
      }, 50);
    } else {
      focusEngine.setFocus('nowPlaying', 6);
    }
  }

  return (
    <div class="fixed inset-0 z-50 bg-black/20 flex flex-col justify-between p-12 overflow-hidden">
      {/* Top Header: Back Button Top Left */}
      <div class="flex items-center justify-between z-20 shrink-0">
        <button
          onClick={handleBack}
          class="px-6 py-3 rounded-full bg-neutral-900 border border-neutral-800 text-white font-extrabold text-xl flex items-center gap-3 hover:bg-neutral-800 shadow-lg"
          data-focusable="true"
          data-section="nowPlaying"
          data-index="0"
        >
          <ArrowLeftIcon class="w-6 h-6" />
          {props.backLabel || 'Back to Album'}
        </button>

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
              data-index="1"
            >
              <SkipPrevIcon class="w-8 h-8" />
            </button>

            {/* Play / Pause Toggle */}
            <button
              onClick={() => audioPlayer.togglePlay()}
              class="w-20 h-20 rounded-full bg-white flex items-center justify-center text-black shadow-2xl hover:scale-105"
              data-focusable="true"
              data-section="nowPlaying"
              data-index="2"
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
              data-index="3"
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
              data-index="4"
            >
              <ShuffleIcon class="w-7 h-7" />
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
              {upcomingCount() > 0 && (
                <span class={`absolute -top-2 -right-2 px-2.5 py-0.5 min-w-[28px] rounded-full text-base font-black leading-none flex items-center justify-center shadow-lg border border-black/20 ${
                  showQueue() ? 'bg-black text-white' : 'bg-white text-black'
                }`}>
                  {upcomingCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: 50% Full-Height Up Next Stage (Matching Apple TV Reference Screenshot) */}
        <Show when={showQueue()}>
          <div class="w-1/2 h-[640px] flex flex-col justify-start pl-8 pr-4 min-h-0 animate-fade-in">
            {/* Section Header */}
            <div class="flex items-center justify-between shrink-0 mb-3">
              <h2 class="text-4xl font-black text-white tracking-tight">Up Next</h2>

              <div class="flex items-center gap-3">
                {queue().length > 1 && (
                  <button
                    onClick={() => audioPlayer.clearQueue()}
                    class="px-5 py-2 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-base font-extrabold transition-all"
                    data-focusable="true"
                    data-section="nowPlayingQueue"
                    data-index="0"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Thin Horizontal Divider Line */}
            <div class="w-full h-px bg-white/15 mb-4 shrink-0" />

            {/* Queue Scrollable List */}
            <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-2">
              <For each={queue()}>
                {(song, index) => {
                  const isPlaying = () => index() === queueIndex();
                  const focusIndex = () => (queue().length > 1 ? index() + 1 : index());
                  return (
                    <div class="flex flex-col w-full">
                      <div
                        onClick={() => audioPlayer.jumpToQueueIndex(index())}
                        class={`h-24 px-5 rounded-2xl flex items-center justify-between cursor-pointer border border-transparent transition-all relative ${
                          isPlaying()
                            ? 'bg-white text-black font-extrabold shadow-xl scale-[1.01]'
                            : 'bg-transparent text-neutral-200 hover:bg-neutral-800/60'
                        }`}
                        data-focusable="true"
                        data-variant="list"
                        data-section="nowPlayingQueue"
                        data-index={focusIndex()}
                      >
                        <div class="flex items-center gap-5 truncate flex-1 min-w-0">
                          {/* Album Artwork Thumbnail */}
                          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 shrink-0 shadow-md border border-white/10">
                            {song.coverArt || song.id ? (
                              <img
                                src={api.getCoverArtUrl(song.coverArt || song.id, 300)}
                                alt={song.title}
                                class="w-full h-full object-cover"
                              />
                            ) : (
                              <div class="w-full h-full flex items-center justify-center text-neutral-600">
                                <MusicNoteIcon class="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          {/* Track Number */}
                          <span class={`font-mono text-3xl font-black shrink-0 ${isPlaying() ? 'text-black' : 'text-neutral-400'}`}>
                            {index() + 1}.
                          </span>

                          {/* Title & Artist */}
                          <div class="flex flex-col truncate min-w-0 flex-1">
                            <span class="text-2xl font-extrabold truncate leading-snug">{song.title}</span>
                            <span class={`text-lg truncate font-medium ${isPlaying() ? 'text-neutral-700' : 'text-neutral-400'}`}>
                              {song.artist}
                            </span>
                          </div>
                        </div>

                        {/* Duration & Remove Button */}
                        <div class="flex items-center gap-6 shrink-0 ml-4">
                          <span class={`font-mono text-xl font-medium ${isPlaying() ? 'text-black' : 'text-neutral-400'}`}>
                            {formatDuration(song.duration)}
                          </span>
                          {!isPlaying() && (
                            <button
                              onClick={(e) => handleRemoveFromQueue(index(), e)}
                              class="p-2.5 rounded-full text-neutral-400 hover:text-white transition-all flex items-center justify-center shrink-0"
                              data-focusable="true"
                              data-variant="topPick"
                              data-section="nowPlayingQueue_remove"
                              data-index={focusIndex()}
                              title="Remove"
                            >
                              <TrashIcon class="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Thin horizontal divider line between rows */}
                      <div class="w-full h-px bg-white/10 my-0.5" />
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>

      {/* Bottom Stage: Full-Width Progress Bar */}
      <div class="w-full flex flex-col gap-3 z-20 px-4 shrink-0">
        <div class="w-full h-3 rounded-full bg-neutral-800/90 overflow-hidden relative">
          <div
            class="h-full bg-white rounded-full"
            style={{ width: `${progressPercent()}%` }}
          />
        </div>
        <div class="flex justify-between text-2xl font-mono font-bold text-white tracking-wider">
          <span>{audioPlayer.formatElapsedTime()}</span>
          <span>{audioPlayer.formatRemainingTime()}</span>
        </div>
      </div>
    </div>
  );
};
