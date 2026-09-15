import { Component, createMemo, createSignal, For, Show } from 'solid-js';
import { offlineManifest, removeCollection } from '../../services/offlineSync';
import { api, Album, Playlist } from '../../services/api';
import { MusicNoteIcon, TrashIcon } from '../common/Icons';
import { AppleAlertDialog } from './AppleAlertDialog';

interface MobileDownloadedViewProps {
  onSelectAlbum: (album: Album) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MobileDownloadedView: Component<MobileDownloadedViewProps> = (props) => {
  const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(null);

  const downloads = createMemo(() => {
    const manifest = offlineManifest();
    return Object.keys(manifest).map((id) => {
      const data = manifest[id];
      return {
        id,
        type: data.type,
        metadata: data.metadata,
        songCount: Object.keys(data.songs || {}).length
      };
    });
  });

  return (
    <div class="w-full flex flex-col gap-4 pb-12 pt-2">
      <Show when={downloads().length === 0}>
        <div class="flex flex-col items-center justify-center py-20 text-center px-6">
          <div class="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h3 class="text-white font-bold text-lg">No Downloads</h3>
          <p class="text-neutral-500 text-sm mt-1">
            Albums and playlists you download will appear here for offline playback.
          </p>
        </div>
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
        <For each={downloads()}>
          {(item) => {
            const title = item.metadata.title || item.metadata.name;
            const artist = item.metadata.artist;
            const coverUrl = item.metadata.coverArt 
              ? api.getCoverArtUrl(item.metadata.coverArt, 300) 
              : item.metadata.id 
                ? api.getCoverArtUrl(item.metadata.id, 300) 
                : null;
            
            return (
              <div 
                class="flex flex-col cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  if (item.type === 'album') {
                    props.onSelectAlbum(item.metadata as Album);
                  } else {
                    props.onSelectPlaylist(item.metadata as Playlist);
                  }
                }}
              >
                <div class="w-full aspect-square rounded-xl bg-neutral-900 overflow-hidden mb-2 relative group shadow-md border border-white/5">
                  <Show 
                    when={coverUrl}
                    fallback={
                      <div class="w-full h-full flex items-center justify-center text-neutral-700">
                        <MusicNoteIcon class="w-12 h-12" />
                      </div>
                    }
                  >
                    <img src={coverUrl!} alt={title} class="w-full h-full object-cover" loading="lazy" />
                  </Show>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(item.id);
                    }}
                    class="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/70 hover:text-red-400 opacity-80"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <h4 class="text-white font-bold text-sm tracking-tight leading-tight truncate px-0.5">{title}</h4>
                <p class="text-neutral-400 text-xs truncate mt-0.5 px-0.5">{artist || `${item.songCount} Tracks`}</p>
              </div>
            );
          }}
        </For>
      </div>

      {/* Apple-Style Confirmation Dialog for Download Removal */}
      <AppleAlertDialog
        isOpen={!!deleteTargetId()}
        title="Remove Download?"
        message="This will remove the downloaded media from your device. You can redownload it anytime."
        confirmText="Remove"
        cancelText="Cancel"
        destructive={true}
        onConfirm={() => {
          const id = deleteTargetId();
          if (id) removeCollection(id);
        }}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
