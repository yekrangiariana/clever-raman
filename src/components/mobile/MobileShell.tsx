import { Component, createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Album, Playlist } from '../../services/api';
import { MobileHomeView } from './MobileHomeView';
import { MobileLibraryView } from './MobileLibraryView';
import { MobileSearchView } from './MobileSearchView';
import { MobileSettingsView } from './MobileSettingsView';
import { MobileAlbumDetail } from './MobileAlbumDetail';
import { MobileMiniPlayer } from './MobileMiniPlayer';
import { MobileNowPlaying } from './MobileNowPlaying';
import { AppleContextMenu, ContextMenuGroup } from './AppleContextMenu';
import { AppleAlertDialog } from './AppleAlertDialog';
import { isAlbumDownloaded, downloadCollection, removeCollection } from '../../services/offlineSync';
import { globalAlbumMenuTarget, setGlobalAlbumMenuTarget, isSharingMedia, globalActiveTab, setGlobalActiveTab, setGlobalSearchQuery, globalSelectedAlbumId, setGlobalSelectedAlbumId, globalSelectedPlaylistId, setGlobalSelectedPlaylistId } from '../../services/uiState';
import { shareAlbumFiles } from '../../services/share';
import { TrashIcon, ShareIcon } from '../common/Icons';
import { Song, api } from '../../services/api';
import { foldState } from '../../services/foldable';
import { TabletopControlDeck } from './TabletopControlDeck';
import { createMemo } from 'solid-js';
import {
  HomeMusicIcon,
  LibraryMusicIcon,
  SearchIcon,
  SettingsIcon,
} from '../common/Icons';

import { MobileFoldableRail } from './MobileFoldableRail';
import { MobileAddToPlaylistSheet } from './MobileAddToPlaylistSheet';

type MobileTab = 'home' | 'library' | 'search' | 'settings';

