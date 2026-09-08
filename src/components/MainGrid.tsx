import { Component, For, Show, createResource, createEffect, createSignal } from 'solid-js';
import { api, Album } from '../services/api';
import { focusEngine } from '../services/focus';
import { AlbumCard } from './common/AlbumCard';
import { ArrowLeftIcon } from './common/Icons';

export type AlbumSortFilter = 'alphabeticalByName' | 'starred' | 'newest';

const filterOptions: { id: AlbumSortFilter; label: string }[] = [
  { id: 'alphabeticalByName', label: 'Alphabetical' },
  { id: 'starred', label: 'Favourites' },
  { id: 'newest', label: 'Recently Added' },
];

interface MainGridProps {
  onSelectAlbum: (album: Album) => void;
  selectedGenre?: string | null;
  selectedArtist?: string | null;
  onClearFilter?: () => void;
}

const albumCache = new Map<string, Album[]>();

export function clearAlbumCache() {
  albumCache.clear();
}

// Keep cache small to prevent memory leaks on TVs
function setAlbumCache(key: string, list: Album[]) {
  if (albumCache.size >= 8) {
    const firstKey = albumCache.keys().next().value;
    if (firstKey) albumCache.delete(firstKey);
  }
  albumCache.set(key, list);
}

export async function prefetchAlbums(): Promise<void> {
  if (!api.isConfigured()) return;
  const cacheKey = 'all_alphabeticalByName_500';
  if (albumCache.has(cacheKey) && albumCache.get(cacheKey)!.length > 0) return;

  try {
    const list = await api.getAlbumList('alphabeticalByName', 500, 0);
    if (list && list.length > 0) {
      setAlbumCache(cacheKey, list);
    }
  } catch (e) {
    console.warn('Background album prefetch failed', e);
  }
}

export const MainGrid: Component<MainGridProps> = (props) => {
  const [currentFilter, setCurrentFilter] = createSignal<AlbumSortFilter>('alphabeticalByName');

  const resourceSource = () => ({
    tab: focusEngine.activeTab(),
    configured: api.isConfigured(),
    configKey: api.getConfig()?.serverUrl || '',
    genre: props.selectedGenre || '',
    artist: props.selectedArtist || '',
    filter: currentFilter(),
  });

  const [albums] = createResource(resourceSource, async ({ configured, genre, artist, filter }) => {
    if (!configured || !api.isConfigured()) return [];

    let type: 'alphabeticalByName' | 'byGenre' | 'starred' | 'newest' = 'alphabeticalByName';
    if (genre) {
      type = 'byGenre';
    } else {
      type = filter;
    }

    const cacheKey = `${genre || 'all'}_${type}_500`;
    let list: Album[] = [];

    if (albumCache.has(cacheKey) && albumCache.get(cacheKey)!.length > 0) {
      list = albumCache.get(cacheKey)!;
    } else {
      list = await api.getAlbumList(type, 500, 0, genre || undefined);
      if (list && list.length > 0) setAlbumCache(cacheKey, list);
    }

    if (artist) {
      list = list.filter((a) => a.artist === artist);
    }

    return list;
  });

  createEffect(() => {
    focusEngine.setGridColumns(5);
  });

  const isFiltered = () => !!(props.selectedArtist || props.selectedGenre);

  return (
    <main
      class="flex-1 pt-4 px-16 pb-64 z-10 w-full flex flex-col gap-8"
      onWheel={(e) => {
        e.currentTarget.scrollTop += e.deltaY;
      }}
    >
      {/* Header section */}
      <div class="flex flex-col gap-4">
        {/* Back Button matching AlbumDetailView style when filtered */}
        <Show when={isFiltered()}>
          <div class="flex items-center gap-4">
            <button
              onClick={props.onClearFilter}
              class="px-6 py-3 rounded-full bg-neutral-900 border border-neutral-800 text-white font-extrabold text-xl flex items-center gap-3 hover:bg-neutral-800 w-fit"
              data-focusable="true"
              data-section="grid"
              data-index="0"
            >
              <ArrowLeftIcon class="w-6 h-6" />
              All Albums
            </button>
          </div>
        </Show>

        <h1 class="text-6xl font-black text-white tracking-tight">
          {props.selectedArtist
            ? props.selectedArtist
            : props.selectedGenre
            ? `${props.selectedGenre} Albums`
            : 'Albums'}
        </h1>

        {/* Filter Bar (Alphabetical, Favourites, Recently Added, Release Date) */}
        <Show when={!isFiltered()}>
          <div class="flex items-center gap-4 pt-1">
            <For each={filterOptions}>
              {(opt, index) => {
                const isSelected = () => currentFilter() === opt.id;
                return (
                  <button
                    onClick={() => {
                      setCurrentFilter(opt.id);
                      focusEngine.setFocus('albumFilters', index());
                    }}
                    class={`px-7 py-3 rounded-full text-xl font-bold transition-all ${
                      isSelected()
                        ? 'bg-white text-black font-extrabold shadow-lg scale-105'
                        : 'bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
                    }`}
                    data-focusable="true"
                    data-variant="topPick"
                    data-section="albumFilters"
                    data-index={index()}
                  >
                    {opt.label}
                  </button>
                );
              }}
            </For>
          </div>
        </Show>

        <Show when={isFiltered()}>
          <p class="text-2xl text-neutral-400 font-semibold">
            {albums()?.length || 0} {albums()?.length === 1 ? 'album' : 'albums'} found
          </p>
        </Show>
      </div>

      {albums.loading && !albums()?.length && (
        <div class="flex items-center justify-center h-64">
          <div class="text-3xl text-neutral-400 animate-pulse font-bold">Loading music library...</div>
        </div>
      )}

      {albums.error && (
        <div class="p-10 rounded-3xl bg-red-950/60 border border-red-800 text-red-200 text-3xl font-bold">
          Error loading albums: {String(albums.error)}
        </div>
      )}

      {!albums.loading && albums()?.length === 0 && (
        <div class="flex items-center justify-center h-64 text-neutral-400 text-3xl font-semibold">
          No albums found.
        </div>
      )}

      {albums() && albums()!.length > 0 && (
        <div class="grid grid-cols-5 gap-10 pb-24">
          <For each={albums()}>
            {(album, index) => (
              <AlbumCard
                album={album}
                variant="standard"
                section="grid"
                index={isFiltered() ? index() + 1 : index()}
                onClick={props.onSelectAlbum}
              />
            )}
          </For>
        </div>
      )}
    </main>
  );
};
