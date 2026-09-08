import { Component, For, Show, createResource, createEffect, createMemo } from 'solid-js';
import { api, Album, Genre, Playlist, Song } from '../services/api';
import { audioPlayer } from '../services/audio';
import { focusEngine } from '../services/focus';
import { AlbumCard } from './common/AlbumCard';
import { TrackCard } from './common/TrackCard';
import { TopPickCard } from './common/TopPickCard';
import { SectionHeader } from './common/SectionHeader';

interface HomeViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectPlaylist?: (playlist: Playlist, coverVariant?: 'station' | 'meshMix') => void;
  onSelectGenre?: (genre: string) => void;
  onSelectMix?: (genre: string, coverVariant?: 'meshMix' | 'genreMix') => void;
}

interface HomeData {
  newest: Album[];
  starred: Album[];
  starredTracks: Song[];
  random: Album[];
  genres: Genre[];
  playlists: Playlist[];
}

let cachedHomeData: HomeData | null = null;

export function clearHomeCache() {
  cachedHomeData = null;
}

export async function prefetchHomeData(): Promise<HomeData | null> {
  if (!api.isConfigured()) return null;
  if (cachedHomeData) return cachedHomeData;

  try {
    // Lean batch sizes (20 max) to keep memory footprint minimal and network fast on webOS
    const [newestRes, starred2Res, randomRes, playlistsRes, genresRes] = await Promise.allSettled([
      api.getAlbumList('newest', 20),
      api.getStarred2(),
      api.getAlbumList('random', 20),
      api.getPlaylists(),
      api.getGenres(),
    ]);

    const newestRaw = newestRes.status === 'fulfilled' ? newestRes.value : [];
    const starred2Data = starred2Res.status === 'fulfilled' ? starred2Res.value : { albums: [], songs: [] };
    let starredRaw = starred2Data.albums;

    // Only query starred album list if starred2 didn't return any albums
    if (starredRaw.length === 0) {
      try {
        starredRaw = await api.getAlbumList('starred', 20);
      } catch (e) {}
    }

    const MAX_ITEMS = 20;
    const starredTracks = starred2Data.songs.slice(0, MAX_ITEMS);
    const randomRaw = randomRes.status === 'fulfilled' ? randomRes.value : [];
    const playlists = playlistsRes.status === 'fulfilled' ? playlistsRes.value : [];
    const genres = genresRes.status === 'fulfilled' ? genresRes.value : [];

    // High performance O(1) deduplication across Home screen sections
    const seenAlbumIds = new Set<string>();

    const starred: Album[] = [];
    starredRaw.forEach((album) => {
      if (!seenAlbumIds.has(album.id) && starred.length < MAX_ITEMS) {
        seenAlbumIds.add(album.id);
        starred.push(album);
      }
    });

    let newest: Album[] = [];
    newestRaw.forEach((album) => {
      if (!seenAlbumIds.has(album.id) && newest.length < MAX_ITEMS) {
        seenAlbumIds.add(album.id);
        newest.push(album);
      }
    });

    let random: Album[] = [];
    randomRaw.forEach((album) => {
      if (!seenAlbumIds.has(album.id) && random.length < MAX_ITEMS) {
        seenAlbumIds.add(album.id);
        random.push(album);
      }
    });

    if (newest.length === 0 && random.length === 0) {
      try {
        const fallbackAlbums = await api.getAlbumList('alphabeticalByName', 20);
        fallbackAlbums.forEach((album) => {
          if (!seenAlbumIds.has(album.id)) {
            seenAlbumIds.add(album.id);
            if (newest.length < 20) newest.push(album);
            else if (random.length < 20) random.push(album);
          }
        });
      } catch (e) {}
    }

    cachedHomeData = {
      newest,
      starred,
      starredTracks,
      random,
      genres,
      playlists,
    };

    return cachedHomeData;
  } catch (e) {
    console.error('Failed to load Home data', e);
    return null;
  }
}