export const MobileShell: Component = () => {
  
  const [selectedAlbum, setSelectedAlbum] = createSignal<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = createSignal<Playlist | null>(null);
  const [selectedMixGenre, setSelectedMixGenre] = createSignal<string | null>(null);
  const [selectedCoverVariant, setSelectedCoverVariant] = createSignal<'station' | 'meshMix' | 'genreMix' | null>(null);
  const [showNowPlaying, setShowNowPlaying] = createSignal<boolean>(false);
  const [isUnfolded, setIsUnfolded] = createSignal<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 600 : false);

  createEffect(async () => {
    const albumId = globalSelectedAlbumId();
    if (albumId) {
      const res = await api.getAlbum(albumId);
      if (res && res.album) {
        handleSelectAlbum(res.album);
      }
      setGlobalSelectedAlbumId(null);
    }

    const playlistId = globalSelectedPlaylistId();
    if (playlistId) {
      const res = await api.getPlaylist(playlistId);
      if (res && res.playlist) {
        handleSelectPlaylist(res.playlist);
      }
      setGlobalSelectedPlaylistId(null);
    }
  });

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setSelectedPlaylist(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(null);
  };

  const handleSelectPlaylist = (pl: Playlist, coverVariant?: 'station' | 'meshMix') => {
    setSelectedPlaylist(pl);
    setSelectedAlbum(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(coverVariant || null);
  };

  const handleSelectMix = (genre: string, coverVariant?: 'meshMix' | 'genreMix') => {
    setSelectedMixGenre(genre);
    setSelectedAlbum(null);
    setSelectedPlaylist(null);
    setSelectedCoverVariant(coverVariant || null);
  };

  const handleCloseDetail = () => {
    setSelectedAlbum(null);
    setSelectedPlaylist(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(null);
  };

  const tabTitles: Record<MobileTab, string> = {
    home: 'Listen Now',
    library: 'Library',
    search: 'Search',
    settings: 'Settings',
  };

  onMount(() => {
    const handleResize = () => setIsUnfolded(window.innerWidth >= 600);
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));

    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('backButton', () => {
        if (showNowPlaying()) {
          setShowNowPlaying(false);
        } else if (selectedAlbum() || selectedPlaylist() || selectedMixGenre()) {
          handleCloseDetail();
        } else {
          App.exitApp();
        }
      });
      onCleanup(() => {
        listener.then(l => l.remove());
      });
    }
  });

  return (
    <div class="fixed inset-0 w-full h-full bg-[#0c0a09] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      <Show when={!selectedAlbum() && !selectedPlaylist() && !selectedMixGenre()}>
        <header class="w-full px-5 pt-[env(safe-area-inset-top,20px)] pb-3 flex items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-xl shrink-0 z-20">
          <h1 class="text-3xl font-black tracking-tight text-white">
            {tabTitles[globalActiveTab()]}
          </h1>
        </header>
      </Show>

      {/* Main Content Viewport */}
      <main class="flex-1 w-full overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch relative">
        <Show
          when={selectedAlbum() || selectedPlaylist() || selectedMixGenre()}
          fallback={
            <div class="w-full h-full">
              <div class={globalActiveTab() === 'home' ? 'w-full h-full' : 'hidden'}>
                <MobileHomeView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectMix={handleSelectMix}
                  onSelectPlaylist={handleSelectPlaylist}
                />
              </div>
              <div class={globalActiveTab() === 'library' ? 'w-full h-full' : 'hidden'}>
                <MobileLibraryView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectPlaylist={handleSelectPlaylist}
                />
              </div>
              <div class={globalActiveTab() === 'search' ? 'w-full h-full' : 'hidden'}>
                <MobileSearchView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectGenre={(g) => handleSelectMix(g, 'genreMix')}
                />
              </div>
              <div class={globalActiveTab() === 'settings' ? 'w-full h-full' : 'hidden'}>
                <MobileSettingsView />
              </div>
            </div>
          }
        >
          <MobileAlbumDetail
            albumId={selectedAlbum()?.id}
            playlistId={selectedPlaylist()?.id}
            mixGenre={selectedMixGenre()}
            initialAlbum={selectedAlbum()}
            initialPlaylist={selectedPlaylist()}
            customCoverVariant={selectedCoverVariant()}
            onClose={handleCloseDetail}
            onNavigateToAlbum={async (albumId) => {
              const res = await api.getAlbum(albumId);
              if (res?.album) handleSelectAlbum(res.album);
            }}
          />
        </Show>
      </main>

      {/* Bottom Floating MiniPlayer & Glass Tab Bar */}
      <div class="absolute bottom-0 left-0 right-0 flex flex-col z-30 pointer-events-none">
        {/* Floating MiniPlayer */}
        <MobileMiniPlayer onOpenNowPlaying={() => setShowNowPlaying(true)} />

        {/* Glassmorphic Mobile Tab Bar */}
        <nav class="w-full bg-black/40 backdrop-blur-3xl border-t border-white/10 px-4 md:px-8 py-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom,8px))] flex items-center justify-around gap-2 pointer-events-auto">
          <button
            onClick={() => {
              handleCloseDetail();
              setGlobalActiveTab('home');
            }}
            class={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 ${
              globalActiveTab() === 'home'
                ? 'bg-white/15 border border-white/15 text-[#fa243c] shadow-sm backdrop-blur-md'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            <HomeMusicIcon class="w-5 h-5" />
            <span class="text-[10px] font-bold tracking-tight">Listen Now</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setGlobalActiveTab('library');
            }}
            class={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 ${
              globalActiveTab() === 'library'
                ? 'bg-white/15 border border-white/15 text-[#fa243c] shadow-sm backdrop-blur-md'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            <LibraryMusicIcon class="w-5 h-5" />
            <span class="text-[10px] font-bold tracking-tight">Library</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setGlobalActiveTab('search');
            }}
            class={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 ${
              globalActiveTab() === 'search'
                ? 'bg-white/15 border border-white/15 text-[#fa243c] shadow-sm backdrop-blur-md'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            <SearchIcon class="w-5 h-5" />
            <span class="text-[10px] font-bold tracking-tight">Search</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setGlobalActiveTab('settings');
            }}
            class={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 ${
              globalActiveTab() === 'settings'
                ? 'bg-white/15 border border-white/15 text-[#fa243c] shadow-sm backdrop-blur-md'
                : 'text-neutral-400 hover:text-white border border-transparent'
            }`}
          >
            <SettingsIcon class="w-5 h-5" />
            <span class="text-[10px] font-bold tracking-tight">Settings</span>
          </button>
        </nav>
      </div>

      {/* Full Screen Apple Music Now Playing Sheet */}
      <Show when={showNowPlaying()}>
        <MobileNowPlaying onClose={() => setShowNowPlaying(false)} />
      </Show>

      {/* Global Album Context Menu */}
      <MobileGlobalAlbumMenu />

      {/* Global Share/Loading HUD */}
      <Show when={isSharingMedia()}>
        <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
          <div class="w-[140px] h-[140px] bg-[#1e1e1e]/90 backdrop-blur-xl rounded-[20px] shadow-2xl flex flex-col items-center justify-center gap-4">
            <svg class="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span class="text-white font-medium text-[15px] tracking-tight">Preparing...</span>
          </div>
        </div>
      </Show>
    </div>
  );
};

const MobileGlobalAlbumMenu: Component = () => {
  const [downloadConfirmId, setDownloadConfirmId] = createSignal<string | null>(null);
  const [songs, setSongs] = createSignal<Song[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = createSignal(false);
  const [songsToAddToPlaylist, setSongsToAddToPlaylist] = createSignal<string[]>([]);
  
  const handleDownloadToggle = async () => {
    const target = globalAlbumMenuTarget();
    if (!target) return;
    const album = target.album;
    if (isAlbumDownloaded(album.id)) {
      setDownloadConfirmId(album.id);
    } else {
      const res = await api.getAlbum(album.id);
      if (res && res.songs) {
        downloadCollection(album.id, res.songs, 'album', album);
      }
      setGlobalAlbumMenuTarget(null);
    }
  };

  const groups = createMemo<ContextMenuGroup[]>(() => {
    const target = globalAlbumMenuTarget();
    if (!target) return [];
    
    const baseGroups: ContextMenuGroup[] = [
      {
        items: [
          {
            label: 'Add to a Playlist...',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
            onClick: async () => {
              const album = target.album;
              const res = await api.getAlbum(album.id);
              if (res && res.songs) {
                setSongsToAddToPlaylist(res.songs.map(s => s.id));
                setShowAddToPlaylist(true);
              }
            },
          },
          {
            label: 'Go to Artist',
            icon: (
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
            onClick: () => {
              const album = target.album;
              if (album.artist) {
                setGlobalSearchQuery(album.artist);
                setGlobalActiveTab('search');
                setGlobalAlbumMenuTarget(null);
              }
            },
          },
          {
            label: 'Share Album',
            icon: <ShareIcon class="w-5 h-5" />,
            onClick: async () => {
              const album = target.album;
              const res = await api.getAlbum(album.id);
              if (res && res.songs) {
                shareAlbumFiles(res.songs, album.title || album.title || '', album.artist || '');
              }
            },
          },
        ],
      },
    ];

    if (Capacitor.isNativePlatform() && target.album.id) {
      baseGroups.push({
        items: [
          {
            label: isAlbumDownloaded(target.album.id) ? 'Remove Download' : 'Download',
            destructive: isAlbumDownloaded(target.album.id),
            icon: isAlbumDownloaded(target.album.id) ? (
              <TrashIcon class="w-5 h-5 text-red-500" />
            ) : (
              <svg class="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            ),
            onClick: handleDownloadToggle,
          },
        ],
      });
    }
    
    return baseGroups;
  });

  return (
    <>
      <AppleContextMenu
        isOpen={!!globalAlbumMenuTarget()}
        triggerRect={globalAlbumMenuTarget()?.triggerRect}
        onClose={() => setGlobalAlbumMenuTarget(null)}
        groups={groups()}
      />
      <AppleAlertDialog
        isOpen={!!downloadConfirmId()}
        title="Remove Download?"
        message="This will remove the downloaded music from your device."
        confirmText="Remove"
        cancelText="Cancel"
        destructive={true}
        onConfirm={() => {
          const id = downloadConfirmId();
          if (id) removeCollection(id);
          setDownloadConfirmId(null);
        }}
        onClose={() => {
          setDownloadConfirmId(null);
        }}
      />
      <MobileAddToPlaylistSheet
        isOpen={showAddToPlaylist()}
        onClose={() => {
          setShowAddToPlaylist(false);
          setGlobalAlbumMenuTarget(null);
        }}
        songsToAdd={songsToAddToPlaylist()}
      />
    </>
  );
};
