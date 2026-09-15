import { Component, createMemo, Show } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { api } from '../../services/api';
import { PlayIcon, PauseIcon, SkipNextIcon, MusicNoteIcon } from '../common/Icons';

interface MobileMiniPlayerProps {
  onOpenNowPlaying: () => void;
}

export const MobileMiniPlayer: Component<MobileMiniPlayerProps> = (props) => {
  const track = () => audioPlayer.currentTrack();
  const isPlaying = () => audioPlayer.isPlaying();

  const coverUrl = createMemo(() => {
    const t = track();
    if (!t) return '';
    return api.getSongCoverArtUrl(t, 200);
  });

  const progressPercent = createMemo(() => {
    const dur = audioPlayer.duration();
    const cur = audioPlayer.currentTime();
    if (!dur) return 0;
    return Math.min(100, Math.max(0, (cur / dur) * 100));
  });

  return (
    <Show when={track()}>
      <div class="px-3 pb-2 pt-1 w-full shrink-0 z-30 pointer-events-auto">
        <div 
          onClick={props.onOpenNowPlaying}
          class="relative w-full h-14 bg-black/40 hover:bg-black/50 backdrop-blur-2xl border border-white/20 rounded-2xl flex items-center justify-between px-3 shadow-2xl overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
        >
          {/* Subtle bottom progress bar */}
          <div 
            class="absolute bottom-0 left-0 h-[2.5px] bg-[#fa243c] rounded-full transition-all duration-300 pointer-events-none"
            style={{ width: `${progressPercent()}%` }}
          />

          {/* Left: Album Artwork + Metadata */}
          <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div class="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden shrink-0 shadow-md flex items-center justify-center border border-white/10">
              <Show 
                when={coverUrl()} 
                fallback={<MusicNoteIcon class="w-5 h-5 text-neutral-500" />}
              >
                <img 
                  src={coverUrl()} 
                  alt={track()?.title} 
                  class="w-full h-full object-cover" 
                />
              </Show>
            </div>

            <div class="min-w-0 flex-1 flex flex-col justify-center">
              <span class="text-sm font-bold text-white truncate leading-tight">
                {track()?.title || 'Unknown Title'}
              </span>
              <span class="text-xs font-medium text-neutral-300 truncate leading-tight mt-0.5">
                {track()?.artist || 'Unknown Artist'}
              </span>
            </div>
          </div>

          {/* Right: Quick Touch Controls */}
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                audioPlayer.togglePlay();
              }}
              aria-label={isPlaying() ? 'Pause' : 'Play'}
            >
              <Show when={isPlaying()} fallback={<PlayIcon class="w-5 h-5 ml-0.5" />}>
                <PauseIcon class="w-5 h-5" />
              </Show>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                audioPlayer.nextTrack();
              }}
              class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all shadow-sm"
              aria-label="Next Track"
            >
              <SkipNextIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
