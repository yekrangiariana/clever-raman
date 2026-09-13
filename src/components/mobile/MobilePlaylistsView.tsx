import { Component, createResource, For, Show } from 'solid-js';
import { api, Playlist } from '../../services/api';
import { PlaylistsIcon } from '../common/Icons';

interface MobilePlaylistsViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MobilePlaylistsView: Component<MobilePlaylistsViewProps> = (props) => {
  const [playlists] = createResource(async () => {
    try {
      return await api.getPlaylists();
    } catch (e) {
      console.error('Failed to load playlists', e);
      return [];
    }
  });

  return (
    <div class="w-full flex flex-col gap-4 pb-28 pt-2 px-4">
      <Show when={playlists.loading}>
        <div class="py-12 flex items-center justify-center text-xs font-bold text-neutral-500 animate-pulse">
          Loading Playlists...
        </div>
      </Show>

      <Show when={playlists() && playlists()!.length === 0 && !playlists.loading}>
        <div class="py-16 flex flex-col items-center justify-center text-center px-6">
          <PlaylistsIcon class="w-16 h-16 text-neutral-600 mb-3" />
          <h3 class="text-base font-bold text-white">No Playlists Found</h3>
          <p class="text-xs text-neutral-400 mt-1">
            Create playlists in your Navidrome server and they will appear here.
          </p>
        </div>
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <For each={playlists()}>
          {(pl) => {
            const coverUrl = () => api.getCoverArtUrl(pl.coverArt || pl.id, 300);
            return (
              <div
                onClick={() => props.onSelectPlaylist(pl)}
                class="flex flex-col active:scale-95 transition-transform cursor-pointer"
              >
                <div class="aspect-square w-full rounded-2xl bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-neutral-900 overflow-hidden shadow-lg border border-white/10 mb-2 relative flex items-center justify-center">
                  <Show
                    when={coverUrl()}
                    fallback={
                      <PlaylistsIcon class="w-12 h-12 text-white/60" />
                    }
                  >
                    <img
                      src={coverUrl()}
                      alt={pl.name}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Show>
                </div>

                <p class="text-sm font-bold text-white truncate leading-tight">
                  {pl.name}
                </p>
                <p class="text-xs font-medium text-neutral-400 truncate mt-0.5">
                  {pl.songCount} {pl.songCount === 1 ? 'Track' : 'Tracks'}
                </p>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
