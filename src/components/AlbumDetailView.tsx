import { Component, For, createResource, createSignal, createMemo } from 'solid-js';
import { api, Song, Album, Playlist } from '../services/api';
import { audioPlayer } from '../services/audio';
import { focusEngine } from '../services/focus';
import { TrackRow } from './common/TrackRow';
import { PlayIcon, ShuffleIcon, QueueAddIcon, HeartIcon, ArrowLeftIcon, MusicNoteIcon, CheckIcon } from './common/Icons';

interface CollectionData {
  title: string;
  subtitle: string;
  metadata: string;
  coverArtUrl?: string;
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
  onClose: () => void;
}

export const AlbumDetailView: Component<AlbumDetailViewProps> = (props) => {
  const [isStarred, setIsStarred] = createSignal<boolean>(false);

  const [data] = createResource(
    () => ({ albumId: props.albumId, playlistId: props.playlistId, mixGenre: props.mixGenre }),
    async ({ albumId, playlistId, mixGenre }): Promise<CollectionData> => {
      if (playlistId) {
        const pl = await api.getPlaylist(playlistId);
        return {
          title: pl.playlist.name,
          subtitle: 'Subsonic Playlist',
          metadata: `${pl.songs.length} Tracks`,
          coverArtUrl: api.getCoverArtUrl(pl.playlist.coverArt || pl.playlist.id, 800),
          songs: pl.songs,
          isPlaylist: true,
          playlistId,
        };
      }

      if (mixGenre) {
        const genreAlbums = await api.getAlbumList('byGenre', 4, 0, mixGenre);
        const albumPromises = genreAlbums.map((a) => api.getAlbum(a.id));
        const results = await Promise.all(albumPromises);
        const songs: Song[] = [];
        results.forEach((r) => {
          if (r.songs) songs.push(...r.songs.slice(0, 4));
        });
        const coverArtUrl = genreAlbums[0] ? api.getCoverArtUrl(genreAlbums[0].coverArt || genreAlbums[0].id, 800) : '';
        return {
          title: `${mixGenre} Mix`,
          subtitle: 'Dynamic Genre Playlist',
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
          coverArtUrl: api.getCoverArtUrl(res.album.coverArt || albumId, 800),
          songs: res.songs,
          albumId,
        };
      }

      return { title: 'Collection', subtitle: '', metadata: '', songs: [] };
    }
  );

  const currentTrackId = () => audioPlayer.currentTrack()?.id;

  function handleTrackClick(song: Song, allSongs: Song[], index: number) {
    if (song.id === currentTrackId()) {
      focusEngine.setActiveModal('nowPlaying');
      focusEngine.setFocus('nowPlaying', 2);
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

  // Header buttons: 0=back, 1=play, 2=shuffle, 3=queue, 4=star (albums only). Tracks start after.
  const indices = () => {
    let idx = 1;
    const playIdx = idx++;
    const shuffleIdx = idx++;
    const queueIdx = idx++;
    const starIdx = data()?.albumId ? idx++ : null;
    const trackStartIdx = idx;
    return { playIdx, shuffleIdx, queueIdx, starIdx, trackStartIdx };
  };

  return (
    <div class="flex-1 w-full pt-4 px-16 pb-6 flex flex-col justify-start z-10 h-[calc(100vh-100px)] overflow-hidden">
      {/* Back Button Row */}
      <div class="flex items-center shrink-0 mb-4">
        <button
          onClick={props.onClose}
          class="px-6 py-2.5 rounded-full bg-neutral-800/90 text-white font-bold text-2xl flex items-center gap-3 hover:bg-neutral-700 transition-all border border-neutral-700/80 shadow-md"
          data-focusable="true"
          data-section="albumDetail"
          data-index="0"
        >
          <ArrowLeftIcon class="w-6 h-6" />
          Back
        </button>
      </div>

      {data.loading && (
        <div class="flex-1 flex items-center justify-center text-3xl text-neutral-400 animate-pulse font-semibold">
          Loading collection...
        </div>
      )}

      {data() && (
        <div class="flex-1 flex gap-16 items-start w-full min-h-0 overflow-visible">
          {/* Album Artwork - Stationary on left */}
          <div class="w-[520px] h-[520px] rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl shrink-0 border border-neutral-800/40">
            {data()?.coverArtUrl ? (
              <img
                src={data()!.coverArtUrl}
                alt={data()?.title}
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
                {data()?.title}
              </h1>
              <p class="text-4xl font-bold text-neutral-300">{data()?.subtitle}</p>
              <p class="text-2xl font-semibold text-neutral-400">{data()?.metadata}</p>

              {/* Action Buttons: Play, Shuffle, Add to Queue, Star */}
              <div class="flex items-center gap-4 mt-4 py-4 pl-6 pr-4 -my-4 -ml-6 -mr-4 overflow-visible">
                <button
                  onClick={() => handlePlayCollection(data()?.songs || [], false)}
                  class="px-8 py-3.5 rounded-full bg-white text-black text-2xl font-extrabold flex items-center gap-3 shadow-xl hover:scale-105"
                  data-focusable="true"
                  data-section="albumDetail"
                  data-index={indices().playIdx}
                >
                  <PlayIcon class="w-7 h-7" />
                  Play
                </button>

                <button
                  onClick={() => handlePlayCollection(data()?.songs || [], true)}
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

                {data()?.albumId && indices().starIdx !== null && (
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
              class="mt-4 flex-1 flex flex-col gap-5 px-10 py-6 -mx-10 -my-6 overflow-y-auto min-h-0 pb-16"
              data-track-start={indices().trackStartIdx}
            >
              <For each={data()?.songs}>
                {(song, index) => {
                  const isPlaying = () => song.id === currentTrackId();
                  return (
                    <TrackRow
                      song={song}
                      index={index()}
                      trackIndex={index()}
                      allSongs={data()!.songs}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
