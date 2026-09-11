import { Component, createSignal } from 'solid-js';
import { api, Song } from '../../services/api';
import { MusicNoteIcon, PlayIcon } from './Icons';

interface TrackCardProps {
  song: Song;
  allSongs: Song[];
  songIndex: number;
  section: string;
  focusIndex: number;
  onPlay: (song: Song, allSongs: Song[], index: number) => void;
}

export const TrackCard: Component<TrackCardProps> = (props) => {
  const coverUrl = () => api.getCoverArtUrl(props.song.coverArt || props.song.albumId, 300);
  const [imgLoaded, setImgLoaded] = createSignal(false);

  return (
    <div
      onClick={() => props.onPlay(props.song, props.allSongs, props.songIndex)}
      class="flex flex-col cursor-pointer select-none scroll-mb-24 p-2 -m-2 [content-visibility:auto] [contain-intrinsic-size:17.2rem_21rem]"
      data-card-wrapper="true"
    >
      <div
        class="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900 shadow-xl relative group"
        data-focusable="true"
        data-section={props.section}
        data-index={props.focusIndex}
      >
        {coverUrl() ? (
          <img
            src={coverUrl()}
            alt={props.song.title}
            onLoad={() => setImgLoaded(true)}
            class={`w-full h-full object-cover ${imgLoaded() ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div class="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600">
            <MusicNoteIcon class="w-20 h-20" />
          </div>
        )}

        <div class="absolute inset-0 bg-black/30 opacity-0 group-[.focused]:opacity-100 transition-opacity flex items-center justify-center">
          <div class="w-14 h-14 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
            <PlayIcon class="w-8 h-8 ml-1" />
          </div>
        </div>
      </div>

      <div class="flex flex-col mt-3 px-0.5 min-h-[60px]">
        <h3 class="text-2xl font-extrabold text-white leading-tight truncate">
          {props.song.title}
        </h3>
        <p class="text-xl font-bold text-neutral-300 truncate mt-1">
          {props.song.artist || 'Unknown Artist'}
        </p>
      </div>
    </div>
  );
};
