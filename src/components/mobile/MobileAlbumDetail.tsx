import { Component, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { api, Album, Playlist, Song } from '../../services/api';
import { audioPlayer } from '../../services/audio';
import {
  ArrowLeftIcon,
  PlayIcon,
  ShuffleIcon,
  HeartIcon,
  MusicNoteIcon,
} from '../common/Icons';

interface MobileAlbumDetailProps {
  albumId?: string;
  playlistId?: string;
  mixGenre?: string | null;
  initialAlbum?: Album | null;
  initialPlaylist?: Playlist | null;
  customCoverVariant?: 'station' | 'meshMix' | 'genreMix' | null;
  onClose: () => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MobileAlbumDetail: Component<MobileAlbumDetailProps> = (props) => {
  const [isStarred, setIsStarred] = createSignal(false);
  const [recentlyQueued, setRecentlyQueued] = createSignal<Set<string>>(new Set());


  const [detailData] = createResource(
    () => ({
      albumId: props.albumId,
      playlistId: props.playlistId,
      mixGenre: props.mixGenre,
    }),
    async (params) => {
      if (params.albumId) {
        const res = await api.getAlbum(params.albumId);
        if (res?.album?.starred) setIsStarred(true);
        return {
          title: res.album.title,
          artist: res.album.artist,
          genre: res.album.genre,
          year: res.album.year,
          coverArt: res.album.coverArt || res.album.id,
          songs: res.songs || [],
        };
      }
      if (params.playlistId) {
        const res = await api.getPlaylist(params.playlistId);
        return {
          title: res.playlist.name,
          artist: 'Playlist',
          genre: 'Playlist',
          coverArt: res.playlist.coverArt || res.playlist.id,
          songs: res.songs || [],
        };
      }
      if (params.mixGenre) {
        if (params.mixGenre.toLowerCase() === 'favorites') {
          const starred = await api.getStarred2();
          const songs = starred.songs.length > 0 ? starred.songs : [];
          return {
            title: 'Favorites Mix',
            artist: 'Curated Mix',
            genre: 'Mix',
            coverArt: starred.albums[0]?.coverArt || '',
            songs,
          };
        }
        const songs = await api.getRandomSongs(40, params.mixGenre);
        return {
          title: `${params.mixGenre} Mix`,
          artist: 'Genre Mix',
          genre: params.mixGenre,
          coverArt: songs[0]?.coverArt || '',
          songs: songs || [],
        };
      }
      return null;
    }
  );

  const title = createMemo(() => {
    const d = detailData();
    if (d?.title) return d.title;
    if (props.initialAlbum) return props.initialAlbum.title || props.initialAlbum.name;
    if (props.initialPlaylist) return props.initialPlaylist.name;
    if (props.mixGenre) return `${props.mixGenre} Mix`;
    return 'Album';
  });

  const artist = createMemo(() => {
    const d = detailData();
    if (d?.artist) return d.artist;
    if (props.initialAlbum?.artist) return props.initialAlbum.artist;
    if (props.mixGenre) return 'Curated Mix';
    return '';
  });

  const songs = createMemo<Song[]>(() => {
    const d = detailData();
    if (!d) return [];
    return d.songs || [];
  });

  const coverUrl = createMemo(() => {
    const d = detailData();
    const coverId = d?.coverArt || props.initialAlbum?.coverArt || props.initialAlbum?.id || props.initialPlaylist?.coverArt || props.initialPlaylist?.id;
    if (coverId) {
      return api.getCoverArtUrl(coverId, 600);
    }
    return '';
  });

  const handlePlayAll = (shuffle = false) => {
    const list = songs();
    if (list.length === 0) return;
    
    if (shuffle && !audioPlayer.isShuffle()) {
      audioPlayer.toggleShuffle();
    } else if (!shuffle && audioPlayer.isShuffle()) {
      audioPlayer.toggleShuffle();
    }

    const startIndex = shuffle ? Math.floor(Math.random() * list.length) : 0;
    audioPlayer.playTrack(list[startIndex], list, startIndex);
  };

  const handlePlayTrack = (song: Song, index: number) => {
    const list = songs();
    if (audioPlayer.isShuffle()) {
      audioPlayer.toggleShuffle(); // Turn off shuffle when explicitly picking a track in order
    }
    audioPlayer.playTrack(song, list, index);
  };

  return (
    <div class="w-full h-full flex flex-col bg-[#0e0e12] overflow-y-auto pb-28 pt-[env(safe-area-inset-top,16px)] px-4">
      {/* Top Bar Back Button */}
      <div class="flex items-center justify-between py-2">
        <button
          onClick={props.onClose}
          class="flex items-center gap-1 text-[#fa243c] font-semibold text-base active:opacity-60 -ml-1 py-2 px-1"
        >
          <ArrowLeftIcon class="w-5 h-5" />
          <span>Back</span>
        </button>

        <button
          onClick={() => setIsStarred(!isStarred())}
          class={`p-2 rounded-full active:scale-95 ${
            isStarred() ? 'text-[#fa243c]' : 'text-neutral-400'
          }`}
        >
          <HeartIcon class="w-6 h-6" filled={isStarred()} />
        </button>
      </div>

      {/* Album Art & Title Header */}
      <div class="flex flex-col items-center text-center mt-2 mb-6">
        <div class="w-52 h-52 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900 mb-5">
          <Show
            when={coverUrl()}
            fallback={
              <div class="w-full h-full flex items-center justify-center bg-neutral-800">
                <MusicNoteIcon class="w-16 h-16 text-neutral-600" />
              </div>
            }
          >
            <img src={coverUrl()} alt={title()} class="w-full h-full object-cover" />
          </Show>
        </div>

        <h1 class="text-2xl font-black text-white tracking-tight leading-tight px-4">
          {title()}
        </h1>
        <Show when={artist()}>
          <p class="text-base font-semibold text-[#fa243c] mt-1">
            {artist()}
          </p>
        </Show>
        <p class="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-medium">
          {songs().length} Tracks • {formatDuration(songs().reduce((acc, s) => acc + (s.duration || 0), 0))}
        </p>

        {/* Action Buttons: Play & Shuffle */}
        <div class="flex items-center justify-center gap-3 w-full max-w-xs mt-6">
          <button
            onClick={() => handlePlayAll(false)}
            class="flex-1 py-3 bg-[#fa243c] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <PlayIcon class="w-5 h-5" />
            <span>Play</span>
          </button>

          <button
            onClick={() => handlePlayAll(true)}
            class="flex-1 py-3 bg-neutral-800/90 text-white border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <ShuffleIcon class="w-5 h-5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Loading Tracks Spinner */}
      <Show when={detailData.loading}>
        <div class="py-8 flex items-center justify-center text-xs font-bold text-neutral-400 animate-pulse">
          Loading tracks...
        </div>
      </Show>

      {/* Track List */}
      <div class="flex flex-col divide-y divide-white/5 border-t border-white/10">
        <For each={songs()}>
          {(song, idx) => {
            const isPlayingThis = () => audioPlayer.currentTrack()?.id === song.id;
            return (
              <div
                onClick={() => handlePlayTrack(song, idx())}
                class={`flex items-center justify-between py-3 px-2 rounded-xl active:bg-white/10 transition-colors cursor-pointer ${
                  isPlayingThis() ? 'text-[#fa243c]' : 'text-white'
                }`}
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <span class="w-5 text-xs font-semibold text-neutral-500 text-center font-mono">
                    {song.track || idx() + 1}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class={`text-sm font-semibold truncate leading-tight ${isPlayingThis() ? 'text-[#fa243c]' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p class="text-xs text-neutral-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioPlayer.addToUserQueue(song, false, true);
                      setRecentlyQueued((prev) => new Set(prev).add(song.id));
                      setTimeout(() => {
                        setRecentlyQueued((prev) => {
                          const next = new Set(prev);
                          next.delete(song.id);
                          return next;
                        });
                      }, 2000);
                    }}
                    class={`p-1 active:scale-90 transition-colors focus:outline-none ${
                      recentlyQueued().has(song.id) ? 'text-green-400' : 'text-neutral-400 hover:text-white'
                    }`}
                    aria-label="Add to Queue"
                  >
                    <Show 
                      when={recentlyQueued().has(song.id)}
                      fallback={
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </Show>
                  </button>
                  <span class="text-xs text-neutral-500 font-mono w-9 text-right">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              </div>
            );
          }}
        </For>
        <div class="h-16" />
      </div>

    </div>
  );
};
