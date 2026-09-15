import { Component, createSignal } from 'solid-js';
import { api, Album } from '../../services/api';
import { MusicNoteIcon } from './Icons';
import { setGlobalAlbumMenuTarget } from '../../services/uiState';
import { createLongPress } from '../../hooks/useLongPress';

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
  const coverUrl = () => api.getCoverArtUrl(props.album.coverArt || props.album.id, variant() === 'hero' ? 500 : 300);
  const [imgLoaded, setImgLoaded] = createSignal(false);

  const longPressHandlers = createLongPress(
    (e, targetElement) => {
      const rect = targetElement.getBoundingClientRect();
      setGlobalAlbumMenuTarget({ album: props.album, triggerRect: rect });
    },
    () => props.onClick(props.album)
  );

  return (
    <div class="flex flex-col cursor-pointer select-none scroll-mb-24 p-2 -m-2 [content-visibility:auto] [contain-intrinsic-size:17.2rem_21rem]" data-card-wrapper="true">
      {variant() === 'hero' && props.categoryLabel && (
        <span class="text-xl font-bold text-neutral-400 tracking-tight mb-2 truncate">
          {props.categoryLabel}
        </span>
      )}

      {variant() === 'hero' ? (
        <div
          onTouchStart={longPressHandlers.onTouchStart}
          onTouchMove={longPressHandlers.onTouchMove}
          onTouchEnd={longPressHandlers.onTouchEnd}
          onTouchCancel={longPressHandlers.onTouchCancel}
          onMouseDown={longPressHandlers.onMouseDown}
          onMouseLeave={longPressHandlers.onMouseLeave}
          onMouseUp={longPressHandlers.onMouseUp}
          onClick={longPressHandlers.onClick}
          onContextMenu={longPressHandlers.onContextMenu}
          class="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl relative flex flex-col justify-end transform active:scale-[0.98] transition-transform [-webkit-touch-callout:none]"
          data-focusable="true"
          data-section={props.section}
          data-index={props.index}
          data-context-target="true"
        >
          {coverUrl() ? (
            <img
              src={coverUrl()}
              alt={props.album.title || props.album.title}
              onLoad={() => setImgLoaded(true)}
              class={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${imgLoaded() ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div class="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-600 pointer-events-none">
              <MusicNoteIcon class="w-24 h-24" />
            </div>
          )}

          <div class="relative z-10 w-full p-5 bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-transparent pt-12 flex flex-col items-center text-center gap-1 pointer-events-none">
            <h3 class="text-2xl font-extrabold text-white leading-tight line-clamp-2">
              {props.album.title || props.album.title}
            </h3>
            <p class="text-2xl font-bold text-neutral-200 truncate w-full">
              {props.album.artist || 'Unknown Artist'}
            </p>
          </div>
        </div>
      ) : (
        <div
          onTouchStart={longPressHandlers.onTouchStart}
          onTouchMove={longPressHandlers.onTouchMove}
          onTouchEnd={longPressHandlers.onTouchEnd}
          onTouchCancel={longPressHandlers.onTouchCancel}
          onMouseDown={longPressHandlers.onMouseDown}
          onMouseLeave={longPressHandlers.onMouseLeave}
          onMouseUp={longPressHandlers.onMouseUp}
          onClick={longPressHandlers.onClick}
          onContextMenu={longPressHandlers.onContextMenu}
          class="flex flex-col scroll-mb-24 group transform active:scale-[0.98] transition-transform [-webkit-touch-callout:none]"
          data-card-wrapper="true"
          data-context-target="true"
        >
          <div
            class="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900 shadow-xl relative"
            data-focusable="true"
            data-section={props.section}
            data-index={props.index}
          >
            {coverUrl() ? (
              <img
                src={coverUrl()}
                alt={props.album.title || props.album.title}
                onLoad={() => setImgLoaded(true)}
                class={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${imgLoaded() ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div class="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600 pointer-events-none">
                <MusicNoteIcon class="w-20 h-20" />
              </div>
            )}
          </div>

          <div class="flex flex-col mt-3 px-0.5 min-h-[60px] pointer-events-none">
            <h3 class="text-2xl font-extrabold text-white leading-tight truncate">
              {props.album.title || props.album.title}
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
