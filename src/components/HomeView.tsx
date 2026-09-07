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
  onSelectPlaylist?: (playlist: Playlist) => void;
  onSelectGenre?: (genre: string) => void;
  onSelectMix?: (genre: string) => void;
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

    if (cachedHomeData) {
      return cachedHomeData;
    }

    try {
      const [newestRes, starredRes, starred2Res, randomRes, genresRes, playlistsRes] = await Promise.allSettled([
        api.getAlbumList('newest', 40),
        api.getAlbumList('starred', 40),
        api.getStarred2(),
        api.getAlbumList('random', 40),
        api.getGenres(),
        api.getPlaylists(),
      ]);

      const newestRaw = newestRes.status === 'fulfilled' ? newestRes.value : [];
      let starredRaw = starredRes.status === 'fulfilled' ? starredRes.value : [];
      const starred2Data = starred2Res.status === 'fulfilled' ? starred2Res.value : { albums: [], songs: [] };
      if (starredRaw.length === 0 && starred2Data.albums.length > 0) {
        starredRaw = starred2Data.albums;
      }

      const MAX_ITEMS = 20;
      const starredTracks = starred2Data.songs.slice(0, MAX_ITEMS);
      const randomRaw = randomRes.status === 'fulfilled' ? randomRes.value : [];
      const genres = genresRes.status === 'fulfilled' ? genresRes.value : [];
      const playlists = playlistsRes.status === 'fulfilled' ? playlistsRes.value : [];

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
        const fallbackAlbums = await api.getAlbumList('alphabeticalByName', 40);
        fallbackAlbums.forEach((album) => {
          if (!seenAlbumIds.has(album.id)) {
            seenAlbumIds.add(album.id);
            if (newest.length < 20) newest.push(album);
            else if (random.length < 20) random.push(album);
          }
        });
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
      return { newest: [], starred: [], starredTracks: [], random: [], genres: [], playlists: [] };
    }
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

    const parsePlaylistTitle = (name: string): { title: string; subtitle?: string } => {
      const lower = name.toLowerCase();
      if (lower.includes('daily random discovery') || lower.includes('random discovery')) {
        return { title: 'Daily Random', subtitle: 'Discovery' };
      }
      if (lower.endsWith(' mix')) {
        return { title: name.slice(0, -4), subtitle: 'Mix' };
      }
      if (lower.endsWith(' playlist')) {
        return { title: name.slice(0, -9), subtitle: 'Playlist' };
      }
      return { title: name, subtitle: 'Playlist' };
    };

    // 1. Stable Slot 1: Daily Random Discovery (must have >0 tracks)
    const discoveryPlaylist = data.playlists.find(
      (p) =>
        (p.songCount || 0) > 0 &&
        (p.name.toLowerCase().includes('daily random discovery') ||
        p.name.toLowerCase().includes('random discovery'))
    );

    const firstItem = discoveryPlaylist
      ? {
          title: parsePlaylistTitle(discoveryPlaylist.name).title,
          subtitle: parsePlaylistTitle(discoveryPlaylist.name).subtitle,
          badge: 'Daily Discovery',
          metadata: `${discoveryPlaylist.songCount} Tracks`,
          colorIndex: localDay % 12,
          onClick: () => props.onSelectPlaylist?.(discoveryPlaylist),
        }
      : {
          title: 'Daily Random',
          subtitle: 'Discovery Mix',
          badge: 'Daily Discovery',
          metadata: `${data.random.length} Albums`,
          colorIndex: localDay % 12,
          onClick: () => (props.onSelectMix ? props.onSelectMix('Discovery') : props.onSelectGenre?.('Discovery')),
        };

    // 2. Candidate pool for remaining 3 items (only non-empty playlists and genres)
    const candidatePool: Array<{
      title: string;
      subtitle?: string;
      badge: string;
      metadata: string;
      onClick: () => void;
    }> = [];

    data.playlists.forEach((pl) => {
      if (
        (pl.songCount || 0) > 0 &&
        pl.id !== discoveryPlaylist?.id &&
        !pl.name.toLowerCase().includes('random discovery')
      ) {
        const parsed = parsePlaylistTitle(pl.name);
        candidatePool.push({
          title: parsed.title,
          subtitle: parsed.subtitle,
          badge: 'Playlist',
          metadata: `${pl.songCount} Tracks`,
          onClick: () => props.onSelectPlaylist?.(pl),
        });
      }
    });

    data.genres.forEach((g) => {
      if ((g.albumCount || 0) > 0) {
        candidatePool.push({
          title: g.value,
          subtitle: 'Mix',
          badge: 'Genre Mix',
          metadata: `${g.albumCount} Albums`,
          onClick: () => (props.onSelectMix ? props.onSelectMix(g.value) : props.onSelectGenre?.(g.value)),
        });
      }
    });

    // 3. Seeded Fisher-Yates shuffle using localDay
    const pool = [...candidatePool];
    let seed = (localDay * 1664525 + 1013904223) >>> 0;
    for (let i = pool.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const remainingThree = pool.slice(0, 3).map((item, idx) => ({
      ...item,
      colorIndex: (localDay + idx + 1) % 12,
    }));

    return [firstItem, ...remainingThree];
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
          {/* Section 1: Dynamic Top Picks (4 items: Daily Random Discovery + 3 24h rotating items) */}
          <section class="flex flex-col w-full">
            <SectionHeader title="Top Picks" />
            <div class="grid grid-cols-4 gap-6 w-full py-8 px-4 -my-4 overflow-visible">
              <For each={dailyTopPicks()}>
                {(pick, index) => (
                  <div class="w-full">
                    <TopPickCard
                      title={pick.title}
                      subtitle={pick.subtitle}
                      badge={pick.badge}
                      metadata={pick.metadata}
                      colorIndex={pick.colorIndex}
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
