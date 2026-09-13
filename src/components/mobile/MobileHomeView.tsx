import { Component, createResource, createMemo, For, Show } from 'solid-js';
import { api, Album, Playlist, Song, Genre } from '../../services/api';
import { TopPickCard } from '../common/TopPickCard';
import { MusicNoteIcon, SparklesIcon } from '../common/Icons';

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
      categoryLabel: 'Daily Discovery',
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
    let savedAlbumStr = localStorage.getItem('navios_daily_album');
    let savedAlbumDate = localStorage.getItem('navios_daily_album_date');
    let randomAlbum: any = null;
    
    if (savedAlbumDate === todayStr && savedAlbumStr) {
      try { randomAlbum = JSON.parse(savedAlbumStr); } catch(e) {}
    }
    
    if (!randomAlbum && data.randomAlbums && data.randomAlbums.length > 0) {
      randomAlbum = data.randomAlbums[0];
      localStorage.setItem('navios_daily_album', JSON.stringify(randomAlbum));
      localStorage.setItem('navios_daily_album_date', todayStr);
    }

    const slot2 = randomAlbum
      ? {
          categoryLabel: 'Album of the Day',
          variant: 'album' as const,
          title: randomAlbum.title,
          subtitle: randomAlbum.artist || 'Unknown Artist',
          coverArtUrl: api.getCoverArtUrl(randomAlbum.coverArt || randomAlbum.id, 400),
          onClick: () => props.onSelectAlbum(randomAlbum),
        }
      : null;

    // Slot 3: Mesh Mix (Favorites or dynamic mix)
    const slot3 = {
      categoryLabel: 'Made For You',
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

    return [slot1, slot2, slot3, slot4].filter(Boolean) as NonNullable<typeof slot1>[];
  });

  return (
    <div class="w-full flex flex-col gap-6 pb-28 pt-3 px-4">
      
      {/* Error / Connection Notice if fetch failed */}
      <Show when={homeData()?.fetchError && homeData()?.recentAlbums.length === 0}>
        <div class="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 flex flex-col gap-2">
          <p class="text-xs font-bold">Could not connect to Navidrome server</p>
          <p class="text-[11px] font-mono text-red-300">{homeData()?.fetchError}</p>
          <div class="flex gap-2 mt-1">
            <button
              onClick={() => refetch()}
              class="px-3 py-1 bg-red-800 text-white rounded-lg text-xs font-bold active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
      </Show>

      {/* Top Picks Hero Cards (Reusing TopPickCard in horizontal swipe carousel) */}
      <Show when={dailyTopPicks().length > 0}>
        <div>
          <div class="flex items-center gap-1.5 mb-3">
            <h2 class="text-xl font-black text-white tracking-tight">Top Picks & Stations</h2>
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

      {/* Favorite / Starred Albums Carousel */}
      <Show when={homeData()?.starredAlbums && homeData()!.starredAlbums.length > 0}>
        <div>
          <h2 class="text-xl font-black text-white tracking-tight mb-3">
            Favorites & Starred
          </h2>
          <div class="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none -mx-4 pl-4 scroll-pl-4 snap-x after:content-[''] after:w-4 after:shrink-0">
            <For each={homeData()?.starredAlbums}>
              {(album) => (
                <div
                  onClick={() => props.onSelectAlbum(album)}
                  class="w-36 sm:w-[clamp(9rem,20vw,14rem)] shrink-0 active:scale-95 transition-transform snap-start cursor-pointer"
                >
                  <div class="w-36 h-36 sm:w-full sm:h-auto sm:aspect-square rounded-2xl bg-neutral-800 overflow-hidden shadow-lg border border-white/5 mb-2">
                    <img
                      src={api.getCoverArtUrl(album.coverArt || album.id, 300)}
                      alt={album.title || album.name}
                      class="w-full h-full object-cover"
                      loading="lazy"
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

      {/* Recently Added (2-Column Grid) */}
      <Show when={homeData()?.recentAlbums && homeData()!.recentAlbums.length > 0}>
        <div>
          <h2 class="text-xl font-black text-white tracking-tight mb-3">
            Recently Added
          </h2>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <For each={homeData()?.recentAlbums}>
              {(album) => (
                <div
                  onClick={() => props.onSelectAlbum(album)}
                  class="flex flex-col active:scale-95 transition-transform cursor-pointer"
                >
                  <div class="aspect-square w-full rounded-2xl bg-neutral-800 overflow-hidden shadow-lg border border-white/5 mb-2">
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
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

    </div>
  );
};
