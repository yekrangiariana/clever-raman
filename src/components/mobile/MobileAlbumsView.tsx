import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { FadeImage } from '../common/FadeImage';
import { api, Album } from '../../services/api';
import { createLongPress } from "../../hooks/useLongPress";
import { setGlobalAlbumMenuTarget } from "../../services/uiState";
import { AppleContextMenu } from './AppleContextMenu';
import { MusicNoteIcon } from '../common/Icons';

export type MobileAlbumFilter = 'newest' | 'alphabeticalByName' | 'starred';

interface MobileAlbumsViewProps {
  onSelectAlbum: (album: Album) => void;
  selectedGenre?: string | null;
  selectedArtist?: string | null;
  onClearFilter?: () => void;
}

export const MobileAlbumsView: Component<MobileAlbumsViewProps> = (props) => {
  const [filter, setFilter] = createSignal<MobileAlbumFilter>('newest');
  const [albums, setAlbums] = createSignal<Album[]>(api.getCachedAlbumList('newest', 40));
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
      if (replace) setAlbums([]);
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

  const loadMore = () => {
    if (!hasMore() || isLoading()) return;
    const nextOffset = pageOffset() + 40;
    setPageOffset(nextOffset);
    fetchAlbums(filter(), nextOffset, false);
  };

  return (
    <div class="w-full flex flex-col gap-4 pb-28 pt-2 px-4">

      {/* Sort / filter controls */}
      <Show when={props.selectedGenre || props.selectedArtist}>
        <div class="flex items-center justify-between mb-2">
          <div class="text-xl font-black text-white tracking-tight">
            {props.selectedGenre ? `Genre: ${props.selectedGenre}` : `Artist: ${props.selectedArtist}`}
          </div>
          <button 
            onClick={() => props.onClearFilter?.()}
            class="text-sm font-bold text-[#fa243c] active:opacity-50"
          >
            Clear
          </button>
        </div>
      </Show>

      <Show when={!props.selectedGenre && !props.selectedArtist && albums().length > 0}>
        {(() => {
          const [sortMenuRect, setSortMenuRect] = createSignal<DOMRect | null>(null);
          const sortLabel = () => {
            switch(filter()) {
              case 'newest': return 'Recently Added';
              case 'alphabeticalByName': return 'Alphabetical';
              case 'starred': return 'Starred';
            }
          };
          return (
            <div class="flex items-center justify-between h-10 px-0.5">
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setSortMenuRect(rect);
                }}
                class="flex items-center gap-1 text-[#fa243c] active:opacity-50 transition-opacity"
              >
                <span class="text-sm font-bold tracking-tight">Sort by {sortLabel()}</span>
                <svg class="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <Show when={sortMenuRect()}>
                <AppleContextMenu
                  isOpen={Boolean(sortMenuRect())}
                  triggerRect={sortMenuRect()!}
                  onClose={() => setSortMenuRect(null)}
                  groups={[
                    {
                      items: [
                        { label: 'Recently Added', onClick: () => { setFilter('newest'); setSortMenuRect(null); }, icon: <></> },
                        { label: 'Alphabetical', onClick: () => { setFilter('alphabeticalByName'); setSortMenuRect(null); }, icon: <></> },
                        { label: 'Starred', onClick: () => { setFilter('starred'); setSortMenuRect(null); }, icon: <></> }
                      ]
                    }
                  ]}
                />
              </Show>
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
                    <FadeImage src={api.getCoverArtUrl(album.coverArt || album.id, 500)}
                      alt={album.title || album.title}
                      class="w-full h-full "
                      loading="lazy"
                    />
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
          onClick={loadMore}
          class="w-full py-3 mt-2 bg-neutral-800/60 border border-white/10 rounded-2xl text-xs font-bold text-neutral-300 hover:text-white active:scale-98 transition-transform"
        >
          Load More Albums
        </button>
      </Show>
    </div>
  );
};
