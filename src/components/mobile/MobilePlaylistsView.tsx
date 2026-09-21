import { Component, createResource, createSignal, createMemo, For, Show } from 'solid-js';
import { FadeImage } from '../common/FadeImage';
import { api, Playlist } from '../../services/api';
import { PlaylistsIcon, TrashIcon } from '../common/Icons';
import { MobileAddToPlaylistSheet } from './MobileAddToPlaylistSheet';
import { AppleContextMenu, ContextMenuGroup } from './AppleContextMenu';
import { AppleAlertDialog } from './AppleAlertDialog';
import { createLongPress } from '../../hooks/useLongPress';
import { audioPlayer } from '../../services/audio';
import { Capacitor } from '@capacitor/core';

interface MobilePlaylistsViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MobilePlaylistsView: Component<MobilePlaylistsViewProps> = (props) => {
  const [showCreate, setShowCreate] = createSignal(false);
  const [sortMode, setSortMode] = createSignal<'recent' | 'alphabetical'>('recent');

  const [menuTargetPlaylist, setMenuTargetPlaylist] = createSignal<{ pl: Playlist; rect: DOMRect } | null>(null);
  const [deleteConfirmPlaylist, setDeleteConfirmPlaylist] = createSignal<Playlist | null>(null);

  const [playlists, { refetch }] = createResource(async () => {
    try {
      return await api.getPlaylists();
    } catch (e) {
      console.error('Failed to load playlists', e);
      return [];
    }
  }, { initialValue: api.getCachedPlaylists() });

  const sortedPlaylists = createMemo(() => {
    const list = playlists() || [];
    const sorted = [...list];
    if (sortMode() === 'recent') {
      sorted.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  });

  return (
    <div class="w-full flex flex-col gap-4 pb-28 pt-2 px-4">
      {/* Sort label + add button row */}
      <div class="flex items-center justify-between h-10 px-0.5">
        {/* Single sort label — Apple Music style */}
        {(() => {
          const [sortMenuRect, setSortMenuRect] = createSignal<DOMRect | null>(null);
          const sortLabel = () => sortMode() === 'recent' ? 'Recently Added' : 'Alphabetical';
          return (
            <>
              <button
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setSortMenuRect(rect);
                }}
                class="flex items-center gap-1 text-[#fa243c] active:opacity-50 transition-opacity"
              >
                <span class="text-sm font-bold tracking-tight">Sort by {sortLabel()}</span>
                <svg class="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <AppleContextMenu
                isOpen={!!sortMenuRect()}
                triggerRect={sortMenuRect()!}
                onClose={() => setSortMenuRect(null)}
                groups={[{
                  items: [
                    { label: 'Recently Added', onClick: () => { setSortMode('recent'); setSortMenuRect(null); } },
                    { label: 'Alphabetical',   onClick: () => { setSortMode('alphabetical'); setSortMenuRect(null); } },
                  ]
                }]}
              />
            </>
          );
        })()}

