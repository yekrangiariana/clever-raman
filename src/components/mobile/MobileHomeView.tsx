import { Component, createResource, createMemo, For, Show } from 'solid-js';
import { FadeImage } from '../common/FadeImage';
import { api, Album, Playlist, Song, Genre } from '../../services/api';
import { createLongPress } from "../../hooks/useLongPress";
import { setGlobalAlbumMenuTarget } from "../../services/uiState";
import { TopPickCard } from '../common/TopPickCard';
import { MusicNoteIcon } from '../common/Icons';
import { pinnedPlaylistIds } from '../../services/pinnedPlaylists';
import { getScopedKey } from '../../services/profiles';

interface MobileHomeViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectMix: (genre: string, coverVariant?: 'meshMix' | 'genreMix') => void;
  onSelectPlaylist?: (playlist: Playlist, coverVariant?: 'station' | 'meshMix') => void;
}

interface MobileHomeData {
  recentAlbums: Album[];
  starredAlbums: Album[];
  randomAlbums: Album[];
  playlists: Playlist[];
  genres: Genre[];
  fetchError: string;
}

let cachedMobileHomeData: MobileHomeData | null = null;

export const MobileHomeView: Component<MobileHomeViewProps> = (props) => {
  const [homeData, { refetch }] = createResource(async () => {
    let recentAlbums: Album[] = [];
    let starredAlbums: Album[] = [];
    let randomAlbums: Album[] = [];
    let playlists: Playlist[] = [];
    let genres: Genre[] = [];
    let fetchError = '';

    try {
      const [newestRes, starredRes, randomRes, playlistsRes, genresRes] = await Promise.allSettled([
        api.getAlbumList('newest', 20),
        api.getAlbumList('starred', 10),
        api.getAlbumList('random', 20),
        api.getPlaylists(),
        api.getGenres(),
      ]);

      if (newestRes.status === 'fulfilled' && Array.isArray(newestRes.value)) recentAlbums = newestRes.value;
      if (starredRes.status === 'fulfilled' && Array.isArray(starredRes.value)) starredAlbums = starredRes.value;
      if (randomRes.status === 'fulfilled' && Array.isArray(randomRes.value)) randomAlbums = randomRes.value;
      if (playlistsRes.status === 'fulfilled' && Array.isArray(playlistsRes.value)) playlists = playlistsRes.value;
      if (genresRes.status === 'fulfilled' && Array.isArray(genresRes.value)) genres = genresRes.value;

      // Fallback: If newest returned 0 albums, fetch alphabetical albums so user isn't left with an empty screen
      if (recentAlbums.length === 0) {
        try {
          const fallback = await api.getAlbumList('alphabeticalByName', 20);
          if (fallback && Array.isArray(fallback) && fallback.length > 0) recentAlbums = fallback;
        } catch (e) {}
      }

      // If all album lists returned empty and we have no cached data, flag potential network issue
      if (recentAlbums.length === 0 && randomAlbums.length === 0 && playlists.length === 0) {
        fetchError = 'No music returned from server or network unreachable';
      }
      
      // Explicitly capture network failures from the main query
      if (newestRes.status === 'rejected') {
        fetchError = newestRes.reason?.message || 'Network request failed';
      }
    } catch (e: any) {
      console.warn('Home fetch error', e);
      fetchError = e.message || String(e);
    }

    const result: MobileHomeData = {
      recentAlbums,
      starredAlbums,
      randomAlbums,
      playlists,
      genres,
      fetchError,
    };

    if (recentAlbums.length > 0 || playlists.length > 0) {
      cachedMobileHomeData = result;
    }

    return result;
  }, {
    initialValue: cachedMobileHomeData || {
      recentAlbums: api.getCachedAlbumList('newest', 20) || [],
      starredAlbums: api.getCachedAlbumList('starred', 10) || [],
      randomAlbums: api.getCachedAlbumList('random', 20) || [],
      playlists: api.getCachedPlaylists() || [],
      genres: api.getCachedGenres() || [],
      fetchError: ''
    }
  });

  // Dynamic daily Top Picks generated exactly like TV HomeView
  const dailyTopPicks = createMemo(() => {
    const data = homeData();
    if (!data) return [];

    const now = new Date();
    const localDay = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

    const isDailyRandomPlaylist = (name?: string) => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      return (
        lower.includes('daily random') ||
        lower.includes('random discovery') ||
        lower.includes('daily discovery') ||
        lower === 'discovery' ||
        lower.includes('discovery mix')
      );
    };

    const playlistsList = Array.isArray(data.playlists) ? data.playlists : [];
    const randomAlbumsList = Array.isArray(data.randomAlbums) ? data.randomAlbums : [];
    const recentAlbumsList = Array.isArray(data.recentAlbums) ? data.recentAlbums : [];
    const genresList = Array.isArray(data.genres) ? data.genres : [];

    // Slot 1: Daily Discovery (Station pulse circle)
    const discoveryPlaylist = playlistsList.find(
      (p) => p && (p.songCount || 0) > 0 && isDailyRandomPlaylist(p.name)
    );
    const slot1 = {
      variant: 'station' as const,
      title: discoveryPlaylist ? discoveryPlaylist.name : 'Daily Random',
      subtitle: discoveryPlaylist ? `${discoveryPlaylist.songCount} Tracks` : 'Discovery Mix',
      onClick: () => {
        if (discoveryPlaylist && props.onSelectPlaylist) {
          props.onSelectPlaylist(discoveryPlaylist, 'station');
        } else if (randomAlbumsList.length > 0) {
          props.onSelectAlbum(randomAlbumsList[localDay % randomAlbumsList.length]);
        } else {
          props.onSelectMix('Discovery');
        }
      },
    };

    // Slot 2: Album of the Day
    const todayStr = now.toDateString();
    const albumKey = getScopedKey('navios_daily_album');
    const dateKey = getScopedKey('navios_daily_album_date');
    let savedAlbumStr: string | null = null;
    let savedAlbumDate: string | null = null;
    try {
      savedAlbumStr = localStorage.getItem(albumKey);
      savedAlbumDate = localStorage.getItem(dateKey);
    } catch (e) {}

    let randomAlbum: any = null;
    if (savedAlbumDate === todayStr && savedAlbumStr) {
      try { randomAlbum = JSON.parse(savedAlbumStr); } catch(e) {}
    }
    
    if (!randomAlbum && recentAlbumsList.length > 0) {
      const randIdx = Math.floor(Math.random() * recentAlbumsList.length);
      randomAlbum = recentAlbumsList[randIdx];
      try {
        localStorage.setItem(albumKey, JSON.stringify(randomAlbum));
        localStorage.setItem(dateKey, todayStr);
      } catch (e) {}
    }

    const slot2 = randomAlbum
      ? {
          categoryLabel: 'Album of the Day',
          variant: 'album' as const,
          title: randomAlbum.title || 'Featured Album',
          subtitle: randomAlbum.artist || 'Unknown Artist',
          coverArtUrl: api.getCoverArtUrl(randomAlbum.coverArt || randomAlbum.id, 500),
          onClick: () => props.onSelectAlbum(randomAlbum),
        }
      : null;

    // Slot 3: Mesh Mix (Favorites or dynamic mix)
    const slot3 = {
      variant: 'meshMix' as const,
      title: 'Favorites Mix',
      metadata: 'Your starred & most played songs in one dynamic mix',
      onClick: () => props.onSelectMix('Favorites', 'meshMix'),
    };

    // Slot 4: Genre Mix (Rotates daily through top genres)
    const validGenres = genresList.filter((g) => g && (g.songCount || 0) > 4);
    const chosenGenre = validGenres.length > 0 && validGenres[localDay % validGenres.length]?.value
      ? validGenres[localDay % validGenres.length].value
      : 'Chill';
    const slot4 = {
      categoryLabel: 'Genre Station',
      variant: 'genreMix' as const,
      title: `${chosenGenre} Mix`,
      subtitle: `${chosenGenre} Radio`,
      onClick: () => props.onSelectMix(chosenGenre, 'genreMix'),
    };

    type TopPickItem = {
      variant: 'album' | 'station' | 'playlist' | 'meshMix' | 'genreMix';
      title: string;
      subtitle?: string;
      metadata?: string;
      categoryLabel?: string;
      coverArtUrl?: string;
      onClick: () => void;
    };

    return [slot1, slot2, slot3, slot4].filter(Boolean) as TopPickItem[];
  });

  const pinnedPlaylists = createMemo(() => {
    const allPl = Array.isArray(homeData()?.playlists) ? homeData()!.playlists : [];
    const pinned = Array.isArray(pinnedPlaylistIds()) ? pinnedPlaylistIds() : [];
    return pinned
      .map((id) => allPl.find((p) => p && p.id === id))
      .filter(Boolean) as Playlist[];
  });

  return (
    <div class="w-full flex flex-col gap-6 pb-28 pt-3 px-4">
      
      {/* Connection Notice if fetch failed AND we have no cache */}
      <Show when={!homeData()?.recentAlbums?.length && homeData()?.fetchError}>
        <div class="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 flex flex-col gap-2">
          <p class="text-xs font-bold">Could not connect to Navidrome server</p>
          <p class="text-[11px] font-mono text-red-300">{homeData()?.fetchError}</p>
          <div class="flex gap-2 mt-1">
            <button onClick={() => refetch()} class="px-3 py-1 bg-red-800 text-white rounded-lg text-xs font-bold active:scale-95">Retry</button>
          </div>
        </div>
      </Show>

      {/* Top Picks Hero Cards (Reusing TopPickCard in horizontal swipe carousel) */}
      <Show when={dailyTopPicks().length > 0}>
        <div>
          <div class="flex items-center gap-1.5 mb-3">
            <h2 class="text-xl font-black text-white tracking-tight">Top Picks</h2>
          </div>

          <div class="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-4 pl-4 scroll-pl-4 snap-x snap-mandatory after:content-[''] after:w-4 after:shrink-0">
            <For each={dailyTopPicks()}>
              {(pick, idx) => (
                <div class="w-[75vw] sm:w-[clamp(16rem,35vw,24rem)] shrink-0 snap-start active:scale-95 transition-transform">
                  <TopPickCard
                    title={pick.title}
                    subtitle={pick.subtitle}
                    metadata={pick.metadata}
                    categoryLabel={pick.categoryLabel}
                    variant={pick.variant}
                    coverArtUrl={pick.coverArtUrl}
                    section="mobileTopPicks"
                    index={idx()}
                    onClick={pick.onClick}
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Favorites Carousel (Apple Music Style 'Heavy Rotation') */}
      <Show when={homeData()?.starredAlbums && homeData()?.starredAlbums!.length > 0}>
        <div class="w-full flex flex-col pt-2 pb-2">
          <h2 class="text-xl font-black text-white mb-3 tracking-tight">Favorites</h2>
          <div class="flex overflow-x-auto gap-4 pb-4 -mx-4 pl-4 scroll-pl-4 snap-x snap-mandatory scrollbar-none [-webkit-overflow-scrolling-touch] after:content-[''] after:w-4 after:shrink-0">
            <For each={homeData()?.starredAlbums}>
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
                    class="w-36 sm:w-[clamp(9rem,20vw,14rem)] shrink-0 active:scale-95 transition-transform snap-start cursor-pointer [-webkit-touch-callout:none]"
                    data-context-target="true"
                  >
                    <div class="w-36 h-36 sm:w-full sm:h-auto sm:aspect-square rounded-2xl bg-neutral-800 overflow-hidden shadow-lg border border-white/5 mb-2 pointer-events-none relative">
                      <FadeImage src={api.getCoverArtUrl(album.coverArt || album.id, 500)}
                        alt={album.title || album.title}
                        class="w-full h-full "
                        loading="lazy"
                      />
                    </div>
                    <p class="text-sm font-bold text-white truncate leading-tight pointer-events-none">
                      {album.title || album.title}
                    </p>
                    <p class="text-xs font-medium text-neutral-400 truncate mt-0.5 pointer-events-none">
                      {album.artist}
                    </p>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Pinned Playlists Carousel (after Favorites) */}
      <Show when={pinnedPlaylists().length > 0}>
        <div class="w-full flex flex-col pt-2 pb-2">
          <h2 class="text-xl font-black text-white mb-3 tracking-tight">Pinned Playlists</h2>
          <div class="flex overflow-x-auto gap-4 pb-4 -mx-4 pl-4 scroll-pl-4 snap-x snap-mandatory scrollbar-none [-webkit-overflow-scrolling-touch] after:content-[''] after:w-4 after:shrink-0">
            <For each={pinnedPlaylists()}>
              {(pl) => (
                <div
                  onClick={() => props.onSelectPlaylist?.(pl)}
                  class="w-36 sm:w-[clamp(9rem,20vw,14rem)] shrink-0 active:scale-95 transition-transform snap-start cursor-pointer [-webkit-touch-callout:none]"
                >
                  <div class="w-36 h-36 sm:w-full sm:h-auto sm:aspect-square rounded-2xl bg-neutral-800 overflow-hidden shadow-lg border border-white/5 mb-2 pointer-events-none relative flex items-center justify-center">
                    <FadeImage
                      src={api.getCustomPlaylistCover(pl.id) || api.getCoverArtUrl(pl.coverArt || pl.id, 300)}
                      alt={pl.name}
                      class="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <p class="text-sm font-bold text-white truncate leading-tight pointer-events-none">
                    {pl.name}
                  </p>
                  <p class="text-xs font-medium text-neutral-400 truncate mt-0.5 pointer-events-none">
                    {pl.songCount || 0} tracks
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Recently Added Grid (Apple Music Style standard grid) */}
      <Show when={homeData()?.recentAlbums && homeData()?.recentAlbums!.length > 0}>
        <div class="w-full flex flex-col pt-2 pb-28">
          <h2 class="text-xl font-black text-white mb-3 tracking-tight">Recently Added</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <For each={homeData()?.recentAlbums}>
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
                    <div class="aspect-square w-full rounded-2xl bg-neutral-800 overflow-hidden shadow-lg border border-white/5 mb-2 pointer-events-none relative">
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
        </div>
      </Show>

      {/* Loading Skeleton if initial data is loading and no cache exists */}
      <Show when={homeData.loading && !homeData()?.recentAlbums?.length}>
        <div class="w-full flex flex-col pt-2 pb-28 animate-pulse">
          <div class="h-6 w-36 bg-white/10 rounded mb-4" />
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <For each={[1, 2, 3, 4, 5, 6]}>
              {() => (
                <div class="flex flex-col">
                  <div class="aspect-square w-full rounded-2xl bg-white/5 mb-2" />
                  <div class="h-4 w-3/4 bg-white/10 rounded mb-1" />
                  <div class="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

    </div>
  );
};
