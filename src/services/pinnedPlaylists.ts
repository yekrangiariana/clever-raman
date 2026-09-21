import { createSignal, createEffect } from 'solid-js';
import { getScopedKey, activeProfileSignal } from './profiles';

const BASE_STORAGE_KEY = 'navios_pinned_playlists';

function loadPinnedIds(): string[] {
  try {
    const stored = localStorage.getItem(getScopedKey(BASE_STORAGE_KEY));
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export const [pinnedPlaylistIds, setPinnedPlaylistIds] = createSignal<string[]>(loadPinnedIds());

// React to profile changes to load the correct user's pinned playlists
createEffect(() => {
  activeProfileSignal();
  setPinnedPlaylistIds(loadPinnedIds());
});

export function isPlaylistPinned(id?: string): boolean {
  if (!id) return false;
  return pinnedPlaylistIds().includes(id);
}

export function togglePinPlaylist(id?: string): void {
  if (!id) return;
  const current = pinnedPlaylistIds();
  let updated: string[];
  if (current.includes(id)) {
    updated = current.filter((item) => item !== id);
  } else {
    updated = [id, ...current]; // Newest pinned first
  }
  setPinnedPlaylistIds(updated);
  try {
    localStorage.setItem(getScopedKey(BASE_STORAGE_KEY), JSON.stringify(updated));
  } catch (e) {}
}
