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

      if (newestRes.status === 'fulfilled') recentAlbums = newestRes.value;
      if (starredRes.status === 'fulfilled') starredAlbums = starredRes.value;
      if (randomRes.status === 'fulfilled') randomAlbums = randomRes.value;
      if (playlistsRes.status === 'fulfilled') playlists = playlistsRes.value;
      if (genresRes.status === 'fulfilled') genres = genresRes.value;
      
      // Explicitly capture network failures from the main query
      if (newestRes.status === 'rejected') {
        fetchError = newestRes.reason?.message || 'Network request failed';
      }
    } catch (e: any) {
      console.warn('Home fetch error', e);
      fetchError = e.message || String(e);
    }

    return {
      recentAlbums,
      starredAlbums,
      randomAlbums,
      playlists,
      genres,
      fetchError,
    };
  }, {
    initialValue: {
      recentAlbums: api.getCachedAlbumList('newest', 20),
      starredAlbums: api.getCachedAlbumList('starred', 10),
      randomAlbums: api.getCachedAlbumList('random', 20),
      playlists: api.getCachedPlaylists(),
      genres: api.getCachedGenres(),
      fetchError: ''
    }
  });

  // Dynamic daily Top Picks generated exactly like TV HomeView
  const dailyTopPicks = createMemo(() => {
    const data = homeData();
    if (!data) return [];

    const now = new Date();
    const localDay = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

    const isDailyRandomPlaylist = (name: string) => {
      const lower = name.toLowerCase().trim();
      return (
        lower.includes('daily random') ||
        lower.includes('random discovery') ||
        lower.includes('daily discovery') ||
        lower === 'discovery' ||
        lower.includes('discovery mix')
      );
    };

    // Slot 1: Daily Discovery (Station pulse circle)
    const discoveryPlaylist = data.playlists.find(
      (p) => (p.songCount || 0) > 0 && isDailyRandomPlaylist(p.name)
    );
    const slot1 = {
      variant: 'station' as const,
      title: discoveryPlaylist ? discoveryPlaylist.name : 'Daily Random',
      subtitle: discoveryPlaylist ? `${discoveryPlaylist.songCount} Tracks` : 'Discovery Mix',
      onClick: () => {
        if (discoveryPlaylist && props.onSelectPlaylist) {
          props.onSelectPlaylist(discoveryPlaylist, 'station');
        } else if (data.randomAlbums.length > 0) {
          props.onSelectAlbum(data.randomAlbums[localDay % data.randomAlbums.length]);
        } else {
          props.onSelectMix('Discovery');
        }
      },
    };

    // Slot 2: Album of the Day
    const todayStr = now.toDateString();
    const albumKey = getScopedKey('navios_daily_album');
    const dateKey = getScopedKey('navios_daily_album_date');
    let savedAlbumStr = localStorage.getItem(albumKey);
    let savedAlbumDate = localStorage.getItem(dateKey);
    let randomAlbum: any = null;
    
    if (savedAlbumDate === todayStr && savedAlbumStr) {
      try { randomAlbum = JSON.parse(savedAlbumStr); } catch(e) {}
    }
    
    if (!randomAlbum && data.recentAlbums && data.recentAlbums.length > 0) {
      // Pick a random recent album as album of the day
      const randIdx = Math.floor(Math.random() * data.recentAlbums.length);
      randomAlbum = data.recentAlbums[randIdx];
      localStorage.setItem(albumKey, JSON.stringify(randomAlbum));
      localStorage.setItem(dateKey, todayStr);
    }

    const slot2 = randomAlbum
      ? {
          categoryLabel: 'Album of the Day',
          variant: 'album' as const,
          title: randomAlbum.title,
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
    const validGenres = data.genres.filter((g) => g.songCount > 4);
    const chosenGenre = validGenres.length > 0 ? validGenres[localDay % validGenres.length].value : 'Chill';
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
    const allPl = homeData()?.playlists || [];
    const pinned = pinnedPlaylistIds();
    return pinned
      .map((id) => allPl.find((p) => p.id === id))
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

    </div>
  );
};
