import { createSignal } from 'solid-js';
import { api } from './api';

const [starredTrackIds, setStarredTrackIds] = createSignal<Set<string>>(new Set());
const [starredAlbumIds, setStarredAlbumIds] = createSignal<Set<string>>(new Set());

export function isTrackStarred(trackId?: string): boolean {
  if (!trackId) return false;
  return starredTrackIds().has(trackId);
}

export function isAlbumStarred(albumId?: string): boolean {
  if (!albumId) return false;
  return starredAlbumIds().has(albumId);
}

export function setTrackStarredState(trackId: string, isStarred: boolean) {
  if (!trackId) return;
  setStarredTrackIds(prev => {
    const next = new Set(prev);
    if (isStarred) {
      next.add(trackId);
    } else {
      next.delete(trackId);
    }
    return next;
  });
}

export function setAlbumStarredState(albumId: string, isStarred: boolean) {
  if (!albumId) return;
  setStarredAlbumIds(prev => {
    const next = new Set(prev);
    if (isStarred) {
      next.add(albumId);
    } else {
      next.delete(albumId);
    }
    return next;
  });
}

export async function toggleTrackStar(trackId: string, currentState?: boolean): Promise<boolean> {
  if (!trackId) return false;
  const currentlyStarred = currentState !== undefined ? currentState : isTrackStarred(trackId);
  const nextState = !currentlyStarred;

  // Optimistic update
  setTrackStarredState(trackId, nextState);

  try {
    if (nextState) {
      await api.star(trackId);
    } else {
      await api.unstar(trackId);
    }
    return true;
  } catch (e) {
    console.error('Failed to toggle track star', e);
    // Revert on error
    setTrackStarredState(trackId, currentlyStarred);
    return false;
  }
}

export async function toggleAlbumStar(albumId: string, currentState?: boolean): Promise<boolean> {
  if (!albumId) return false;
  const currentlyStarred = currentState !== undefined ? currentState : isAlbumStarred(albumId);
  const nextState = !currentlyStarred;

  // Optimistic update
  setAlbumStarredState(albumId, nextState);

  try {
    if (nextState) {
      await api.star(albumId, true);
    } else {
      await api.unstar(albumId, true);
    }
    return true;
  } catch (e) {
    console.error('Failed to toggle album star', e);
    // Revert on error
    setAlbumStarredState(albumId, currentlyStarred);
    return false;
  }
}
