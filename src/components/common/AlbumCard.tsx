import { Component, createSignal } from 'solid-js';
import { api, Album } from '../../services/api';
import { MusicNoteIcon } from './Icons';

interface AlbumCardProps {
  album: Album;
  variant?: 'standard' | 'hero';
  categoryLabel?: string;
  section: string;
  index: number;
  onClick: (album: Album) => void;
}

export const AlbumCard: Component<AlbumCardProps> = (props) => {
  const variant = () => props.variant || 'standard';
  const coverUrl = () => api.getCoverArtUrl(props.album.coverArt || props.album.id, variant() === 'hero' ? 600 : 250);
  const [imgLoaded, setImgLoaded] = createSignal(false);

  return (
    <div class="flex flex-col cursor-pointer select-none scroll-mb-24" data-card-wrapper="true">
      {/* Category header for Hero variants (matching Top Picks in Apple TV) */}
      {variant() === 'hero' && props.categoryLabel && (
        <span class="text-xl font-bold text-neutral-400 tracking-tight mb-2 truncate">
          {props.categoryLabel}
        </span>
      )}

      {variant() === 'hero' ? (
        /* Hero Tall Card (Top Picks style from Apple TV reference) */
        <div
          onClick={() => props.onClick(props.album)}
          class="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl relative flex flex-col justify-end"
          data-focusable="true"
          data-section={props.section}
          data-index={props.index}
        >
          {/* Artwork */}
          {coverUrl() ? (
            <img
              src={coverUrl()}
              alt={props.album.title}
              onLoad={() => setImgLoaded(true)}
              class={`absolute inset-0 w-full h-full object-cover ${imgLoaded() ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div class="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-600">
              <MusicNoteIcon class="w-24 h-24" />
            </div>
          )}

          {/* Shaded bottom info block overlay */}
          <div class="relative z-10 w-full p-5 bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-transparent pt-12 flex flex-col items-center text-center gap-1">
            <h3 class="text-2xl font-extrabold text-white leading-tight line-clamp-2">
              {props.album.title}
            </h3>
            <p class="text-2xl font-bold text-neutral-200 truncate w-full">
              {props.album.artist || 'Unknown Artist'}
            </p>
            {props.album.year && (
              <span class="text-lg font-medium text-neutral-400">{props.album.year}</span>
            )}
          </div>
        </div>
      ) : (
        /* Standard Album Card (Apple TV Recently Played style: artwork square + text below) */
        <div
          onClick={() => props.onClick(props.album)}
          class="flex flex-col scroll-mb-24"
          data-card-wrapper="true"
        >
          {/* Artwork Container (Focusable) */}
          <div
            class="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900 shadow-xl relative"
            data-focusable="true"
            data-section={props.section}
            data-index={props.index}
          >
            {coverUrl() ? (
              <img
                src={coverUrl()}
                alt={props.album.title}
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
          </div>

          {/* Typography below artwork */}
          <div class="flex flex-col mt-3 px-0.5 min-h-[60px]">
            <h3 class="text-2xl font-extrabold text-white leading-tight truncate">
              {props.album.title}
            </h3>
            <p class="text-xl font-bold text-neutral-300 truncate mt-1">
              {props.album.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
