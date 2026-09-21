import { Component, createMemo, createResource, createSignal, For, Show, createEffect } from 'solid-js';
import { api, Album, Playlist, Song } from '../../services/api';
import { isTrackStarred, isAlbumStarred, toggleTrackStar, toggleAlbumStar, setTrackStarredState, setAlbumStarredState } from '../../services/starred';
import { FadeImage } from '../common/FadeImage';
import { Capacitor } from "@capacitor/core";
import { audioPlayer } from '../../services/audio';
import { AppleContextMenu, ContextMenuGroup } from './AppleContextMenu';
import { AppleAlertDialog } from './AppleAlertDialog';
import { createLongPress } from '../../hooks/useLongPress';
import { shareSongFile, shareAlbumFiles } from '../../services/share';
import {
  PlayIcon,
  ShuffleIcon,
  HeartIcon,
  MusicNoteIcon,
  EllipsisIcon,
  ShareIcon,
  QueueListIcon,
  ChevronDownIcon,
  MinusCircleIcon,
  DragHandleIcon,
  PinIcon,
} from '../common/Icons';
import { isPlaylistPinned, togglePinPlaylist } from '../../services/pinnedPlaylists';
import { MobileAddToPlaylistSheet } from './MobileAddToPlaylistSheet';

interface MobileAlbumDetailProps {
  albumId?: string;
  playlistId?: string;
  mixGenre?: string | null;
  initialAlbum?: Album | null;
  initialPlaylist?: Playlist | null;
  customCoverVariant?: 'station' | 'meshMix' | 'genreMix' | null;
  onClose: () => void;
  onNavigateToAlbum?: (albumId: string) => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const MobileAlbumDetail: Component<MobileAlbumDetailProps> = (props) => {
  const [isStarred, setIsStarred] = createSignal(false);
  const [selectedTrackForMenu, setSelectedTrackForMenu] = createSignal<Song | null>(null);
  const [selectedTrackIndexForMenu, setSelectedTrackIndexForMenu] = createSignal<number | null>(null);
  const [showAlbumMenu, setShowAlbumMenu] = createSignal(false);
  const [menuTriggerRect, setMenuTriggerRect] = createSignal<DOMRect | null>(null);

  const [showAddToPlaylist, setShowAddToPlaylist] = createSignal(false);
  const [songsToAddToPlaylist, setSongsToAddToPlaylist] = createSignal<string[]>([]);
  
  // Drag and Drop state
  const [localSongs, setLocalSongs] = createSignal<Song[]>([]);
  const [isEditingPlaylist, setIsEditingPlaylist] = createSignal(false);
  const [isSavingReorder, setIsSavingReorder] = createSignal(false);

  const [detailData, { mutate }] = createResource(
    () => ({
      albumId: props.albumId,
      playlistId: props.playlistId,
      mixGenre: props.mixGenre,
    }),
    async (params) => {
      // Fetch over network
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
    if (props.initialAlbum) return props.initialAlbum.title;
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

  createEffect(() => {
    if (!isEditingPlaylist()) {
      setLocalSongs(songs());
    }
  });

  let sortableInstance: any;
  let sortableListRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (isEditingPlaylist() && sortableListRef) {
      // Import SortableJS dynamically or globally
      import('sortablejs').then((module) => {
        const Sortable = module.default;
        if (sortableInstance) sortableInstance.destroy();
        
        sortableInstance = new Sortable(sortableListRef!, {
          animation: 200,
          handle: '.drag-handle',
          ghostClass: 'opacity-30',
          chosenClass: 'scale-[1.02]',
          forceFallback: true,
          fallbackClass: 'shadow-2xl bg-[#1e1e24] z-50 rounded-xl',
          scroll: true,
          scrollSensitivity: 100,
          scrollSpeed: 18,
          bubbleScroll: true,
          onEnd: (evt: any) => {
            const { oldIndex, newIndex, item, from } = evt;
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
            
            // 1. Revert Sortable's DOM mutation to prevent SolidJS reactivity corruption
            from.removeChild(item);
            if (oldIndex < from.childNodes.length) {
              from.insertBefore(item, from.childNodes[oldIndex]);
            } else {
              from.appendChild(item);
            }
            
            // 2. Safely update SolidJS state, letting the framework handle the re-render natively
            const list = [...localSongs()];
            const [moved] = list.splice(oldIndex, 1);
            list.splice(newIndex, 0, moved);
            setLocalSongs(list);
          }
        });
      });
    } else {
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = undefined;
      }
    }
  });

