import { createSignal } from 'solid-js';
import { Album } from './api';

export const [globalAlbumMenuTarget, setGlobalAlbumMenuTarget] = createSignal<{
  album: Album;
  triggerRect: DOMRect;
} | null>(null);

export const [isSharingMedia, setIsSharingMedia] = createSignal(false);

export type MobileTab = "home" | "library" | "search" | "settings";
export const [globalActiveTab, setGlobalActiveTab] = createSignal<MobileTab>("home");
export const [globalSearchQuery, setGlobalSearchQuery] = createSignal("");
export const [globalSelectedAlbumId, setGlobalSelectedAlbumId] = createSignal<string | null>(null);
export const [globalSelectedPlaylistId, setGlobalSelectedPlaylistId] = createSignal<string | null>(null);
export const [globalLibrarySegment, setGlobalLibrarySegment] = createSignal<'albums' | 'playlists'>('albums');
