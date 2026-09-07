import { Component, onMount, onCleanup, createSignal } from 'solid-js';
import { api, Album, Playlist } from './services/api';
import { audioPlayer } from './services/audio';
import { focusEngine } from './services/focus';
import { AmbientGlow } from './components/AmbientGlow';
import { TopBar } from './components/TopBar';
import { HomeView } from './components/HomeView';
import { MainGrid } from './components/MainGrid';
import { PlaylistsView } from './components/PlaylistsView';
import { AlbumDetailView } from './components/AlbumDetailView';
import { NowPlayingView } from './components/NowPlayingView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';

import { ToastNotification } from './components/common/ToastNotification';
import { ExitConfirmModal } from './components/common/ExitConfirmModal';

export const App: Component = () => {
  const [selectedAlbum, setSelectedAlbum] = createSignal<Album | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = createSignal<string | null>(null);
  const [selectedMixGenre, setSelectedMixGenre] = createSignal<string | null>(null);
  const [selectedGenre, setSelectedGenre] = createSignal<string | null>(null);
  const [selectedArtist, setSelectedArtist] = createSignal<string | null>(null);

  onMount(() => {
    // Hold splash screen for a smooth, high-quality entrance, then fade out smoothly
    const splash = document.getElementById('app-splash');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 500);
      }, 1200);
    }

    if (!api.isConfigured()) {
      focusEngine.setActiveTab('settings');
      focusEngine.setFocus('settings', 0);
    } else {
      focusEngine.setFocus('topBar', 0);
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
    setSelectedPlaylistId(null);
    setSelectedMixGenre(null);
    focusEngine.setSelectedAlbumId(album.id);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 1);
  };

  const handleSelectPlaylist = (pl: Playlist) => {
    setSelectedPlaylistId(pl.id);
    setSelectedAlbum(null);
    setSelectedMixGenre(null);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 1);
  };

  const handleSelectMix = (genre: string) => {
    setSelectedMixGenre(genre);
    setSelectedAlbum(null);
    setSelectedPlaylistId(null);
    focusEngine.setActiveModal('albumDetail');
    focusEngine.setFocus('albumDetail', 1);
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
    setSelectedPlaylistId(null);
    setSelectedMixGenre(null);
    focusEngine.setFocus('grid', 0);
  };

  const nowPlayingBackLabel = () => {
    if (selectedPlaylistId()) return 'Back to Playlist';
    if (selectedMixGenre()) return 'Back to Mix';
    if (selectedAlbum() || audioPlayer.currentTrack()?.albumId) return 'Back to Album';
    return 'Back to Library';
  };

  const handleBackFromNowPlaying = () => {
    if (selectedAlbum() || selectedPlaylistId() || selectedMixGenre()) {
      focusEngine.setActiveModal('albumDetail');
      focusEngine.setFocus('albumDetail', 1);
    } else if (audioPlayer.currentTrack()?.albumId) {
      const t = audioPlayer.currentTrack()!;
      setSelectedAlbum({
        id: t.albumId!,
        title: t.album || 'Album',
        artist: t.artist || '',
        coverArt: t.coverArt,
      } as Album);
      focusEngine.setSelectedAlbumId(t.albumId!);
      focusEngine.setActiveModal('albumDetail');
      focusEngine.setFocus('albumDetail', 1);
    } else {
      focusEngine.setActiveModal('none');
      focusEngine.setFocus('grid', 0);
    }
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

        {focusEngine.activeModal() === 'albumDetail' && (selectedAlbum() || selectedPlaylistId() || selectedMixGenre()) ? (
          <AlbumDetailView
            albumId={selectedAlbum()?.id}
            playlistId={selectedPlaylistId()}
            mixGenre={selectedMixGenre()}
            onClose={handleCloseDetail}
          />
        ) : focusEngine.activeTab() === 'home' ? (
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
      </div>

      {focusEngine.activeModal() === 'nowPlaying' && (
        <NowPlayingView
          onBack={handleBackFromNowPlaying}
          backLabel={nowPlayingBackLabel()}
        />
      )}

      <ExitConfirmModal />
    </div>
  );
};

export default App;