  createEffect(() => {
    const id = collectionId();
    if (id) {
      const isSt = Boolean(detailData()?.album?.starred || detailData()?.playlist?.starred || props.initialAlbum?.starred);
      setAlbumStarredState(id, isSt);
    }
  });

  createEffect(() => {
    const sList = songs();
    sList.forEach(s => {
      setTrackStarredState(s.id, Boolean(s.starred));
    });
  });

  const removeTrack = (idx: number) => {
    const list = [...localSongs()];
    list.splice(idx, 1);
    setLocalSongs(list);
  };

  const saveReorder = async () => {
    if (!props.playlistId) return;
    setIsSavingReorder(true);
    const newIds = localSongs().map(s => s.id);
    const oldLength = songs().length;
    await api.replacePlaylist(props.playlistId, oldLength, newIds);
    mutate(prev => {
      if (!prev) return prev;
      return { ...prev, songs: localSongs() };
    });
    setIsSavingReorder(false);
    setIsEditingPlaylist(false);
  };

  const coverUrl = createMemo(() => {
    if (props.playlistId) {
      const customCover = api.getCustomPlaylistCover(props.playlistId);
      if (customCover) return customCover;
    }
    const d = detailData();
    const coverId = props.initialPlaylist?.coverArt || props.initialPlaylist?.id || props.initialAlbum?.coverArt || props.initialAlbum?.id || d?.coverArt;
    if (coverId) {
      return api.getCoverArtUrl(coverId, 500);
    }
    return '';
  });

