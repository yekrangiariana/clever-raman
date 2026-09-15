import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { api, Album } from '../../services/api';
import { createLongPress } from "../../hooks/useLongPress";
import { setGlobalAlbumMenuTarget } from "../../services/uiState";
import { AppleContextMenu } from './AppleContextMenu';
import { MusicNoteIcon } from '../common/Icons';
import { activeDownloads, isAlbumDownloaded, downloadProgress } from '../../services/offlineSync';
import { DownloadProgressRing } from '../common/DownloadProgressRing';

export type MobileAlbumFilter = 'newest' | 'alphabeticalByName' | 'starred';

interface MobileAlbumsViewProps {
  onSelectAlbum: (album: Album) => void;
  selectedGenre?: string | null;
  selectedArtist?: string | null;
  onClearFilter?: () => void;
}

export const MobileAlbumsView: Component<MobileAlbumsViewProps> = (props) => {
  const [filter, setFilter] = createSignal<MobileAlbumFilter>('newest');
  const [albums, setAlbums] = createSignal<Album[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [pageOffset, setPageOffset] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(true);

  const fetchAlbums = async (f: MobileAlbumFilter, offset: number, replace: boolean) => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      let list: Album[] = [];
      if (props.selectedGenre) {
        list = await api.getAlbumList('byGenre', 40, offset, props.selectedGenre);
      } else if (props.selectedArtist) {
        const allAlbums = await api.getAlbumList('alphabeticalByName', 500, 0);
        list = allAlbums.filter((a) => a.artist?.toLowerCase() === props.selectedArtist?.toLowerCase());
      } else {
        list = await api.getAlbumList(f, 40, offset);
      }

      if (replace) {
        setAlbums(list);
      } else {
        setAlbums((prev) => [...prev, ...list]);
      }
      setHasMore(list.length >= 40);
    } catch (e) {
      console.error('Failed to load albums', e);
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(() => {
    const f = filter();
    const genre = props.selectedGenre;
    const artist = props.selectedArtist;
    
    // Defer the execution to avoid tracking isLoading() inside fetchAlbums
    setTimeout(() => {
      setPageOffset(0);
      fetchAlbums(f, 0, true);
    }, 0);
  });

  const handleLoadMore = () => {
    if (isLoading() || !hasMore()) return;
    const nextOffset = pageOffset() + 40;
    setPageOffset(nextOffset);
    fetchAlbums(filter(), nextOffset, false);
  };

  return (
    <div class="w-full flex flex-col gap-4 pb-28 pt-2 px-4">
      {/* Category / Active Filter Banner if set */}
      <Show when={props.selectedGenre || props.selectedArtist}>
        <div class="flex items-center justify-between bg-neutral-800/80 border border-white/10 px-4 py-2.5 rounded-2xl">
          <div>
            <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {props.selectedGenre ? 'Genre Filter' : 'Artist Filter'}
            </span>
            <p class="text-base font-bold text-white leading-tight">
              {props.selectedGenre || props.selectedArtist}
            </p>
          </div>
          <Show when={props.onClearFilter}>
            <button
              onClick={props.onClearFilter}
              class="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-bold active:scale-95"
            >
              Clear
            </button>
          </Show>
        </div>
      </Show>

      {/* Single sort label — Apple Music style: quiet text button, opens a context menu */}
      <Show when={!props.selectedGenre && !props.selectedArtist}>
        {(() => {
          const [sortMenuRect, setSortMenuRect] = createSignal<DOMRect | null>(null);
          const sortLabel = () => filter() === 'newest' ? 'Recently Added' : filter() === 'alphabeticalByName' ? 'Alphabetical' : 'Favorites';
          return (
            <div class="flex items-center justify-between px-0.5">
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setSortMenuRect(rect);
                }}
                class="flex items-center gap-1 text-[#fa243c] active:opacity-50 transition-opacity"
              >
                <span class="text-[13px] font-semibold">{sortLabel()}</span>
                <svg class="w-3.5 h-3.5 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <AppleContextMenu
                isOpen={!!sortMenuRect()}
                triggerRect={sortMenuRect()!}
                onClose={() => setSortMenuRect(null)}
                groups={[{
                  items: [
                    { label: 'Recently Added', onClick: () => { setFilter('newest'); setSortMenuRect(null); } },
                    { label: 'Alphabetical',   onClick: () => { setFilter('alphabeticalByName'); setSortMenuRect(null); } },
                    { label: 'Favorites',      onClick: () => { setFilter('starred'); setSortMenuRect(null); } },
                  ]
                }]}
              />
            </div>
          );
        })()}
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <For each={albums()}>
          {(album) => {
            const longPressHandlers = createLongPress(
              (e, targetElement) => {
                const rect = targetElement.getBoundingClientRect();
                setGlobalAlbumMenuTarget({ album, triggerRect: rect });
              },
              () => props.onSelectAlbum(album)
            );
            return (
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
                class="flex flex-col active:scale-95 transition-transform cursor-pointer [-webkit-touch-callout:none]"
                data-context-target="true"
              >
                <div class="aspect-square w-full rounded-2xl bg-neutral-900 overflow-hidden shadow-lg border border-white/10 mb-2 relative pointer-events-none">
                  <Show
                    when={album.coverArt || album.id}
                    fallback={
                      <div class="w-full h-full flex items-center justify-center bg-neutral-800">
                        <MusicNoteIcon class="w-12 h-12 text-neutral-600" />
                      </div>
                    }
                  >
                    <img
                      src={api.getCoverArtUrl(album.coverArt || album.id, 350)}
                      alt={album.title || album.title}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Show>
                  <Show when={activeDownloads().has(album.id) || isAlbumDownloaded(album.id)}>
                    <div class="absolute bottom-2 right-2 flex items-center justify-center pointer-events-none">
                      <Show when={activeDownloads().has(album.id)}>
                        {/* Downloading spinner */}
                        <div class="w-[22px] h-[22px] rounded-full bg-[#1c1c1e]/80 backdrop-blur-md flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                          <DownloadProgressRing 
                            progress={downloadProgress()[album.id] ? downloadProgress()[album.id].current / downloadProgress()[album.id].total : 0} 
                            class="w-3.5 h-3.5 text-[#fa243c]" 
                          />
                        </div>
                      </Show>
                      <Show when={!activeDownloads().has(album.id) && isAlbumDownloaded(album.id)}>
                        {/* Downloaded arrow */}
                        <div class="w-[22px] h-[22px] rounded-full bg-[#1c1c1e]/80 backdrop-blur-md flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                          <svg class="w-3 h-3 text-[#fa243c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
                <p class="text-sm font-bold text-white truncate leading-tight pointer-events-none">
                  {album.title || album.title}
                </p>
                <p class="text-xs font-medium text-neutral-400 truncate mt-0.5 pointer-events-none">
                  {album.artist}
                </p>
                <Show when={album.year}>
                  <p class="text-[10px] text-neutral-500 font-medium pointer-events-none">
                    {album.year}
                  </p>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Loading Indicator */}
      <Show when={isLoading()}>
        <div class="py-6 flex items-center justify-center text-xs font-bold text-neutral-500 animate-pulse">
          Loading Albums...
        </div>
      </Show>

      {/* Load More Button */}
      <Show when={hasMore() && !isLoading() && albums().length > 0}>
        <button
          onClick={handleLoadMore}
          class="w-full py-3 mt-2 bg-neutral-800/60 border border-white/10 rounded-2xl text-xs font-bold text-neutral-300 hover:text-white active:scale-98 transition-transform"
        >
          Load More Albums
        </button>
      </Show>
    </div>
  );
};
