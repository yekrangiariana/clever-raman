import { Component, createResource, createSignal, For, Show, createEffect } from 'solid-js';
import { api, Playlist } from '../../services/api';
import { PlaylistsIcon } from '../common/Icons';
import { AppleAlertDialog } from './AppleAlertDialog';
import { foldState } from '../../services/foldable';

interface MobileAddToPlaylistSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Song IDs to add. Empty array = create-only mode (no add target) */
  songsToAdd: string[];
}

export const MobileAddToPlaylistSheet: Component<MobileAddToPlaylistSheetProps> = (props) => {
  const [playlists, { refetch }] = createResource(async () => {
    try {
      return await api.getPlaylists();
    } catch (e) {
      console.error('Failed to load playlists', e);
      return [] as Playlist[];
    }
  });

  const [isCreating, setIsCreating] = createSignal(false);
  const [newPlaylistName, setNewPlaylistName] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorDialog, setErrorDialog] = createSignal<string | null>(null);
  const [addedToPlaylists, setAddedToPlaylists] = createSignal<string[]>([]);
  const [knownReadOnly, setKnownReadOnly] = createSignal<string[]>(
    JSON.parse(localStorage.getItem('navios_readonly_playlists') || '[]')
  );

  const markAsReadOnly = (id: string) => {
    const current = knownReadOnly();
    if (!current.includes(id)) {
      const next = [...current, id];
      setKnownReadOnly(next);
      localStorage.setItem('navios_readonly_playlists', JSON.stringify(next));
    }
  };

  const scannedPlaylists = new Set<string>();

  // Reset state every time the sheet opens
  createEffect(() => {
    if (props.isOpen) {
      setIsCreating(false);
      setNewPlaylistName('');
      setAddedToPlaylists([]);
      refetch();
    }
  });

  // Background scanner
  createEffect(() => {
    if (props.isOpen && playlists()) {
      const list = playlists() || [];
      const currentUser = api.getConfig()?.username?.toLowerCase();
      
      list.forEach(async (pl) => {
        // Skip those our heuristics catch
        const owner = pl.owner?.toLowerCase();
        if (owner && currentUser && owner !== currentUser && owner !== 'system') return;
        if (owner === 'system') return;
        if (pl.comment && (pl.comment.trim().startsWith('{') || pl.comment.includes('.nsp'))) return;
        if (pl.name.toLowerCase().endsWith('.nsp')) return;

        const currentKnown = knownReadOnly();
        const isKnownReadOnly = currentKnown.includes(pl.id);

        // 1. Fetch contents to see if our song is already inside (to tick the circle)
        // We only do this if it's NOT a read-only playlist (since we can't add to them anyway)
        if (!isKnownReadOnly) {
          try {
            const details = await api.getPlaylist(pl.id);
            const alreadyIn = details.songs.some(s => props.songsToAdd.includes(s.id));
            if (alreadyIn) {
              setAddedToPlaylists(prev => prev.includes(pl.id) ? prev : [...prev, pl.id]);
            }
          } catch (e) {
            // ignore
          }
        }

        // 2. Test if it's writable (Only if we haven't tested it before!)
        if (!isKnownReadOnly && !scannedPlaylists.has(pl.id)) {
          scannedPlaylists.add(pl.id);
          const isWritable = await api.testPlaylistWritable(pl.id, pl.name);
          if (!isWritable) {
            markAsReadOnly(pl.id);
          }
        }
      });
    }
  });

  const filteredAndSortedPlaylists = () => {
    const list = playlists() || [];
    return list.sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : 0;
      const dateB = b.created ? new Date(b.created).getTime() : 0;
      return dateB - dateA; // Newest first
    });
  };

  // Smooth Native Dragging
  const [translateY, setTranslateY] = createSignal(0);
  let startY = 0;
  
  const handleDragStart = (e: TouchEvent) => { 
    startY = e.touches[0].clientY; 
  };
  
  const handleDragMove = (e: TouchEvent) => {
    if (startY === 0) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleDragEnd = (e: TouchEvent) => {
    if (startY === 0) return;
    const diff = e.changedTouches[0].clientY - startY;
    if (diff > 80 && !isSubmitting()) {
      props.onClose();
      setIsCreating(false);
      setTimeout(() => setTranslateY(0), 300);
    } else {
      setTranslateY(0);
    }
    startY = 0;
  };

  const handleCreate = async () => {
    if (!newPlaylistName().trim() || isSubmitting()) return;
    setIsSubmitting(true);
    try {
      const success = await api.createPlaylist(newPlaylistName().trim(), props.songsToAdd);
      if (success) {
        setIsCreating(false);
        setNewPlaylistName('');
        // Stay open if there are no songs to add (user is browsing playlists view)
        if (props.songsToAdd.length > 0) {
          props.onClose();
        } else {
          refetch();
        }
      } else {
        setErrorDialog('Failed to create the playlist. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToPlaylist = async (pl: Playlist) => {
    if (isSubmitting() || props.songsToAdd.length === 0) return;
    setIsSubmitting(true);
    try {
      if (addedToPlaylists().includes(pl.id)) {
        // Undo / Remove from playlist
        const res = await api.getPlaylist(pl.id);
        const indexes = res.songs
          .map((s, idx) => props.songsToAdd.includes(s.id) ? idx : -1)
          .filter(idx => idx !== -1);
          
        if (indexes.length > 0) {
          const success = await api.removeFromPlaylist(pl.id, indexes);
          if (success) {
            setAddedToPlaylists(addedToPlaylists().filter(id => id !== pl.id));
          }
        } else {
          // If the server didn't return the newly added songs, just clear it locally
          setAddedToPlaylists(addedToPlaylists().filter(id => id !== pl.id));
        }
      } else {
        // Add to playlist
        const success = await api.updatePlaylist(pl.id, props.songsToAdd);
        if (success) {
          setAddedToPlaylists([...addedToPlaylists(), pl.id]);
        } else {
          // If the server explicitly rejects the addition, it is almost certainly a Smart Playlist or read-only.
          markAsReadOnly(pl.id);
          setErrorDialog(`Couldn't add to "${pl.name}". It has been marked as read-only and locked.`);
        }
      }
    } catch (e) {
      console.error(e);
      setErrorDialog('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // On tabletop (half-open fold), the sheet renders more compactly
  const isTabletop = () => foldState().isTabletop;

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!isSubmitting()) { props.onClose(); setIsCreating(false); } }}
      />

      {/* Sheet Panel */}
      <div
        class={`fixed left-0 right-0 bottom-0 z-[151] flex flex-col animate-in slide-in-from-bottom duration-300 ${
          isTabletop()
            ? 'top-[45vh]'
            : 'top-10'
        }`}
        style={{
          transform: translateY() > 0 ? `translateY(${translateY()}px)` : '',
          transition: startY === 0 ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass surface — matches the app's core glassmorphism language */}
        <div class="w-full h-full flex flex-col bg-black/80 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] shadow-2xl overflow-hidden">

          {/* ── Drag Handle ─────────────────────────────────────── */}
          <div 
            class="flex flex-col items-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragEnd}
          >
            <div class="w-10 h-1 rounded-full bg-white/25 mb-2" />
          </div>

          {/* ── Header ──────────────────────────────────────────── */}
          <div class="flex items-center justify-between px-5 py-2.5 shrink-0 border-b border-white/8">
            <Show
              when={isCreating()}
              fallback={
                <>
                  <div class="w-14" />
                  <h2 class="text-[17px] font-bold text-white tracking-tight">
                    {props.songsToAdd.length > 0 ? 'Add to Playlist' : 'Playlists'}
                  </h2>
                  <button
                    onClick={() => { if (!isSubmitting()) { props.onClose(); } }}
                    class="text-[16px] font-bold text-[#fa243c] active:opacity-60 transition-opacity min-w-[56px] text-right"
                  >
                    Done
                  </button>
                </>
              }
            >
              <button
                onClick={() => { setIsCreating(false); setNewPlaylistName(''); }}
                class="text-[15px] font-semibold text-neutral-300 active:text-white transition-colors"
                disabled={isSubmitting()}
              >
                Cancel
              </button>
              <h2 class="text-[17px] font-bold text-white tracking-tight">New Playlist</h2>
              <button
                onClick={handleCreate}
                disabled={!newPlaylistName().trim() || isSubmitting()}
                class="text-[15px] font-bold text-[#fa243c] active:opacity-60 disabled:opacity-30 transition-opacity"
              >
                {isSubmitting() ? 'Creating...' : 'Create'}
              </button>
            </Show>
          </div>

          {/* ── Scrollable Content ──────────────────────────────── */}
          <div class={`flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,20px)] ${isTabletop() ? 'max-h-[40vh]' : ''}`}>

            {/* ─ Create New Playlist form ─ */}
            <Show when={isCreating()}>
              <div class="px-5 pt-5 pb-4 flex flex-col gap-3 animate-in fade-in duration-200">
                <input
                  type="text"
                  value={newPlaylistName()}
                  onInput={(e) => setNewPlaylistName(e.currentTarget.value)}
                  placeholder="Playlist Name"
                  class="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-white placeholder-white/30 focus:outline-none focus:border-[#fa243c]/70 focus:bg-white/15 transition-colors"
                  autofocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                />
                <p class="text-xs text-neutral-500 px-1">
                  {props.songsToAdd.length > 0
                    ? `${props.songsToAdd.length} ${props.songsToAdd.length === 1 ? 'song' : 'songs'} will be added.`
                    : 'Create an empty playlist.'}
                </p>
              </div>
            </Show>

            {/* ─ Playlist list ─ */}
            <Show when={!isCreating()}>
              <div class="flex flex-col px-3 pt-3 pb-2 gap-0.5">

                {/* New Playlist CTA row — red accent, always on top */}
                <button
                  onClick={() => setIsCreating(true)}
                  class="w-full flex items-center gap-3.5 px-2 py-2.5 rounded-2xl active:bg-white/8 active:scale-[0.985] transition-all"
                >
                  <div class="w-[52px] h-[52px] rounded-2xl bg-[#fa243c]/20 border border-[#fa243c]/30 flex items-center justify-center shrink-0">
                    <svg class="w-6 h-6 text-[#fa243c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span class="text-[15px] font-bold text-[#fa243c]">New Playlist…</span>
                </button>

                {/* Separator */}
                <Show when={(playlists() ?? []).length > 0}>
                  <div class="h-px bg-white/8 mx-2 my-1" />
                </Show>

                {/* Loading skeleton */}
                <Show when={playlists.loading}>
                  <div class="py-8 text-center text-[13px] font-semibold text-neutral-500 animate-pulse">
                    Loading…
                  </div>
                </Show>

                {/* Playlist rows */}
                <For each={filteredAndSortedPlaylists()}>
                  {(pl) => {
                    const coverUrl = () => api.getCoverArtUrl(pl.coverArt || pl.id, 150);
                    const canAdd = () => props.songsToAdd.length > 0;
                    const isAdded = () => addedToPlaylists().includes(pl.id);
                    
                    const isEditable = () => {
                      if (knownReadOnly().includes(pl.id)) return false;
                      const currentUser = api.getConfig()?.username?.toLowerCase();
                      const owner = pl.owner?.toLowerCase();
                      // If the owner exists and doesn't match the current user, they probably can't edit it.
                      if (owner && currentUser && owner !== currentUser && owner !== 'system') return false;
                      if (owner === 'system') return false;
                      // Smart playlist heuristics
                      if (pl.comment && (pl.comment.trim().startsWith('{') || pl.comment.includes('.nsp'))) return false;
                      if (pl.name.toLowerCase().endsWith('.nsp')) return false;
                      return true;
                    };

                    const editable = isEditable();

                    return (
                      <button
                        onClick={() => handleAddToPlaylist(pl)}
                        disabled={isSubmitting() || !canAdd() || !editable}
                        class={`w-full flex items-center gap-3.5 px-2 py-2.5 rounded-2xl transition-all ${
                          canAdd() && editable
                            ? 'hover:bg-white/5 active:bg-white/8 active:scale-[0.985]'
                            : ''
                        } ${!editable ? 'opacity-30 cursor-not-allowed grayscale' : 'opacity-100'}`}
                      >
                        {/* Thumbnail */}
                        <div class="w-[52px] h-[52px] rounded-2xl bg-neutral-800/80 border border-white/8 overflow-hidden shrink-0 flex items-center justify-center">
                          <Show
                            when={coverUrl()}
                            fallback={<PlaylistsIcon class="w-6 h-6 text-white/30" />}
                          >
                            <img
                              src={coverUrl()}
                              alt=""
                              class="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </Show>
                        </div>

                        {/* Text */}
                        <div class="flex-1 min-w-0 text-left">
                          <p class="text-[15px] font-semibold text-white truncate leading-snug">{pl.name}</p>
                          <p class="text-[12px] font-medium text-neutral-400 mt-0.5">
                            {pl.songCount} {pl.songCount === 1 ? 'Song' : 'Songs'}
                          </p>
                        </div>

                        {/* Apple-style Checkbox */}
                        <Show when={canAdd()}>
                          <div class="mr-1 shrink-0">
                            <Show when={editable}>
                              <Show
                                when={isAdded()}
                                fallback={
                                  <div class="w-5 h-5 rounded-full border border-white/30 transition-all" />
                                }
                              >
                                <div class="w-5 h-5 rounded-full bg-[#fa243c] flex items-center justify-center transition-all animate-in zoom-in duration-200">
                                  <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </Show>
                            </Show>
                            <Show when={!editable}>
                               <svg class="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                               </svg>
                            </Show>
                          </div>
                        </Show>
                      </button>
                    );
                  }}
                </For>

                {/* Empty state */}
                <Show when={!playlists.loading && filteredAndSortedPlaylists().length === 0}>
                  <div class="py-10 flex flex-col items-center justify-center text-center px-6 gap-2">
                    <PlaylistsIcon class="w-10 h-10 text-neutral-600" />
                    <p class="text-[13px] font-semibold text-neutral-500">No playlists yet</p>
                    <p class="text-[11px] text-neutral-600">Tap "New Playlist" to create one.</p>
                  </div>
                </Show>

              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Error feedback — uses your existing AppleAlertDialog */}
      <AppleAlertDialog
        isOpen={!!errorDialog()}
        title="Something went wrong"
        message={errorDialog() ?? ''}
        confirmText="OK"
        cancelText=""
        destructive={false}
        onConfirm={() => setErrorDialog(null)}
        onClose={() => setErrorDialog(null)}
      />
    </Show>
  );
};