  const collectionId = createMemo(() => props.albumId || props.playlistId || '');

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
      audioPlayer.toggleShuffle();
    }
    audioPlayer.playTrack(song, list, index);
  };

  const trackMenuGroups = createMemo<ContextMenuGroup[]>(() => {
    const track = selectedTrackForMenu();
    if (!track) return [];
    
    const groups: ContextMenuGroup[] = [
      {
        items: [
          {
            label: 'Play Next',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ),
            onClick: () => audioPlayer.addToUserQueue(track, true),
          },
          {
            label: 'Play Last',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10m4-4v8m-4-4h8" />
              </svg>
            ),
            onClick: () => audioPlayer.addToUserQueue(track, false),
          },
          {
            label: 'Add to a Playlist...',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
            onClick: () => {
              setSongsToAddToPlaylist([track.id]);
              setShowAddToPlaylist(true);
            },
          },
          {
            label: 'Share Song',
            icon: <ShareIcon class="w-5 h-5" />,
            onClick: () => shareSongFile(track),
          },
        ],
      },
    ];

    if (props.playlistId) {
      groups[0].items.push({
        label: 'Reorder Playlist',
        icon: <DragHandleIcon class="w-5 h-5" />,
        onClick: () => setIsEditingPlaylist(true),
      });
    }

    if ((props.playlistId || props.mixGenre) && track.albumId && props.onNavigateToAlbum) {
      groups.push({
        items: [
          {
            label: 'View Album',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            ),
            onClick: () => props.onNavigateToAlbum!(track.albumId!),
          },
        ]
      });
    }

    if (props.playlistId) {
      groups.push({
        items: [
          {
            label: 'Remove from Playlist',
            destructive: true,
            icon: (
              <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            onClick: async () => {
              const idx = selectedTrackIndexForMenu();
              if (idx === null || !props.playlistId) return;
              await api.removeFromPlaylist(props.playlistId, [idx]);
              mutate(prev => {
                if (!prev) return prev;
                const newSongs = [...prev.songs];
                newSongs.splice(idx, 1);
                return { ...prev, songs: newSongs };
              });
            },
          },
        ]
      });
    }

    const isSt = isTrackStarred(track.id);
    groups.push({
      items: [
        {
          label: isSt ? 'Unfavorite' : 'Favorite',
          icon: <HeartIcon class={`w-5 h-5 ${isSt ? 'text-[#fa243c]' : 'text-neutral-400'}`} filled={isSt} />,
          onClick: async () => {
            await toggleTrackStar(track.id);
          },
        },
      ],
    });

    return groups;
  });

  const albumMenuGroups = createMemo<ContextMenuGroup[]>(() => {
    const groups: ContextMenuGroup[] = [
      {
        items: [
          {
            label: 'Play Next',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ),
            onClick: () => handlePlayAll(false),
          },
          {
            label: 'Play Last',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10m4-4v8m-4-4h8" />
              </svg>
            ),
            onClick: () => audioPlayer.addToUserQueue(songs(), false),
          },
          {
            label: 'Add to a Playlist...',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
            onClick: () => {
              setSongsToAddToPlaylist(songs().map(s => s.id));
              setShowAddToPlaylist(true);
            },
          },
          {
            label: 'Share Album',
            icon: <ShareIcon class="w-5 h-5" />,
            onClick: () => shareAlbumFiles(songs(), title(), artist()),
          },
        ],
      },
    ];

    if (props.playlistId) {
      groups[0].items.push({
        label: 'Reorder Playlist',
        icon: <DragHandleIcon class="w-5 h-5" />,
        onClick: () => setIsEditingPlaylist(true),
      });
    }

    return groups;
  });

  return (
    <div class="relative w-full h-full flex flex-col md:flex-row bg-[#0e0e12] overflow-y-auto md:overflow-hidden overflow-x-hidden pb-32 md:pb-0 pt-[env(safe-area-inset-top,16px)] px-4 md:px-6 w-full md:gap-8">
      <Show when={coverUrl()}>
        <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <FadeImage src={coverUrl()} 
            alt="" 
            class="w-full h-full  filter blur-3xl opacity-30 saturate-150 scale-125 transform origin-top" 
          />
          <div class="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-[#0e0e12]/80 to-[#0e0e12]" />
        </div>
      </Show>

      {/* LEFT COLUMN: Hero Cover Art & Metadata (Unfolded: 45% width) */}
      <div class="flex flex-col items-center text-center mt-3 mb-6 z-10 relative w-full md:w-[45%] md:shrink-0 md:min-w-0 md:sticky md:top-4 md:h-fit">
        <div class="w-full flex items-center justify-between py-2 mb-2">
          <Show when={!isEditingPlaylist()}>
            <button
              onClick={props.onClose}
              class="h-10 px-3 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md rounded-2xl flex items-center gap-1 text-white font-bold text-sm active:scale-95 transition-all shadow-md shrink-0"
            >
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          </Show>

          <Show when={isEditingPlaylist()}>
            <button
              onClick={() => { setIsEditingPlaylist(false); setLocalSongs(songs()); }}
              class="h-10 px-3 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md rounded-2xl flex items-center text-white font-bold text-sm active:scale-95 transition-all shadow-md shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={saveReorder}
              disabled={isSavingReorder()}
              class="h-10 px-4 bg-[#fa243c] border border-[#fa243c] rounded-2xl flex items-center text-white font-bold text-sm active:scale-95 transition-all shadow-md shrink-0 ml-auto"
            >
              {isSavingReorder() ? 'Saving...' : 'Save'}
            </button>
          </Show>

          <Show when={!isEditingPlaylist()}>
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setShowAlbumMenu(true);
                setMenuTriggerRect(rect);
              }}
              class="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all shadow-md ml-auto"
              aria-label="More Options"
            >
              <EllipsisIcon class="w-5 h-5 text-white" />
            </button>
          </Show>
        </div>

        <div class="w-60 h-60 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-neutral-900 mb-5 relative flex shrink-0">
          <Show when={props.customCoverVariant === 'station'}>
            <div class="w-full h-full flex flex-col bg-gradient-to-b from-[#e51d48] to-[#be123c]">
              <div class="w-full h-full relative flex items-center justify-center overflow-hidden">
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div class="rounded-full bg-white/10 flex items-center justify-center w-52 h-52">
                    <div class="rounded-full bg-white/15 flex items-center justify-center w-40 h-40">
                      <div class="rounded-full bg-white/25 flex items-center justify-center shadow-inner w-28 h-28">
                        <div class="rounded-full bg-white/35 flex items-center justify-center shadow-md w-16 h-16">
                          <PlayIcon class="text-white ml-0.5 w-7 h-7" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Show>
          <Show when={props.customCoverVariant === 'meshMix'}>
            <div
              class="w-full h-full relative flex flex-col justify-center items-center text-center p-4 overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #4338ca 100%)',
              }}
            >
              <h3 class="font-black text-white leading-tight tracking-tight text-3xl uppercase">
                {title().includes(' ') ? (
                  <>
                    {title().split(' ')[0]}
                    <br />
                    {title().split(' ').slice(1).join(' ')}
                  </>
                ) : (
                  title()
                )}
              </h3>
            </div>
          </Show>
          <Show when={!props.customCoverVariant || (props.customCoverVariant !== 'station' && props.customCoverVariant !== 'meshMix')}>
            <Show
              when={coverUrl()}
              fallback={
                <div class="w-full h-full flex items-center justify-center bg-neutral-800">
                  <MusicNoteIcon class="w-16 h-16 text-neutral-600" />
                </div>
              }
            >
              <FadeImage src={coverUrl()} alt={title()} class="w-full h-full" />
            </Show>
          </Show>
        </div>

        <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight px-4">
          {title()}
        </h1>
        <Show when={artist()}>
          <p class="text-base md:text-lg font-bold text-[#fa243c] mt-1">
            {artist()}
          </p>
        </Show>
        <p class="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
          {songs().length} TRACKS • {formatDuration(songs().reduce((acc, s) => acc + (s.duration || 0), 0))}
        </p>
        
        {/* Apple Music Hero Action Capsule: [ 🔀 Shuffle ] [ ▶ Play ] [ ♥ Heart ] */}
        <div class="flex items-center justify-center gap-2.5 w-full max-w-sm mt-5 px-2">
          <button
            onClick={() => handlePlayAll(true)}
            class="w-12 h-12 bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
            title="Shuffle"
          >
            <ShuffleIcon class="w-5 h-5" />
          </button>

          <button
            onClick={() => handlePlayAll(false)}
            class="flex-1 h-12 bg-[#fa243c] hover:bg-[#d91d34] text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
          >
            <PlayIcon class="w-5 h-5 fill-current" />
            <span class="text-sm">Play</span>
          </button>

          <Show when={props.playlistId}>
            <button
              onClick={() => togglePinPlaylist(props.playlistId)}
              class={`w-12 h-12 rounded-2xl border backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-md shrink-0 ${
                isPlaylistPinned(props.playlistId)
                  ? 'bg-amber-500/30 border-amber-500 text-amber-400'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
              }`}
              title={isPlaylistPinned(props.playlistId) ? "Unpin from Home" : "Pin to Home"}
              aria-label="Pin to Home"
            >
              <PinIcon class={`w-5 h-5 ${isPlaylistPinned(props.playlistId) ? 'text-amber-400' : 'text-white'}`} filled={isPlaylistPinned(props.playlistId)} />
            </button>
          </Show>

          <button
            onClick={async () => {
              const id = collectionId();
              if (id) {
                await toggleAlbumStar(id);
              }
            }}
            class={`w-12 h-12 rounded-2xl border backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-md shrink-0 ${
              isAlbumStarred(collectionId())
                ? 'bg-[#fa243c]/30 border-[#fa243c] text-[#fa243c]'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
            }`}
            title="Favorite"
            aria-label="Favorite"
          >
            <HeartIcon class={`w-5 h-5 ${isAlbumStarred(collectionId()) ? 'text-[#fa243c]' : 'text-white'}`} filled={isAlbumStarred(collectionId())} />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Tracklist Container (Unfolded: side column starting at cover art level) */}
      <div class="w-full md:w-[55%] md:shrink-0 md:min-w-0 flex flex-col z-10 relative mt-2 md:mt-0 md:overflow-y-auto md:h-full md:pt-16 md:pb-28 md:pr-6">
        <Show when={detailData.loading}>
          <div class="py-8 flex items-center justify-center text-xs font-bold text-neutral-400 animate-pulse">
            Loading tracks...
          </div>
        </Show>

        <div 
          ref={sortableListRef}
          class="flex flex-col divide-y divide-white/5 w-full min-w-0 relative"
        >
        <For each={isEditingPlaylist() ? localSongs() : songs()}>
          {(song, idx) => {
            const isPlayingThis = () => audioPlayer.currentTrack()?.id === song.id;
            
            const longPressHandlers = createLongPress(
              (e, targetElement) => {
                if (isEditingPlaylist()) return;
                const rect = targetElement.getBoundingClientRect();
                setSelectedTrackForMenu(song);
                setSelectedTrackIndexForMenu(idx());
                setMenuTriggerRect(rect);
              },
              () => {
                if (!isEditingPlaylist()) handlePlayTrack(song, idx());
              }
            );
            return (
              <div
                onTouchStart={!isEditingPlaylist() ? longPressHandlers.onTouchStart : undefined}
                onTouchMove={!isEditingPlaylist() ? longPressHandlers.onTouchMove : undefined}
                onTouchEnd={!isEditingPlaylist() ? longPressHandlers.onTouchEnd : undefined}
                onTouchCancel={!isEditingPlaylist() ? longPressHandlers.onTouchCancel : undefined}
                onMouseDown={!isEditingPlaylist() ? longPressHandlers.onMouseDown : undefined}
                onMouseLeave={!isEditingPlaylist() ? longPressHandlers.onMouseLeave : undefined}
                onMouseUp={!isEditingPlaylist() ? longPressHandlers.onMouseUp : undefined}
                onClick={!isEditingPlaylist() ? longPressHandlers.onClick : undefined}
                onContextMenu={!isEditingPlaylist() ? longPressHandlers.onContextMenu : undefined}
                class={`flex items-center justify-between py-3.5 px-2 rounded-xl transition-all cursor-pointer [-webkit-touch-callout:none] min-w-0 w-full relative bg-transparent ${
                  isPlayingThis() && !isEditingPlaylist() ? 'text-[#fa243c]' : 'text-white'
                } ${!isEditingPlaylist() ? 'active:bg-white/10' : ''}`}
                data-context-target={!isEditingPlaylist() ? "true" : undefined}
              >
                <div class="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
                  <Show when={isEditingPlaylist()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(idx());
                      }}
                      class="w-6 h-6 rounded-full text-[#FF453A] pointer-events-auto shrink-0 flex items-center justify-center active:scale-95"
                    >
                      <MinusCircleIcon class="w-6 h-6" />
                    </button>
                  </Show>
                  <Show when={!isEditingPlaylist()}>
                    <span class="w-6 text-xs font-semibold text-neutral-500 text-center font-mono shrink-0">
                      {props.playlistId ? idx() + 1 : (song.track || idx() + 1)}
                    </span>
                  </Show>
                  <div class="min-w-0 flex-1">
                    <p class={`text-sm font-semibold truncate leading-tight ${isPlayingThis() && !isEditingPlaylist() ? 'text-[#fa243c]' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p class="text-xs text-neutral-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0 ml-3">
                  <Show when={!isEditingPlaylist()}>
                    <span class="text-xs text-neutral-500 font-mono pointer-events-none">
                      {formatDuration(song.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSelectedTrackForMenu(song);
                        setSelectedTrackIndexForMenu(idx());
                        setMenuTriggerRect(rect);
                      }}
                      class="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 active:text-white transition-colors pointer-events-auto"
                      aria-label="Track Options"
                    >
                      <EllipsisIcon class="w-4 h-4" />
                    </button>
                  </Show>

                  <Show when={isEditingPlaylist()}>
                    <div class="drag-handle w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 active:text-white transition-colors cursor-grab touch-none pointer-events-auto">
                      <DragHandleIcon class="w-5 h-5 pointer-events-none" />
                    </div>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
      </div>

      <AppleContextMenu
        isOpen={!!selectedTrackForMenu()}
        triggerRect={menuTriggerRect()}
        onClose={() => {
          setSelectedTrackForMenu(null);
          setMenuTriggerRect(null);
        }}
        groups={trackMenuGroups()}
      />

      <AppleContextMenu
        isOpen={showAlbumMenu()}
        triggerRect={menuTriggerRect()}
        onClose={() => {
          setShowAlbumMenu(false);
          setMenuTriggerRect(null);
        }}
        groups={albumMenuGroups()}
      />

      <MobileAddToPlaylistSheet
        isOpen={showAddToPlaylist()}
        onClose={() => setShowAddToPlaylist(false)}
        songsToAdd={songsToAddToPlaylist()}
      />
    </div>
  );
};
