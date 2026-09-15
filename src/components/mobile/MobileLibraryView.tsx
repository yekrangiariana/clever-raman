import { Component, Show } from 'solid-js';
import { Album, Playlist } from '../../services/api';
import { MobileDownloadedView } from "./MobileDownloadedView";
import { Capacitor } from "@capacitor/core";
import { offlineManifest } from "../../services/offlineSync";
import { MobileAlbumsView } from './MobileAlbumsView';
import { MobilePlaylistsView } from './MobilePlaylistsView';
import { globalLibrarySegment, setGlobalLibrarySegment } from '../../services/uiState';

interface MobileLibraryViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MobileLibraryView: Component<MobileLibraryViewProps> = (props) => {
  return (
    <div class="w-full flex flex-col gap-3 pb-28 pt-2 px-4">
      {/* Native UISegmentedControl-style — tight, quiet, consistent with app dark language */}
      <div class="w-full p-1 rounded-[10px] flex items-center gap-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setGlobalLibrarySegment('albums')}
          class={`flex-1 py-[7px] rounded-[8px] text-[13px] font-semibold transition-all duration-150 text-center active:opacity-70 tracking-[-0.2px] ${
            globalLibrarySegment() === 'albums'
              ? 'bg-white/18 text-white shadow-sm'
              : 'text-neutral-400'
          }`}
        >
          Albums
        </button>

        <button
          onClick={() => setGlobalLibrarySegment('playlists')}
          class={`flex-1 py-[7px] rounded-[8px] text-[13px] font-semibold transition-all duration-150 text-center active:opacity-70 tracking-[-0.2px] ${
            globalLibrarySegment() === 'playlists'
              ? 'bg-white/18 text-white shadow-sm'
              : 'text-neutral-400'
          }`}
        >
          Playlists
        </button>

        <Show when={Capacitor.isNativePlatform()}>
          <button
            onClick={() => setGlobalLibrarySegment('downloads')}
            class={`flex-1 py-[7px] rounded-[8px] text-[13px] font-semibold transition-all duration-150 text-center active:opacity-70 tracking-[-0.2px] ${
              globalLibrarySegment() === 'downloads'
                ? 'bg-[#fa243c]/90 text-white shadow-sm'
                : 'text-neutral-400'
            }`}
          >
            Downloads
          </button>
        </Show>
      </div>

      {/* Segment Content */}
      <Show when={globalLibrarySegment() === 'albums'}>
        <div class="-mx-4">
          <MobileAlbumsView
            onSelectAlbum={props.onSelectAlbum}
            selectedGenre={null}
            selectedArtist={null}
            onClearFilter={() => {}}
          />
        </div>
      </Show>

      <Show when={globalLibrarySegment() === 'playlists'}>
        <div class="-mx-4">
          <MobilePlaylistsView
            onSelectPlaylist={props.onSelectPlaylist}
          />
        </div>
      </Show>

      <Show when={globalLibrarySegment() === 'downloads'}>
        <MobileDownloadedView
          onSelectAlbum={props.onSelectAlbum}
          onSelectPlaylist={props.onSelectPlaylist}
        />
      </Show>
    </div>
  );
};