        {/* Add playlist button */}
        <button
          onClick={() => setShowCreate(true)}
          class="p-2 -mr-2 text-[#fa243c] active:scale-90 transition-transform flex items-center justify-center"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

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
        <For each={sortedPlaylists()}>
          {(pl) => {
            const coverUrl = () => api.getCoverArtUrl(pl.coverArt || pl.id, 300);
            const longPress = createLongPress(
              (e, targetElement) => {
                const rect = targetElement.getBoundingClientRect();
                setMenuTargetPlaylist({ pl, rect });
              },
              () => props.onSelectPlaylist(pl)
            );
            return (
              <div
                onTouchStart={longPress.onTouchStart}
                onTouchMove={longPress.onTouchMove}
                onTouchEnd={longPress.onTouchEnd}
                onTouchCancel={longPress.onTouchCancel}
                onMouseDown={longPress.onMouseDown}
                onMouseLeave={longPress.onMouseLeave}
                onMouseUp={longPress.onMouseUp}
                onClick={longPress.onClick}
                onContextMenu={longPress.onContextMenu}
                class="flex flex-col active:scale-95 transition-transform cursor-pointer [-webkit-touch-callout:none]"
                data-context-target="true"
              >
                <div class="aspect-square w-full rounded-2xl bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-neutral-900 overflow-hidden shadow-lg border border-white/10 mb-2 relative flex items-center justify-center pointer-events-none">
                  <Show
                    when={api.getCustomPlaylistCover(pl.id) || coverUrl()}
                    fallback={
                      <PlaylistsIcon class="w-12 h-12 text-white/60" />
                    }
                  >
                    <FadeImage src={api.getCustomPlaylistCover(pl.id) || coverUrl()}
                      alt={pl.name}
                      class="w-full h-full "
                      loading="lazy"
                    />
                  </Show>
                </div>

                <p class="text-sm font-bold text-white truncate leading-tight pointer-events-none">
                  {pl.name}
                </p>
                <p class="text-xs font-medium text-neutral-400 truncate mt-0.5 pointer-events-none">
                  {pl.songCount} {pl.songCount === 1 ? 'Track' : 'Tracks'}
                </p>
              </div>
            );
          }}
        </For>
      </div>

      <MobileAddToPlaylistSheet
        isOpen={showCreate()}
        onClose={() => {
          setShowCreate(false);
          refetch(); // Reload playlists after creating a new one
        }}
        songsToAdd={[]}
      />

      <AppleContextMenu
        isOpen={!!menuTargetPlaylist()}
        triggerRect={menuTargetPlaylist()?.rect}
        onClose={() => setMenuTargetPlaylist(null)}
        groups={(() => {
          const target = menuTargetPlaylist();
          if (!target) return [];
          
          const g: ContextMenuGroup[] = [
            {
              items: [
                {
                  label: 'Play Now',
                  icon: (
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  onClick: async () => {
                    const pl = target.pl;
                    setMenuTargetPlaylist(null);
                    const res = await api.getPlaylist(pl.id);
                    if (res.songs.length > 0) {
                      audioPlayer.playTrack(res.songs[0], res.songs, 0);
                    }
                  }
                },
                {
                  label: 'Play Last',
                  icon: (
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10m4-4v8m-4-4h8" />
                    </svg>
                  ),
                  onClick: async () => {
                    const pl = target.pl;
                    setMenuTargetPlaylist(null);
                    const res = await api.getPlaylist(pl.id);
                    if (res.songs.length > 0) {
                      audioPlayer.addToUserQueue(res.songs, false);
                    }
                  }
                }
              ]
            }
          ];

          g.push({
            items: [
              {
                label: 'Change Cover',
                icon: (
                  <svg class="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                onClick: () => {
                  const pl = target.pl;
                  setMenuTargetPlaylist(null);
                  
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        const b64 = re.target?.result as string;
                        api.setCustomPlaylistCover(pl.id, b64);
                        refetch();
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }
              },
              {
                label: 'Delete Playlist',
                destructive: true,
                icon: <TrashIcon class="w-5 h-5 text-red-500" />,
                onClick: () => {
                  setDeleteConfirmPlaylist(target.pl);
                  setMenuTargetPlaylist(null);
                },
              },
            ]
          });

          return g;
        })()}
      />

      <AppleAlertDialog
        isOpen={!!deleteConfirmPlaylist()}
        title="Delete Playlist?"
        message={`Are you sure you want to delete "${deleteConfirmPlaylist()?.name}"? This action cannot be undone and will delete it from your server.`}
        confirmText="Delete"
        cancelText="Cancel"
        destructive={true}
        onConfirm={async () => {
          const target = deleteConfirmPlaylist();
          if (target) {
            await api.deletePlaylist(target.id);
            refetch();
          }
          setDeleteConfirmPlaylist(null);
        }}
        onClose={() => setDeleteConfirmPlaylist(null)}
      />
    </div>
  );
};
