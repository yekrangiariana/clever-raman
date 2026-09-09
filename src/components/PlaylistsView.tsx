import { Component, For, createResource, createEffect } from 'solid-js';
import { api, Playlist } from '../services/api';
import { focusEngine } from '../services/focus';
import { PlaylistsIcon } from './common/Icons';
import { sessionVersionSignal } from '../services/profiles';

interface PlaylistsViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const PlaylistsView: Component<PlaylistsViewProps> = (props) => {
  const resourceSource = () => ({
    configured: api.isConfigured(),
    configKey: api.getConfig()?.serverUrl || '',
    version: sessionVersionSignal(),
  });

  const [playlists] = createResource(resourceSource, async ({ configured }) => {
    if (!configured) return [];
    try {
      return await api.getPlaylists();
    } catch (e) {
      console.error('Failed to load playlists', e);
      return [];
    }
  });

  createEffect(() => {
    focusEngine.setGridColumns(4);
    if (playlists()) {
      focusEngine.setSectionLength('grid', playlists()!.length);
    }
  });

  return (
    <main class="flex-1 pt-4 px-16 pb-64 z-10 w-full flex flex-col gap-8">
      {/* Header */}
      <div class="flex flex-col gap-2">
        <h1 class="text-6xl font-black text-white tracking-tight">Playlists</h1>
        <p class="text-2xl text-neutral-400 font-semibold">Your personal music playlists from Navidrome</p>
      </div>

      {playlists.loading && (
        <div class="flex items-center justify-center h-64">
          <div class="text-3xl text-neutral-400 animate-pulse font-bold">Loading playlists...</div>
        </div>
      )}

      {playlists.error && (
        <div class="p-10 rounded-3xl bg-red-950/60 border border-red-800 text-red-200 text-3xl font-bold">
          Error loading playlists: {String(playlists.error)}
        </div>
      )}

      {playlists() && playlists()!.length === 0 && !playlists.loading && (
        <div class="flex items-center justify-center h-64 text-neutral-400 text-3xl font-semibold">
          No playlists found in your Navidrome library.
        </div>
      )}

      {playlists() && playlists()!.length > 0 && (
        <div class="grid grid-cols-4 gap-10 pb-24">
          <For each={playlists()}>
            {(pl, index) => {
              const coverUrl = () => api.getCoverArtUrl(pl.coverArt || pl.id, 400);
              return (
                <div
                  onClick={() => props.onSelectPlaylist(pl)}
                  class="flex flex-col cursor-pointer scroll-mb-24"
                  data-card-wrapper="true"
                >
                  <div
                    class="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900 shadow-xl relative"
                    data-focusable="true"
                    data-section="grid"
                    data-index={index()}
                  >
                    {coverUrl() ? (
                      <img
                        src={coverUrl()}
                        alt={pl.name}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-neutral-950 text-white">
                        <PlaylistsIcon class="w-24 h-24 text-white/80" />
                      </div>
                    )}
                  </div>

                  <div class="flex flex-col mt-3 px-0.5">
                    <h3 class="text-2xl font-extrabold text-white leading-tight truncate">
                      {pl.name}
                    </h3>
                    <p class="text-xl font-bold text-neutral-400 truncate mt-0.5">
                      {pl.songCount} {pl.songCount === 1 ? 'Track' : 'Tracks'}
                    </p>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      )}
    </main>
  );
};
