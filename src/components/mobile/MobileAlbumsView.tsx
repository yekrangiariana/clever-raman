import { Component, createEffect, createSignal, For, Show } from 'solid-js';
import { api, Album } from '../../services/api';
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
        list = await api.getAlbumListByGenre(props.selectedGenre, 40, offset);
      } else if (props.selectedArtist) {
        const res = await api.getMusicDirectory(props.selectedArtist);
        list = res?.album || [];
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

      {/* Sort Filter Selector Pills (Apple Music Style) */}
      <Show when={!props.selectedGenre && !props.selectedArtist}>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilter('newest')}
            class={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter() === 'newest'
                ? 'bg-[#fa243c] text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            Recently Added
          </button>
          <button
            onClick={() => setFilter('alphabeticalByName')}
            class={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter() === 'alphabeticalByName'
                ? 'bg-[#fa243c] text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            Alphabetical
          </button>
          <button
            onClick={() => setFilter('starred')}
            class={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
              filter() === 'starred'
                ? 'bg-[#fa243c] text-white shadow-md'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            Favorites
          </button>
        </div>
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <For each={albums()}>
          {(album) => (
            <div
              onClick={() => props.onSelectAlbum(album)}
              class="flex flex-col active:scale-95 transition-transform cursor-pointer"
            >
              <div class="aspect-square w-full rounded-2xl bg-neutral-900 overflow-hidden shadow-lg border border-white/10 mb-2 relative">
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
                    alt={album.title || album.name}
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Show>
              </div>
              <p class="text-sm font-bold text-white truncate leading-tight">
                {album.title || album.name}
              </p>
              <p class="text-xs font-medium text-neutral-400 truncate mt-0.5">
                {album.artist}
              </p>
              <Show when={album.year}>
                <p class="text-[10px] text-neutral-500 font-medium">
                  {album.year}
                </p>
              </Show>
            </div>
          )}
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
