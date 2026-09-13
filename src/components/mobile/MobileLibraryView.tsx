import { Component, createSignal, Show } from 'solid-js';
import { Album, Playlist } from '../../services/api';
import { MobileAlbumsView } from './MobileAlbumsView';
import { MobilePlaylistsView } from './MobilePlaylistsView';

interface MobileLibraryViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MobileLibraryView: Component<MobileLibraryViewProps> = (props) => {
  const [segment, setSegment] = createSignal<'albums' | 'playlists' | 'starred'>('albums');

  return (
    <div class="w-full flex flex-col gap-3 pb-28 pt-2 px-4">
      {/* Apple Music Segmented Control Switcher */}
      <div class="w-full p-1 bg-neutral-900/90 border border-white/10 rounded-xl flex items-center justify-between shadow-inner">
        <button
          onClick={() => setSegment('albums')}
          class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            segment() === 'albums'
              ? 'bg-neutral-800 text-white shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Albums
        </button>

        <button
          onClick={() => setSegment('playlists')}
          class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            segment() === 'playlists'
              ? 'bg-neutral-800 text-white shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Playlists
        </button>
      </div>

      {/* Segment Content */}
      <Show when={segment() === 'albums'}>
        <div class="-mx-4">
          <MobileAlbumsView
            onSelectAlbum={props.onSelectAlbum}
            selectedGenre={null}
            selectedArtist={null}
            onClearFilter={() => {}}
          />
        </div>
      </Show>

      <Show when={segment() === 'playlists'}>
        <div class="-mx-4">
          <MobilePlaylistsView
            onSelectPlaylist={props.onSelectPlaylist}
          />
        </div>
      </Show>

      <Show when={segment() === 'starred'}>
        <div class="-mx-4">
          <MobileAlbumsView
            onSelectAlbum={props.onSelectAlbum}
            selectedGenre={null}
            selectedArtist={null}
            onClearFilter={() => {}}
          />
        </div>
      </Show>
    </div>
  );
};
