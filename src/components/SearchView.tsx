import { Component, For, createSignal, createResource, onCleanup } from 'solid-js';
import { api, Album, Song, Genre } from '../services/api';
import { audioPlayer } from '../services/audio';
import { focusEngine } from '../services/focus';
import { AlbumCard } from './common/AlbumCard';
import { SongRow } from './common/SongRow';
import { SearchIcon, ChevronRightIcon, BackspaceIcon } from './common/Icons';

interface SearchViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectGenre?: (genre: string) => void;
  onSelectArtist?: (artist: string) => void;
}

let cachedGenres: Genre[] | null = null;
let cachedArtists: string[] | null = null;

export function clearSearchCache() {
  cachedGenres = null;
  cachedArtists = null;
}

export const SearchView: Component<SearchViewProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal<string>('');
  const [debouncedQuery, setDebouncedQuery] = createSignal<string>('');
  const [activeKbdTab, setActiveKbdTab] = createSignal<'abc' | '123'>('abc');
  const [browseTab, setBrowseTab] = createSignal<'genres' | 'artists'>('genres');

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  function queueSearch(query: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      return;
    }
    debounceTimer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 350);
  }

  const abcRows = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['g', 'h', 'i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p', 'q', 'r'],
    ['s', 't', 'u', 'v', 'w', 'x'],
  ];

  const numRows = [
    ['1', '2', '3', '4', '5', '6'],
    ['7', '8', '9', '0', '-', '_'],
    ['.', ',', '?', '!', '@', '#'],
    ['/', '&', "'", '"', '(', ')'],
  ];

  // Fetch real genres for browse state
  const [genres] = createResource(async () => {
    if (cachedGenres) return cachedGenres;
    try {
      cachedGenres = await api.getGenres();
      return cachedGenres;
    } catch (e) {
      return [];
    }
  });

  // Fetch real artists list from albums for browse state
  const [artists] = createResource(async () => {
    if (cachedArtists) return cachedArtists;
    try {
      const albums = await api.getAlbumList('alphabeticalByName', 500, 0);
      const set = new Set<string>();
      albums.forEach((a) => {
        if (a.artist) set.add(a.artist);
      });
      cachedArtists = Array.from(set).sort((a, b) => a.localeCompare(b));
      return cachedArtists;
    } catch (e) {
      return [];
    }
  });

  // Fetch live search results via search3.view with fallback (debounced)
  const [searchResults] = createResource(debouncedQuery, async (query) => {
    if (!query || query.trim().length === 0) return null;
    try {
      return await api.search3(query);
    } catch (e) {
      return { albums: [], songs: [], artists: [] };
    }
  });

  function handleKeyPress(char: string) {
    setSearchQuery((prev) => {
      const next = prev + char;
      queueSearch(next);
      return next;
    });
  }

  function handleBackspace() {
    setSearchQuery((prev) => {
      const next = prev.slice(0, -1);
      queueSearch(next);
      return next;
    });
  }

  function handleClear() {
    if (debounceTimer) clearTimeout(debounceTimer);
    setSearchQuery('');
    setDebouncedQuery('');
  }

  function handlePlaySong(song: Song) {
    audioPlayer.playTrack(song, [song], 0);
    focusEngine.setActiveModal('nowPlaying');
    focusEngine.setFocus('nowPlaying', 2);
  }

  async function handleToggleStar(song: Song, e: Event) {
    e.stopPropagation();
    const isCurrentlyStarred = !!song.starred;
    const nextState = !isCurrentlyStarred;
    song.starred = nextState ? new Date().toISOString() : undefined;
    if (nextState) {
      await api.star(song.id, false);
    } else {
      await api.unstar(song.id, false);
    }
  }

  return (
    <div class="flex-1 w-full pt-4 px-16 pb-6 flex flex-col gap-6 z-10 h-[calc(100vh-100px)] overflow-hidden">
      {/* Search Header Bar */}
      <div class="flex items-center gap-4 text-5xl font-extrabold text-white border-b border-neutral-800 pb-4 shrink-0">
        <SearchIcon class="w-12 h-12 text-neutral-400" />
        <span class="truncate">{searchQuery() || 'Search Albums, Songs, Artists...'}</span>
      </div>

      {/* Content Split Stage */}
      <div class="flex gap-16 flex-1 min-h-0 overflow-hidden">
        {/* Left Stage: Keyboard Grid (Fixed & Non-scrolling) */}
        <div class="w-[450px] flex flex-col gap-6 shrink-0 select-none overflow-hidden">
          {/* Keyboard Mode Switcher: abc vs 123 */}
          <div class="flex rounded-2xl bg-neutral-900 border border-neutral-800 p-1.5 gap-2">
            <button
              onClick={() => setActiveKbdTab('abc')}
              class={`flex-1 py-3 rounded-xl text-xl font-bold transition-all ${
                activeKbdTab() === 'abc' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
              data-focusable="true"
              data-section="search_mode"
              data-index={0}
            >
              abc
            </button>
            <button
              onClick={() => setActiveKbdTab('123')}
              class={`flex-1 py-3 rounded-xl text-xl font-bold transition-all ${
                activeKbdTab() === '123' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
              data-focusable="true"
              data-section="search_mode"
              data-index={1}
            >
              123
            </button>
          </div>

          {/* Key Matrix: 5 Rows x 6 Columns */}
          <div class="flex flex-col gap-3">
            <For each={activeKbdTab() === 'abc' ? abcRows : numRows}>
              {(row, rowIndex) => (
                <div class="flex gap-3">
                  <For each={row}>
                    {(char, colIndex) => {
                      const idx = rowIndex() * 6 + colIndex();
                      return (
                        <button
                          onClick={() => handleKeyPress(char)}
                          class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-2xl font-bold text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                          data-focusable="true"
                          data-section="search_kbd"
                          data-index={idx}
                        >
                          {char}
                        </button>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>

            {/* Row 4: Letters + Action controls spanning exactly 6 columns */}
            <div class="flex gap-3">
              <button
                onClick={() => handleKeyPress(activeKbdTab() === 'abc' ? 'y' : '+')}
                class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-2xl font-bold text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                data-focusable="true"
                data-section="search_kbd"
                data-index={24}
              >
                {activeKbdTab() === 'abc' ? 'y' : '+'}
              </button>
              <button
                onClick={() => handleKeyPress(activeKbdTab() === 'abc' ? 'z' : '=')}
                class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-2xl font-bold text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                data-focusable="true"
                data-section="search_kbd"
                data-index={25}
              >
                {activeKbdTab() === 'abc' ? 'z' : '='}
              </button>
              <button
                onClick={() => handleKeyPress(' ')}
                class="w-[140px] h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-xl font-bold text-neutral-300 hover:text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                data-focusable="true"
                data-section="search_kbd"
                data-index={26}
                title="Space"
              >
                SPACE
              </button>
              <button
                onClick={handleBackspace}
                class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-xl font-bold text-neutral-300 hover:text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                data-focusable="true"
                data-section="search_kbd"
                data-index={27}
                title="Backspace"
              >
                <BackspaceIcon class="w-7 h-7" />
              </button>
              <button
                onClick={handleClear}
                class="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-base font-bold text-neutral-300 hover:text-white flex items-center justify-center hover:bg-neutral-700 transition-all"
                data-focusable="true"
                data-section="search_kbd"
                data-index={28}
                title="Clear"
              >
                CLR
              </button>
            </div>
          </div>
        </div>

        {/* Right Stage: Search Results OR Browse Genres/Artists */}
        <div class="flex-1 flex flex-col gap-6 overflow-y-auto px-12 py-8 -mx-12 -my-6 min-h-0">
          {searchQuery() ? (
            <>
              <h2 class="text-3xl font-extrabold text-white">Search Results</h2>
              {searchResults.loading && (
                <div class="text-2xl text-neutral-400 animate-pulse font-bold">Searching library...</div>
              )}
              {searchResults() && (
                <div class="flex flex-col gap-8 pb-12">
                  {/* Albums Section */}
                  {searchResults()!.albums.length > 0 && (
                    <div class="flex flex-col gap-4">
                      <h3 class="text-2xl font-bold text-neutral-300">Albums</h3>
                      <div class="grid grid-cols-3 gap-8">
                        <For each={searchResults()!.albums}>
                          {(album, index) => (
                            <AlbumCard
                              album={album}
                              variant="standard"
                              section="search_results"
                              index={index()}
                              onClick={props.onSelectAlbum}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  )}

                  {/* Songs Section */}
                  {searchResults()!.songs.length > 0 && (
                    <div class="flex flex-col gap-4">
                      <h3 class="text-2xl font-bold text-neutral-300">Songs</h3>
                      <div class="flex flex-col gap-3">
                        <For each={searchResults()!.songs}>
                          {(song, index) => (
                            <SongRow
                              song={song}
                              index={index()}
                              section="search_results"
                              focusIndex={searchResults()!.albums.length + index()}
                              onPlay={handlePlaySong}
                              onToggleStar={handleToggleStar}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                  )}

                  {searchResults()!.albums.length === 0 && searchResults()!.songs.length === 0 && (
                    <div class="text-2xl text-neutral-400 font-medium">No results found for "{searchQuery()}"</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Browse Selector Header: Genres | Artists */}
              <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div class="flex items-center gap-4">
                  <button
                    onClick={() => setBrowseTab('genres')}
                    class={`px-6 py-2.5 rounded-full text-xl font-bold transition-all ${
                      browseTab() === 'genres'
                        ? 'bg-white text-black font-extrabold shadow-lg scale-105'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    data-focusable="true"
                    data-section="search_tabs"
                    data-index={0}
                  >
                    Browse Genres
                  </button>
                  <button
                    onClick={() => setBrowseTab('artists')}
                    class={`px-6 py-2.5 rounded-full text-xl font-bold transition-all ${
                      browseTab() === 'artists'
                        ? 'bg-white text-black font-extrabold shadow-lg scale-105'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    data-focusable="true"
                    data-section="search_tabs"
                    data-index={1}
                  >
                    Browse Artists
                  </button>
                </div>
              </div>

              {/* Browse Genres View */}
              {browseTab() === 'genres' && (
                <>
                  {genres.loading && (
                    <div class="text-2xl text-neutral-400 animate-pulse font-bold">Loading genre tags...</div>
                  )}
                  {genres() && (
                    <div class="grid grid-cols-3 gap-6 pb-12 py-6 px-4 -my-4 -mx-2">
                      <For each={genres()}>
                        {(genre, index) => (
                          <div
                            onClick={() => props.onSelectGenre?.(genre.value)}
                            class="h-36 rounded-3xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between cursor-pointer hover:bg-neutral-800/80 shadow-xl"
                            data-focusable="true"
                            data-section="search_results"
                            data-index={index()}
                          >
                            <span class="text-3xl font-black text-white truncate">{genre.value}</span>
                            <span class="text-xl font-bold text-neutral-400">
                              {genre.albumCount ? `${genre.albumCount} Albums` : `${genre.songCount} Tracks`}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </>
              )}

              {/* Browse Artists View */}
              {browseTab() === 'artists' && (
                <>
                  {artists.loading && (
                    <div class="text-2xl text-neutral-400 animate-pulse font-bold">Loading artists...</div>
                  )}
                  {artists() && (
                    <div class="grid grid-cols-3 gap-6 pb-12 py-6 px-4 -my-4 -mx-2">
                      <For each={artists()}>
                        {(artistName, index) => (
                          <div
                            onClick={() => props.onSelectArtist?.(artistName)}
                            class="h-28 rounded-3xl bg-neutral-900 border border-neutral-800 px-8 py-6 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 shadow-xl"
                            data-focusable="true"
                            data-section="search_results"
                            data-index={index()}
                          >
                            <span class="text-3xl font-black text-white truncate">{artistName}</span>
                            <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
