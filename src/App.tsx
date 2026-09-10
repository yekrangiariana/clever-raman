import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { api, Album, Playlist } from './services/api';
import { focusEngine } from './services/focus';
import { getProfiles, getShowBootSelector, editingProfileSignal, setEditingProfileSignal, addProfileReturnState, setAddProfileReturnState } from './services/profiles';
import { AmbientGlow } from './components/AmbientGlow';
import { TopBar } from './components/TopBar';
import { HomeView, prefetchHomeData } from './components/HomeView';
import { MainGrid, prefetchAlbums } from './components/MainGrid';
import { PlaylistsView } from './components/PlaylistsView';
import { AlbumDetailView } from './components/AlbumDetailView';
import { NowPlayingView } from './components/NowPlayingView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { ProfileSelectorModal } from './components/ProfileSelectorModal';
import { QuickProfileSwitcher } from './components/QuickProfileSwitcher';
import { AddProfileModal } from './components/AddProfileModal';

import { ToastNotification } from './components/common/ToastNotification';
import { ExitConfirmModal } from './components/common/ExitConfirmModal';

export const App: Component = () => {
  const [selectedAlbum, setSelectedAlbum] = createSignal<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = createSignal<Playlist | null>(null);
  const [selectedMixGenre, setSelectedMixGenre] = createSignal<string | null>(null);
  const [selectedGenre, setSelectedGenre] = createSignal<string | null>(null);
  const [selectedArtist, setSelectedArtist] = createSignal<string | null>(null);
  const [selectedCoverVariant, setSelectedCoverVariant] = createSignal<'station' | 'meshMix' | 'genreMix' | null>(null);

  onMount(() => {
    let splashDismissed = false;
    const dismissSplash = () => {
      if (splashDismissed) return;
      splashDismissed = true;
      const splash = document.getElementById('app-splash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
      }
    };

    if (!api.isConfigured()) {
      focusEngine.setActiveTab('settings');
      focusEngine.setFocus('settings', 0);
      setTimeout(dismissSplash, 500);
    } else {
      const profiles = getProfiles();
      
      const skipBootSelector = sessionStorage.getItem('skipBootSelector');
      if (skipBootSelector) {
        sessionStorage.removeItem('skipBootSelector');
      }

      const shouldShowBootSelector = getShowBootSelector() && profiles.length > 1 && !skipBootSelector;

      if (shouldShowBootSelector) {
        focusEngine.setActiveModal('profileSelector');
        setTimeout(() => focusEngine.setFocus('profileSelector', 0), 50);
        setTimeout(dismissSplash, 500);
      } else {
        focusEngine.setFocus('grid', 0);

        const minDisplayPromise = new Promise<void>((resolve) => setTimeout(resolve, 600));
        const safetyTimeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2500));
        const prefetchPromise = prefetchHomeData();

        Promise.race([
          Promise.all([minDisplayPromise, prefetchPromise]),
          safetyTimeoutPromise,
        ]).then(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              dismissSplash();
              setTimeout(() => prefetchAlbums(), 3000);
            }, 50);
          });
        });
      }
    }

    window.addEventListener('keydown', focusEngine.handleKeyDown);
    window.addEventListener('keyup', focusEngine.handleKeyUp);
    focusEngine.setupPointerListeners();
  });

  onCleanup(() => {
    window.removeEventListener('keydown', focusEngine.handleKeyDown);
    window.removeEventListener('keyup', focusEngine.handleKeyUp);
  });

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setSelectedPlaylist(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(null);
    focusEngine.setSelectedAlbumId(album.id);
    focusEngine.setSelectedPlaylistId(null);
    focusEngine.setSelectedMixGenre(null);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 0);
  };

  const handleSelectPlaylist = (pl: Playlist, coverVariant?: 'station' | 'meshMix') => {
    setSelectedPlaylist(pl);
    setSelectedAlbum(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(coverVariant || null);
    focusEngine.setSelectedPlaylistId(pl.id);
    focusEngine.setSelectedAlbumId(null);
    focusEngine.setSelectedMixGenre(null);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 0);
  };

  const handleSelectMix = (genre: string, coverVariant?: 'meshMix' | 'genreMix') => {
    setSelectedMixGenre(genre);
    setSelectedAlbum(null);
    setSelectedPlaylist(null);
    setSelectedCoverVariant(coverVariant || null);
    focusEngine.setSelectedMixGenre(genre);
    focusEngine.setSelectedAlbumId(null);
    focusEngine.setSelectedPlaylistId(null);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 0);
  };

  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre);
    setSelectedArtist(null);
    focusEngine.setActiveTab('albums');
    focusEngine.setFocus('grid', 0);
  };

  const handleSelectArtist = (artist: string) => {
    setSelectedArtist(artist);
    setSelectedGenre(null);
    focusEngine.setActiveTab('albums');
    focusEngine.setFocus('grid', 0);
  };

  const handleClearFilter = () => {
    setSelectedGenre(null);
    setSelectedArtist(null);
    focusEngine.setFocus('grid', 0);
  };

  const handleCloseDetail = () => {
    focusEngine.setActiveModal('none');
    setSelectedAlbum(null);
    setSelectedPlaylist(null);
    setSelectedMixGenre(null);
    setSelectedCoverVariant(null);
    focusEngine.setFocus('grid', 0);
  };

  return (
    <div class="w-screen h-screen relative flex flex-col overflow-hidden bg-[#0e0e12]">
      <AmbientGlow />
      <ToastNotification />
      <div 
        class="relative w-full h-full flex flex-col z-10"
        classList={{
          'invisible opacity-0': focusEngine.activeModal() === 'nowPlaying',
          'overflow-y-auto': focusEngine.activeTab() !== 'search' && focusEngine.activeModal() !== 'albumDetail',
          'overflow-hidden': focusEngine.activeTab() === 'search' || focusEngine.activeModal() === 'albumDetail',
        }}
      >
        <TopBar />

        <Show
          when={focusEngine.activeModal() !== 'albumDetail'}
          fallback={
            <AlbumDetailView
              albumId={selectedAlbum()?.id}
              playlistId={selectedPlaylist()?.id}
              mixGenre={selectedMixGenre()}
              initialAlbum={selectedAlbum()}
              initialPlaylist={selectedPlaylist()}
              customCoverVariant={selectedCoverVariant()}
              onClose={handleCloseDetail}
            />
          }
        >
          {focusEngine.activeTab() === 'home' ? (
            <HomeView
              onSelectAlbum={handleSelectAlbum}
              onSelectGenre={handleSelectGenre}
              onSelectMix={handleSelectMix}
              onSelectPlaylist={handleSelectPlaylist}
            />
          ) : focusEngine.activeTab() === 'search' ? (
            <SearchView
              onSelectAlbum={handleSelectAlbum}
              onSelectGenre={handleSelectGenre}
              onSelectArtist={handleSelectArtist}
            />
          ) : focusEngine.activeTab() === 'playlists' ? (
            <PlaylistsView onSelectPlaylist={handleSelectPlaylist} />
          ) : focusEngine.activeTab() === 'settings' ? (
            <SettingsView />
          ) : (
            <MainGrid
              onSelectAlbum={handleSelectAlbum}
              selectedGenre={selectedGenre()}
              selectedArtist={selectedArtist()}
              onClearFilter={handleClearFilter}
            />
          )}
        </Show>
      </div>

      {focusEngine.activeModal() === 'nowPlaying' && (
        <NowPlayingView />
      )}

      <Show when={focusEngine.activeModal() === 'profileSelector'}>
        <ProfileSelectorModal
          onClose={() => {
            focusEngine.setActiveModal('none');
            focusEngine.setFocus('topBar', 0);
          }}
          onOpenAddProfile={() => {
            setEditingProfileSignal(null);
            setAddProfileReturnState('selector');
            focusEngine.setActiveModal('addProfileModal');
          }}
        />
      </Show>

      <Show when={focusEngine.activeModal() === 'profileQuickMenu'}>
        <QuickProfileSwitcher
          onClose={() => {
            focusEngine.setActiveModal('none');
            focusEngine.setFocus('topBar', 6);
          }}
          onOpenAddProfile={() => {
            setEditingProfileSignal(null);
            setAddProfileReturnState('topBar');
            focusEngine.setActiveModal('addProfileModal');
          }}
          onManageProfiles={() => {
            focusEngine.setActiveModal('none');
            focusEngine.setActiveTab('settings');
            setTimeout(() => focusEngine.setFocus('settings', 2), 50);
          }}
        />
      </Show>

      <Show when={focusEngine.activeModal() === 'addProfileModal'}>
        <AddProfileModal
          initialProfile={editingProfileSignal()}
          onClose={() => {
            focusEngine.setActiveModal('none');
            setEditingProfileSignal(null);
            if (addProfileReturnState() === 'settings') {
              focusEngine.setActiveTab('settings');
              setTimeout(() => focusEngine.setFocus('settings', 2), 50);
            } else if (addProfileReturnState() === 'selector') {
              focusEngine.setActiveModal('profileSelector');
              setTimeout(() => focusEngine.setFocus('profileSelector', 0), 50);
            } else {
              focusEngine.setFocus('topBar', 0);
            }
          }}
          onSaved={() => {
            focusEngine.setActiveModal('none');
            setEditingProfileSignal(null);
            if (addProfileReturnState() === 'settings') {
              focusEngine.setActiveTab('settings');
              setTimeout(() => focusEngine.setFocus('settings', 2), 50);
            } else if (addProfileReturnState() === 'selector') {
              focusEngine.setActiveModal('profileSelector');
              setTimeout(() => focusEngine.setFocus('profileSelector', 0), 50);
            } else {
              focusEngine.setFocus('topBar', 0);
            }
          }}
        />
      </Show>

      <ExitConfirmModal />
    </div>
  );
};

export default App;