export const HomeView: Component<HomeViewProps> = (props) => {
  let mainContainerRef: HTMLElement | undefined;

  const resourceSource = () => ({
    configured: api.isConfigured(),
    configKey: api.getConfig()?.serverUrl || '',
  });

  const [homeData] = createResource(resourceSource, async ({ configured }) => {
    if (!configured) {
      return { newest: [], starred: [], starredTracks: [], random: [], genres: [], playlists: [] };
    }
    const data = await prefetchHomeData();
    return data || { newest: [], starred: [], starredTracks: [], random: [], genres: [], playlists: [] };
  });

  createEffect(() => {
    // Set 5 columns grid layout for larger cards and smooth navigation
    focusEngine.setGridColumns(5);
  });

  // Dynamic daily category generator (Returns 4 items) memoized to avoid redundant computation
  const dailyTopPicks = createMemo(() => {
    const data = homeData();
    if (!data) return [];

    // Local calendar day seed to guarantee clean 24-hour cycle at local midnight
    const now = new Date();
    const localDay = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

    // Match Daily Random playlist flexible name formats
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

    // Slot 1: The Stable Anchor — Daily Random (Apple Station pulse circle design)
    const discoveryPlaylist = data.playlists.find(
      (p) => (p.songCount || 0) > 0 && isDailyRandomPlaylist(p.name)
    );
    const slot1 = {
      categoryLabel: 'Daily Discovery',
      variant: 'station' as const,
      title: discoveryPlaylist ? discoveryPlaylist.name : 'Daily Random',
      subtitle: discoveryPlaylist ? `${discoveryPlaylist.songCount} Tracks` : 'Discovery Mix',
      onClick: () => {
        if (discoveryPlaylist) {
          props.onSelectPlaylist?.(discoveryPlaylist, 'station');
        } else if (data.random.length > 0) {
          props.onSelectAlbum(data.random[localDay % data.random.length]);
        } else if (props.onSelectMix) {
          props.onSelectMix('Discovery');
        } else {
          props.onSelectGenre?.('Discovery');
        }
      },
    };

    // Slot 2: Album of the Day (Stable per day via localStorage)
    const todayStr = now.toDateString();
    let savedAlbumStr = localStorage.getItem('navios_daily_album');
    let savedAlbumDate = localStorage.getItem('navios_daily_album_date');
    let randomAlbum: any = null;
    
    if (savedAlbumDate === todayStr && savedAlbumStr) {
      try { randomAlbum = JSON.parse(savedAlbumStr); } catch(e) {}
    }
    
    if (!randomAlbum && data.random && data.random.length > 0) {
      randomAlbum = data.random[0];
      localStorage.setItem('navios_daily_album', JSON.stringify(randomAlbum));
      localStorage.setItem('navios_daily_album_date', todayStr);
    }

    const slot2 = randomAlbum
      ? {
          categoryLabel: 'Album of the Day',
          variant: 'album' as const,
          title: randomAlbum.title,
          subtitle: randomAlbum.artist || 'Unknown Artist',
          coverArtUrl: api.getCoverArtUrl(randomAlbum.coverArt || randomAlbum.id, 300),
          onClick: () => props.onSelectAlbum(randomAlbum),
        }
      : null;

    // Slot 3: Contextual Time of Day Curated Playlist (Pure Jazz / Smart Playlist)
    const hour = now.getHours();
    let timeGreeting = 'For the Afternoon';
    if (hour >= 5 && hour < 12) timeGreeting = 'For the Morning';
    else if (hour >= 12 && hour < 17) timeGreeting = 'For the Afternoon';
    else if (hour >= 17 && hour < 22) timeGreeting = 'For the Evening';
    else timeGreeting = 'Late Night';

    const nonDiscoveryPlaylists = data.playlists.filter(
      (p) =>
        (p.songCount || 0) > 0 &&
        p.id !== discoveryPlaylist?.id &&
        !isDailyRandomPlaylist(p.name)
    );

    const slot3Pl = nonDiscoveryPlaylists.length > 0
      ? nonDiscoveryPlaylists[localDay % nonDiscoveryPlaylists.length]
      : null;

    const slot3 = slot3Pl
      ? {
          categoryLabel: timeGreeting,
          variant: 'playlist' as const,
          title: slot3Pl.name,
          subtitle: slot3Pl.comment || `${slot3Pl.songCount} Tracks`,
          coverArtUrl: api.getCoverArtUrl(slot3Pl.coverArt || slot3Pl.id, 300),
          onClick: () => props.onSelectPlaylist?.(slot3Pl),
        }
      : null;

    // Slot 4: Genre Mix (genreMix variant)
    const genre = data.genres.length > 0 ? data.genres[localDay % data.genres.length] : null;
    const slot4 = genre
      ? {
          categoryLabel: 'Genre Focus',
          variant: 'genreMix' as const,
          title: `${genre.value} Mix`,
          subtitle: `${genre.albumCount} Albums`,
          onClick: () => props.onSelectMix?.(genre.value, 'genreMix'),
        }
      : null;

    // Slot 5: Made For You — Favorites Mix (Fluid gradient with artist roster)
    const artistsSet = new Set<string>();
    data.starredTracks?.forEach((t) => { if (t.artist) artistsSet.add(t.artist); });
    data.starred?.forEach((a) => { if (a.artist) artistsSet.add(a.artist); });
    data.newest?.forEach((a) => { if (a.artist) artistsSet.add(a.artist); });
    data.random?.forEach((a) => { if (a.artist) artistsSet.add(a.artist); });

    const artistRoster = Array.from(artistsSet).slice(0, 8).join(', ') + '...';

    const slot5 = {
      categoryLabel: 'Made For You',
      variant: 'meshMix' as const,
      title: 'Favorites Mix',
      subtitle: 'Mix',
      metadata: artistRoster,
      onClick: () => {
        props.onSelectMix?.('favorites', 'meshMix');
      },
    };

    // Reordered: Daily Random, Genre Mix, Favorites Mix, Album of the Day, Smart Playlist
    const picks = [slot1, slot4, slot5, slot2, slot3].filter(Boolean) as Array<{
      categoryLabel: string;
      variant: 'album' | 'station' | 'playlist' | 'meshMix' | 'genreMix';
      title: string;
      subtitle?: string;
      metadata?: string;
      coverArtUrl?: string;
      onClick: () => void;
    }>;

    return picks;
  });

  // Contiguous focus index across sections: TopPicks (4) -> Starred Albums (20) -> Starred Tracks (20) -> Newest (20) -> Random (20)
  const getIndex = (sectionType: 'topPicks' | 'starred' | 'starredTracks' | 'newest' | 'random', itemIdx: number) => {
    const data = homeData();
    if (!data) return itemIdx;

    const topPicksCount = dailyTopPicks().length;
    if (sectionType === 'topPicks') return itemIdx;

    let base = topPicksCount;
    if (sectionType === 'starred') return base + itemIdx;

    base += data.starred.length;
    if (sectionType === 'starredTracks') return base + itemIdx;

    base += (data.starredTracks?.length || 0);
    if (sectionType === 'newest') return base + itemIdx;

    base += data.newest.length;
    return base + itemIdx;
  };

  return (
    <main
      ref={mainContainerRef}
      class="flex-1 pt-4 px-16 pb-64 z-10 w-full flex flex-col gap-10"
    >
      {homeData.loading && (
        <div class="flex items-center justify-center h-64">
          <div class="text-3xl text-neutral-400 animate-pulse font-bold">Loading Home feed...</div>
        </div>
      )}

      {homeData() && (
        <div class="flex flex-col gap-12 pb-24">
          {/* Section 1: Dynamic Top Picks (5 items) */}
          <section class="flex flex-col w-full">
            <SectionHeader title="Top Picks" />
            <div class="flex flex-row gap-6 overflow-x-auto [::-webkit-scrollbar]:hidden py-8 px-8 -mx-4 -my-4 [scroll-padding:36px]">
              <For each={dailyTopPicks()}>
                {(pick, index) => (
                  <div class="w-[calc((100%-4.5rem)/4.35)] shrink-0 min-w-[19.5rem]">
                    <TopPickCard
                      title={pick.title}
                      subtitle={pick.subtitle}
                      metadata={pick.metadata}
                      categoryLabel={pick.categoryLabel}
                      variant={pick.variant}
                      coverArtUrl={pick.coverArtUrl}
                      section="grid"
                      index={getIndex('topPicks', index())}
                      onClick={pick.onClick}
                    />
                  </div>
                )}
              </For>
            </div>
          </section>

          {/* Carousel Section 2: Favourite Albums (5 visible per view) */}
          {homeData()!.starred.length > 0 && (
            <section class="flex flex-col">
              <SectionHeader title="Favourite Albums" />
              <div class="flex flex-row gap-6 overflow-x-auto [::-webkit-scrollbar]:hidden py-8 px-8 -mx-4 -my-4 [scroll-padding:36px]">
                <For each={homeData()!.starred}>
                  {(album, index) => (
                    <div class="w-[17.2rem] shrink-0">
                      <AlbumCard
                        album={album}
                        variant="standard"
                        section="grid"
                        index={getIndex('starred', index())}
                        onClick={props.onSelectAlbum}
                      />
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}

          {/* Carousel Section 3: Favourite Tracks (5 visible per view) */}
          {homeData()!.starredTracks && homeData()!.starredTracks.length > 0 && (
            <section class="flex flex-col">
              <SectionHeader title="Favourite Tracks" />
              <div class="flex flex-row gap-6 overflow-x-auto [::-webkit-scrollbar]:hidden py-8 px-8 -mx-4 -my-4 [scroll-padding:36px]">
                <For each={homeData()!.starredTracks}>
                  {(song, index) => (
                    <div class="w-[17.2rem] shrink-0">
                      <TrackCard
                        song={song}
                        allSongs={homeData()!.starredTracks}
                        songIndex={index()}
                        section="grid"
                        focusIndex={getIndex('starredTracks', index())}
                        onPlay={(s) => audioPlayer.playTrack(s, [s], 0)}
                      />
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}

          {/* Carousel Section 4: Recently Added (5 visible per view) */}
          {homeData()!.newest.length > 0 && (
            <section class="flex flex-col">
              <SectionHeader title="Recently Added" />
              <div class="flex flex-row gap-6 overflow-x-auto [::-webkit-scrollbar]:hidden py-8 px-8 -mx-4 -my-4 [scroll-padding:36px]">
                <For each={homeData()!.newest}>
                  {(album, index) => (
                    <div class="w-[17.2rem] shrink-0">
                      <AlbumCard
                        album={album}
                        variant="standard"
                        section="grid"
                        index={getIndex('newest', index())}
                        onClick={props.onSelectAlbum}
                      />
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}

          {/* Carousel Section 5: Album Suggestions (5 visible per view) */}
          {homeData()!.random.length > 0 && (
            <section class="flex flex-col">
              <SectionHeader title="Album Suggestions" />
              <div class="flex flex-row gap-6 overflow-x-auto [::-webkit-scrollbar]:hidden py-8 px-8 -mx-4 -my-4 [scroll-padding:36px]">
                <For each={homeData()!.random}>
                  {(album, index) => (
                    <div class="w-[17.2rem] shrink-0">
                      <AlbumCard
                        album={album}
                        variant="standard"
                        section="grid"
                        index={getIndex('random', index())}
                        onClick={props.onSelectAlbum}
                      />
                    </div>
                  )}
                </For>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};
