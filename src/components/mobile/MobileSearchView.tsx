import { Component, createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { api, Album, Song, SearchResult } from '../../services/api';
import { audioPlayer } from '../../services/audio';
import { SearchIcon, CloseIcon, PlayIcon, MusicNoteIcon } from '../common/Icons';

interface MobileSearchViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectGenre: (genre: string) => void;
}

export const MobileSearchView: Component<MobileSearchViewProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [debouncedQuery, setDebouncedQuery] = createSignal('');
  const [isSearching, setIsSearching] = createSignal(false);
  const [results, setResults] = createSignal<SearchResult | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const handleInputChange = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    setQuery(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!val.trim()) {
      setDebouncedQuery('');
      setResults(null);
      return;
    }
    debounceTimer = setTimeout(() => {
      setDebouncedQuery(val.trim());
    }, 300);
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults(null);
  };

  createEffect(async () => {
    const q = debouncedQuery();
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await api.search3(q);
      setResults(res);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setIsSearching(false);
    }
  });

  const [genres] = createResource(async () => {
    try {
      const list = await api.getGenres();
      return list.filter((g) => g.songCount > 0);
    } catch (e) {
      return [];
    }
  });

  return (
    <div class="w-full flex flex-col gap-5 pb-28 pt-2 px-4">
      {/* iOS Style Search Input Bar */}
      <div class="relative w-full">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <SearchIcon class="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query()}
          onInput={handleInputChange}
          placeholder="Artists, Songs, Lyrics, and More"
          class="w-full h-11 pl-11 pr-10 bg-neutral-800/90 border border-white/10 rounded-2xl text-sm font-semibold text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#fa243c] focus:ring-1 focus:ring-[#fa243c] transition-all"
        />
        <Show when={query()}>
          <button
            onClick={handleClear}
            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white"
          >
            <CloseIcon class="w-5 h-5" />
          </button>
        </Show>
      </div>

      {/* Loading Indicator */}
      <Show when={isSearching()}>
        <div class="py-6 flex items-center justify-center text-xs font-bold text-neutral-500 animate-pulse">
          Searching Navidrome...
        </div>
      </Show>

      {/* When Empty: Apple Music Browse Categories & Genres */}
      <Show when={!query()}>
        <div>
          <h2 class="text-xl font-black text-white tracking-tight mb-3">
            Browse Categories
          </h2>

          <div class="grid grid-cols-2 gap-3">
            <For each={genres()}>
              {(g) => (
                <div
                  onClick={() => props.onSelectGenre(g.value)}
                  class="h-24 rounded-2xl p-3.5 flex flex-col justify-between bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 shadow-lg active:scale-95 transition-transform cursor-pointer relative overflow-hidden"
                >
                  <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-[#fa243c]/15 rounded-full blur-lg pointer-events-none" />
                  <span class="text-sm font-black text-white leading-tight">
                    {g.value}
                  </span>
                  <span class="text-[10px] font-bold text-neutral-400">
                    {g.songCount} {g.songCount === 1 ? 'Track' : 'Tracks'}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Search Results Display */}
      <Show when={results() && !isSearching()}>
        
        {/* Songs Results */}
        <Show when={results()!.songs && results()!.songs.length > 0}>
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-widest text-[#fa243c] mb-2">
              Songs
            </h3>
            <div class="flex flex-col divide-y divide-white/5 border border-white/10 rounded-2xl bg-neutral-900/60 overflow-hidden">
              <For each={results()!.songs.slice(0, 8)}>
                {(song: Song) => (
                  <div
                    onClick={() => audioPlayer.playTrack(song)}
                    class="flex items-center justify-between p-3 active:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-white/5">
                        <img
                          src={api.getSongCoverArtUrl(song, 120)}
                          alt={song.title}
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-bold text-white truncate leading-tight">
                          {song.title}
                        </p>
                        <p class="text-xs font-medium text-neutral-400 truncate mt-0.5">
                          {song.artist} • {song.album}
                        </p>
                      </div>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 ml-2">
                      <PlayIcon class="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Albums Results */}
        <Show when={results()!.albums && results()!.albums.length > 0}>
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-widest text-[#fa243c] mb-2">
              Albums
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <For each={results()!.albums.slice(0, 10)}>
                {(album: Album) => (
                  <div
                    onClick={() => props.onSelectAlbum(album)}
                    class="flex flex-col active:scale-95 transition-transform cursor-pointer"
                  >
                    <div class="aspect-square w-full rounded-2xl bg-neutral-900 overflow-hidden shadow-lg border border-white/10 mb-2">
                      <img
                        src={api.getCoverArtUrl(album.coverArt || album.id, 350)}
                        alt={album.title || album.name}
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <p class="text-sm font-bold text-white truncate leading-tight">
                      {album.title || album.name}
                    </p>
                    <p class="text-xs font-medium text-neutral-400 truncate mt-0.5">
                      {album.artist}
                    </p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* No Results Fallback */}
        <Show when={results()!.songs.length === 0 && results()!.albums.length === 0}>
          <div class="py-12 flex flex-col items-center justify-center text-center">
            <SearchIcon class="w-12 h-12 text-neutral-600 mb-2" />
            <h3 class="text-base font-bold text-white">No Results for "{query()}"</h3>
            <p class="text-xs text-neutral-400 mt-1">
              Check the spelling or try searching by artist, album, or song title.
            </p>
          </div>
        </Show>

      </Show>

    </div>
  );
};
