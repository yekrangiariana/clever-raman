import { Component, createSignal, Show, onMount, onCleanup } from 'solid-js';
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
import {
  HomeMusicIcon,
  LibraryMusicIcon,
  SearchIcon,
  SettingsIcon,
} from '../common/Icons';

type MobileTab = 'home' | 'library' | 'search' | 'settings';

export const MobileShell: Component = () => {
  const [activeTab, setActiveTab] = createSignal<MobileTab>('home');
  const [selectedAlbum, setSelectedAlbum] = createSignal<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = createSignal<Playlist | null>(null);
  const [selectedMixGenre, setSelectedMixGenre] = createSignal<string | null>(null);
  const [selectedCoverVariant, setSelectedCoverVariant] = createSignal<'station' | 'meshMix' | 'genreMix' | null>(null);
  const [showNowPlaying, setShowNowPlaying] = createSignal<boolean>(false);

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
    <div class="fixed inset-0 w-full h-full bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* Top Header (Apple Music Style) */}
      <Show when={!selectedAlbum() && !selectedPlaylist() && !selectedMixGenre()}>
        <header class="w-full px-5 pt-[env(safe-area-inset-top,20px)] pb-3 flex items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-xl shrink-0 z-20">
          <h1 class="text-3xl font-black tracking-tight text-white">
            {tabTitles[activeTab()]}
          </h1>
        </header>
      </Show>

      {/* Main Content Viewport */}
      <main class="flex-1 w-full overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch relative">
        <Show
          when={selectedAlbum() || selectedPlaylist() || selectedMixGenre()}
          fallback={
            <>
              {activeTab() === 'home' && (
                <MobileHomeView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectMix={handleSelectMix}
                  onSelectPlaylist={handleSelectPlaylist}
                />
              )}
              {activeTab() === 'library' && (
                <MobileLibraryView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectPlaylist={handleSelectPlaylist}
                />
              )}
              {activeTab() === 'search' && (
                <MobileSearchView
                  onSelectAlbum={handleSelectAlbum}
                  onSelectGenre={(g) => handleSelectMix(g, 'genreMix')}
                />
              )}
              {activeTab() === 'settings' && (
                <MobileSettingsView />
              )}
            </>
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
          />
        </Show>
      </main>

      {/* Sticky Bottom Area: Floating MiniPlayer + 4-Tab Apple Music Bar */}
      <div class="w-full shrink-0 flex flex-col z-30 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
        
        {/* Floating MiniPlayer */}
        <MobileMiniPlayer onOpenNowPlaying={() => setShowNowPlaying(true)} />

        {/* Apple Music 4-Tab Bar */}
        <nav class="w-full bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 pb-[env(safe-area-inset-bottom,12px)] flex items-center justify-around pointer-events-auto">
          
          <button
            onClick={() => {
              handleCloseDetail();
              setActiveTab('home');
            }}
            class={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
              activeTab() === 'home' ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HomeMusicIcon class="w-6 h-6" />
            <span class="text-[10px] font-bold tracking-tight">Listen Now</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setActiveTab('library');
            }}
            class={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
              activeTab() === 'library' ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LibraryMusicIcon class="w-6 h-6" />
            <span class="text-[10px] font-bold tracking-tight">Library</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setActiveTab('search');
            }}
            class={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
              activeTab() === 'search' ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SearchIcon class="w-6 h-6" />
            <span class="text-[10px] font-bold tracking-tight">Search</span>
          </button>

          <button
            onClick={() => {
              handleCloseDetail();
              setActiveTab('settings');
            }}
            class={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${
              activeTab() === 'settings' ? 'text-[#fa243c]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SettingsIcon class="w-6 h-6" />
            <span class="text-[10px] font-bold tracking-tight">Settings</span>
          </button>

        </nav>
      </div>

      {/* Full Screen Apple Music Now Playing Sheet */}
      <Show when={showNowPlaying()}>
        <MobileNowPlaying onClose={() => setShowNowPlaying(false)} />
      </Show>

    </div>
  );
};
