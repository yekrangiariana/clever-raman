import { Component, For, Show, createResource, createSignal, createMemo, createEffect, onCleanup } from 'solid-js';
import { APP_NAME } from "../config/constants";
import { api, Song, Album, Playlist } from '../services/api';
import { audioPlayer } from '../services/audio';
import { focusEngine } from '../services/focus';
import { TrackRow } from './common/TrackRow';
import { PlayIcon, ShuffleIcon, QueueAddIcon, HeartIcon, MusicNoteIcon, CheckIcon } from './common/Icons';

interface CollectionData {
  title: string;
  subtitle: string;
  metadata: string;
  coverArtUrl?: string;
  coverVariant?: 'station' | 'meshMix' | 'genreMix'; // custom cover design instead of image
  songs: Song[];
  isMix?: boolean;
  isPlaylist?: boolean;
  albumId?: string;
  playlistId?: string;
}

interface AlbumDetailViewProps {
  albumId?: string | null;
  playlistId?: string | null;
  mixGenre?: string | null;
  initialAlbum?: Album | null;
  initialPlaylist?: Playlist | null;
  customCoverVariant?: 'station' | 'meshMix' | 'genreMix' | null;
  onClose: () => void;
}

export const AlbumDetailView: Component<AlbumDetailViewProps> = (props) => {
  const [isStarred, setIsStarred] = createSignal<boolean>(!!props.initialAlbum?.starred);

  const initialData = (): CollectionData => {
    if (props.initialPlaylist) {
      const cached = api.getCachedPlaylist(props.initialPlaylist.id);
      return {
        title: props.initialPlaylist.name,
        subtitle: 'Subsonic Playlist',
        metadata: `${props.initialPlaylist.songCount} Tracks`,
        coverArtUrl: props.customCoverVariant ? undefined : api.getCoverArtUrl(props.initialPlaylist.coverArt || props.initialPlaylist.id, 500),
        coverVariant: props.customCoverVariant || undefined,
        songs: cached?.songs || [],
        isPlaylist: true,
        playlistId: props.initialPlaylist.id,
      };
    }

    if (props.initialAlbum) {
      const cached = api.getCachedAlbum(props.initialAlbum.id);
      return {
        title: props.initialAlbum.title,
        subtitle: props.initialAlbum.artist,
        metadata: `${props.initialAlbum.genre || 'Album'}${props.initialAlbum.year ? ` • ${props.initialAlbum.year}` : ''}${props.initialAlbum.songCount ? ` • ${props.initialAlbum.songCount} Tracks` : ''}`,
        coverArtUrl: api.getCoverArtUrl(props.initialAlbum.coverArt || props.initialAlbum.id, 500),
        songs: cached?.songs || [],
        albumId: props.initialAlbum.id,
      };
    }

    if (props.mixGenre) {
      return {
        title: `${props.mixGenre} Mix`,
        subtitle: 'Dynamic Mix',
        metadata: 'Mix',
        songs: [],
        isMix: true,
      };
    }

    return { title: 'Collection', subtitle: '', metadata: '', songs: [] };
  };

  const [data] = createResource(
    () => ({ albumId: props.albumId, playlistId: props.playlistId, mixGenre: props.mixGenre }),
    async ({ albumId, playlistId, mixGenre }): Promise<CollectionData> => {
      if (playlistId) {
        const pl = await api.getPlaylist(playlistId);
        return {
          title: pl.playlist.name,
          subtitle: 'Subsonic Playlist',
          metadata: `${pl.songs.length} Tracks`,
          coverArtUrl: props.customCoverVariant ? undefined : api.getCoverArtUrl(pl.playlist.coverArt || pl.playlist.id, 500),
          coverVariant: props.customCoverVariant || undefined,
          songs: pl.songs,
          isPlaylist: true,
          playlistId,
        };
      }

      if (mixGenre) {
        // Favorites Mix — load starred tracks with a meshMix cover design
        if (mixGenre.toLowerCase() === 'favorites') {
          const starred = await api.getStarred2();
          const songs = starred.songs.length > 0 ? starred.songs : starred.albums.flatMap(() => []);
          const subtitle = `${starred.albums.length} Albums`;
          return {
            title: 'Favorites Mix',
            subtitle,
            metadata: `Mix • ${songs.length} Tracks`,
            coverVariant: 'meshMix',
            songs,
            isMix: true,
          };
        }

        let genreAlbums: Album[] = [];
        if (mixGenre.toLowerCase() === 'discovery') {
          genreAlbums = await api.getAlbumList('random', 6);
        } else {
          genreAlbums = await api.getAlbumList('byGenre', 4, 0, mixGenre);
        }
        const albumPromises = genreAlbums.map((a) => api.getAlbum(a.id));
        const results = await Promise.allSettled(albumPromises);
        const songs: Song[] = [];
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value.songs) {
            songs.push(...r.value.songs.slice(0, 4));
          }
        });
        const coverArtUrl = genreAlbums[0] ? api.getCoverArtUrl(genreAlbums[0].coverArt || genreAlbums[0].id, 500) : '';
        return {
          title: `${mixGenre} Mix`,
          subtitle: 'Dynamic Mix',
          metadata: `Mix • ${songs.length} Tracks`,
          coverArtUrl,
          songs,
          isMix: true,
        };
      }

      if (albumId) {
        const res = await api.getAlbum(albumId);
        if (res.album?.starred) setIsStarred(true);
        return {
          title: res.album.title,
          subtitle: res.album.artist,
          metadata: `${res.album.genre || 'Album'}${res.album.year ? ` • ${res.album.year}` : ''} • ${res.songs.length} Tracks`,
          coverArtUrl: api.getCoverArtUrl(res.album.coverArt || albumId, 500),
          songs: res.songs,
          albumId,
        };
      }

      return initialData();
    },
    { initialValue: initialData() }
  );

  createEffect(() => {
    const songs = data().songs;
    
    // Set focus engine length dynamically based on header controls + track count
    const headerCount = indices().trackStartIdx;
    if (songs) {
      focusEngine.setSectionLength('albumDetail', headerCount + songs.length);
    } else {
      focusEngine.setSectionLength('albumDetail', headerCount);
    }
  });

  const visibleSongs = createMemo(() => {
    const songs = data().songs;
    if (!songs) return [];
    return songs;
  });

  const currentTrackId = () => audioPlayer.currentTrack()?.id;

  function handleTrackClick(song: Song, allSongs: Song[], index: number) {
    if (song.id === currentTrackId()) {
      focusEngine.setActiveModal('nowPlaying');
      focusEngine.setFocus('nowPlaying', 1);
    } else {
      audioPlayer.playTrack(allSongs[index], allSongs, index);
    }
  }

  function handlePlayCollection(allSongs: Song[], shuffle = false) {
    if (!allSongs || allSongs.length === 0) return;
    if (shuffle && !audioPlayer.isShuffle()) audioPlayer.toggleShuffle();
    audioPlayer.playTrack(allSongs[0], allSongs, 0);
  }

  async function handleToggleAlbumStar() {
    const c = data();
    if (!c?.albumId) return;
    const nextState = !isStarred();
    setIsStarred(nextState);
    if (nextState) {
      await api.star(c.albumId, true);
    } else {
      await api.unstar(c.albumId, true);
    }
  }

  async function handleToggleTrackStar(song: Song, e: Event) {
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

  function formatDuration(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  const isAlbumInQueue = createMemo(() => {
    const songs = data()?.songs;
    if (!songs || songs.length === 0) return false;
    const uq = audioPlayer.userQueue();
    return songs.every((s) => uq.some((item) => item.id === s.id));
  });

  const handleAlbumQueueClick = () => {
    const songs = data()?.songs;
    if (!songs || songs.length === 0) return;
    if (isAlbumInQueue()) {
      const ids = new Set(songs.map((s) => s.id));
      audioPlayer.removeSongsFromQueue(ids);
    } else {
      audioPlayer.addToUserQueue(songs, false, false);
    }
  };

  // Header buttons: 0=play, 1=shuffle, 2=queue, 3=star (albums only). Tracks start after.
  const indices = () => {
    let idx = 0;
    const playIdx = idx++;
    const shuffleIdx = idx++;
    const queueIdx = idx++;
    const starIdx = data()?.albumId ? idx++ : null;
    const trackStartIdx = idx;
    return { playIdx, shuffleIdx, queueIdx, starIdx, trackStartIdx };
  };

  return (
    <div class="flex-1 w-full pt-4 px-16 pb-6 flex flex-col justify-start z-10 h-[calc(100vh-100px)] overflow-hidden">
      <div class="flex-1 flex gap-16 items-start w-full min-h-0 overflow-visible">
        {/* Album Artwork - Stationary on left */}
        <div class="w-[520px] h-[520px] rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl shrink-0 border border-neutral-800/40">
          {data().coverVariant === 'station' ? (
            /* Daily Random Discovery — matches station TopPickCard design */
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#e51d48] to-[#be123c] relative">
              <div class="absolute top-4 right-5 text-white font-black text-sm opacity-90 tracking-tight">{APP_NAME}</div>
              <div class="w-60 h-60 rounded-full bg-white/10 flex items-center justify-center">
                <div class="w-44 h-44 rounded-full bg-white/15 flex items-center justify-center">
                  <div class="w-32 h-32 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
                    <div class="w-16 h-16 rounded-full bg-white/35 flex items-center justify-center shadow-md">
                      <PlayIcon class="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : data().coverVariant === 'genreMix' ? (
            /* Genre Mix — matches genreMix TopPickCard gradient */
            <div
              class="w-full h-full flex flex-col p-8 relative"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)' }}
            >
              <div
                class="absolute inset-0 pointer-events-none opacity-10"
                style={{ 'background-image': 'url(./noise.png)', 'background-repeat': 'repeat' }}
              />
              <div class="absolute top-4 right-5 text-white font-black text-sm opacity-90 tracking-tight">{APP_NAME}</div>
              <div class="relative z-10 mt-auto mb-auto flex flex-col items-center justify-center text-center w-full">
                <h3
                  class={`font-black text-white leading-[1.05] tracking-tighter uppercase w-full px-4 ${
                    data().title.replace(/ mix$/i, '').length > 12
                      ? 'text-[3.5rem]'
                      : data().title.replace(/ mix$/i, '').length > 8
                      ? 'text-[4.5rem]'
                      : 'text-[6rem]'
                  }`}
                >
                  {data().title.replace(/ mix$/i, '').split(' ').map((word, i, arr) => (
                    <>
                      {word}
                      {i < arr.length - 1 && <br />}
                    </>
                  ))}
                </h3>
                <p class="text-3xl font-bold text-white/90 uppercase tracking-[0.2em] mt-4">
                  Mix
                </p>
              </div>
            </div>
          ) : data().coverVariant === 'meshMix' ? (
            /* Favorites Mix — matches meshMix TopPickCard gradient */
            <div
              class="w-full h-full flex flex-col p-8 relative"
              style={{ background: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #4338ca 100%)' }}
            >
              <div
                class="absolute inset-0 pointer-events-none opacity-10"
                style={{ 'background-image': 'url(./noise.png)', 'background-repeat': 'repeat' }}
              />
              <div class="absolute top-4 right-5 text-white font-black text-sm opacity-90 tracking-tight">{APP_NAME}</div>
              <div class="relative z-10 mt-6">
                <h3 class="text-5xl font-black text-white leading-[1.05] tracking-tight">
                  Favorites<br />Mix
                </h3>
              </div>
              <div class="relative z-10 mt-auto">
                <p class="text-lg font-medium text-white/70">{data().subtitle}</p>
              </div>
            </div>
          ) : data().coverArtUrl ? (
            <img
              src={data().coverArtUrl}
              alt={data().title}
              class="w-full h-full object-cover rounded-3xl"
            />
          ) : (
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-950 to-neutral-950 text-white rounded-3xl">
              <MusicNoteIcon class="w-36 h-36 text-white/80" />
            </div>
          )}
        </div>

        {/* Right: Metadata + Actions (Stationary) + Scrollable Tracklist */}
        <div class="flex-1 flex flex-col min-w-0 h-full min-h-0">
          <div class="flex flex-col gap-2 shrink-0 overflow-visible p-4 -m-4">
            <h1 class="text-6xl font-black text-white leading-tight line-clamp-1 tracking-tight">
              {data().title}
            </h1>
            <p class="text-4xl font-bold text-neutral-300">{data().subtitle}</p>
            <p class="text-2xl font-semibold text-neutral-400">{data().metadata}</p>

            {/* Action Buttons: Play, Shuffle, Add to Queue, Star */}
            <div class="flex items-center gap-4 mt-4 py-4 pl-6 pr-4 -my-4 -ml-6 -mr-4 overflow-visible">
              <button
                onClick={() => handlePlayCollection(data().songs || [], false)}
                class="px-8 py-3.5 rounded-full bg-white text-black text-2xl font-extrabold flex items-center gap-3 shadow-xl hover:scale-105"
                data-focusable="true"
                data-section="albumDetail"
                data-index={indices().playIdx}
              >
                <PlayIcon class="w-7 h-7" />
                Play
              </button>

              <button
                onClick={() => handlePlayCollection(data().songs || [], true)}
                class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all shadow-lg ${
                  audioPlayer.isShuffle()
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-800/90 text-white border-neutral-700 hover:bg-neutral-700'
                }`}
                data-focusable="true"
                data-section="albumDetail"
                data-index={indices().shuffleIdx}
                title="Shuffle"
              >
                <ShuffleIcon class="w-7 h-7" />
              </button>

              <button
                onClick={handleAlbumQueueClick}
                class={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  isAlbumInQueue()
                    ? 'bg-emerald-600 border border-emerald-400 text-white is-added'
                    : 'bg-neutral-800/90 border border-neutral-700 text-white hover:bg-neutral-700'
                }`}
                data-focusable="true"
                data-added={isAlbumInQueue() ? "true" : undefined}
                data-section="albumDetail"
                data-index={indices().queueIdx}
                title={isAlbumInQueue() ? "In Queue (Click to Remove)" : "Add to Queue"}
              >
                {isAlbumInQueue() ? <CheckIcon class="w-7 h-7 text-white" /> : <QueueAddIcon class="w-7 h-7" />}
              </button>

              {data().albumId && indices().starIdx !== null && (
                <button
                  onClick={handleToggleAlbumStar}
                  class={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                    isStarred()
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:text-white'
                  }`}
                  data-focusable="true"
                  data-section="albumDetail"
                  data-index={indices().starIdx!}
                >
                  <HeartIcon filled={isStarred()} class="w-7 h-7" />
                </button>
              )}
            </div>
          </div>

          {/* Tracklist — scrollable while the top bit remains stationary */}
          <div
            class="mt-4 flex-1 flex flex-col gap-4 px-10 py-6 -mx-10 -my-6 overflow-y-auto min-h-0 pb-16"
            data-track-start={indices().trackStartIdx}
          >
            <Show
              when={data().songs && data().songs.length > 0}
              fallback={
                <Show
                  when={data.loading}
                  fallback={
                    <div class="p-8 text-neutral-400 text-2xl font-semibold">
                      {data.error ? 'Unable to load tracks. Please check connection to Navidrome.' : 'No tracks found in this collection.'}
                    </div>
                  }
                >
                  {/* Sleek Skeleton Loading Placeholders */}
                  <div class="flex flex-col gap-4">
                    <For each={[1, 2, 3, 4, 5, 6]}>
                      {() => (
                        <div class="h-20 rounded-2xl bg-white/5 animate-pulse flex items-center px-8 gap-8 border border-white/5">
                          <div class="w-8 h-6 bg-white/10 rounded"></div>
                          <div class="h-6 bg-white/10 rounded flex-1 max-w-md"></div>
                          <div class="w-16 h-6 bg-white/10 rounded ml-auto"></div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              }
            >
              <For each={visibleSongs()}>
                {(song, index) => {
                  const isPlaying = () => song.id === currentTrackId();
                  return (
                    <TrackRow
                      song={song}
                      index={index()}
                      trackIndex={index()}
                      allSongs={data().songs}
                      isPlaying={isPlaying()}
                      section="albumDetail"
                      focusIndex={indices().trackStartIdx + index()}
                      onClick={handleTrackClick}
                      onToggleStar={handleToggleTrackStar}
                      formatDuration={formatDuration}
                    />
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};
