import { Component, createSignal, createEffect, createMemo } from 'solid-js';
import { Song } from '../../services/api';
import { audioPlayer } from '../../services/audio';
import { QueueAddIcon, HeartIcon, CheckIcon } from './Icons';

interface SongRowProps {
  song: Song;
  index: number;
  trackNumber?: number;
  section: string;
  focusIndex: number;
  onPlay: (song: Song) => void;
  onToggleStar?: (song: Song, e: Event) => void;
  isPlaying?: boolean;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SongRow: Component<SongRowProps> = (props) => {
  const [isStarred, setIsStarred] = createSignal<boolean>(!!props.song.starred);

  const isUserQueued = createMemo(() => {
    return audioPlayer.isExplicitUserQueued(props.song.id);
  });

  createEffect(() => {
    setIsStarred(!!props.song.starred);
  });

  const handleHeartClick = (e: Event) => {
    e.stopPropagation();
    const nextState = !isStarred();
    setIsStarred(nextState);
    if (props.onToggleStar) {
      props.onToggleStar(props.song, e);
    }
  };

  const handleQueueClick = (e: Event) => {
    e.stopPropagation();
    if (isUserQueued()) {
      audioPlayer.removeFromUserQueue(props.song.id);
    } else {
      audioPlayer.addToUserQueue(props.song, false, true);
    }
  };

  return (
    <div
      onClick={() => props.onPlay(props.song)}
      class={`min-h-[84px] py-1.5 px-8 rounded-2xl flex items-center justify-between cursor-pointer border shrink-0 transition-all ${
        props.isPlaying
          ? 'bg-white border-white text-black font-extrabold shadow-xl'
          : 'bg-transparent border-transparent text-neutral-300 hover:bg-neutral-800/60'
      }`}
      data-focusable="true"
      data-variant="list"
      data-playing={props.isPlaying ? "true" : undefined}
      data-section={props.section}
      data-index={props.focusIndex}
    >
      <div class="flex items-center gap-8 truncate flex-1 min-w-0">
        <span class={`w-8 font-mono text-2xl text-right font-bold flex items-center justify-end shrink-0 ${props.isPlaying ? 'text-black' : 'text-neutral-500'}`}>
          {props.isPlaying ? (
            <span class="w-3.5 h-3.5 rounded-full bg-black inline-block animate-pulse play-indicator"></span>
          ) : (
            props.trackNumber || props.index + 1
          )}
        </span>
        <span class={`font-extrabold truncate text-2xl ${props.isPlaying ? 'text-black' : 'text-white'}`}>{props.song.title}</span>
      </div>

      <div class="flex items-center gap-4 shrink-0 ml-4">
        <button
          onClick={handleQueueClick}
          class={`p-2.5 rounded-full transition-all flex items-center justify-center shadow-md ${
            isUserQueued()
              ? 'bg-emerald-600 border border-emerald-400 text-white is-added'
              : 'bg-neutral-800/90 border border-neutral-700/80 text-white hover:bg-neutral-700'
          }`}
          data-focusable="true"
          data-variant="topPick"
          data-added={isUserQueued() ? "true" : undefined}
          data-section={`${props.section}_queue`}
          data-index={props.focusIndex}
          title={isUserQueued() ? "In Queue (Click to Remove)" : "Add to Queue"}
        >
          {isUserQueued() ? <CheckIcon class="w-6 h-6 text-white" /> : <QueueAddIcon class="w-6 h-6" />}
        </button>

        {props.onToggleStar && (
          <button
            onClick={handleHeartClick}
            class={`p-2.5 rounded-full transition-all flex items-center justify-center border shadow-md ${
              isStarred()
                ? 'bg-rose-600/20 border-rose-500/40 text-rose-500 hover:bg-rose-600/30'
                : 'bg-neutral-800/90 border-neutral-700/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
            data-focusable="true"
            data-variant="topPick"
            data-section={`${props.section}_heart`}
            data-index={props.focusIndex}
            title={isStarred() ? "Remove from Favorites" : "Add to Favorites"}
          >
            <HeartIcon filled={isStarred()} class="w-6 h-6" />
          </button>
        )}

        <span class={`font-mono text-2xl font-medium min-w-[70px] text-right ${props.isPlaying ? 'text-black' : 'text-neutral-400'}`}>
          {formatDuration(props.song.duration)}
        </span>
      </div>
    </div>
  );
};
