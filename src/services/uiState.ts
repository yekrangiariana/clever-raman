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
export const [globalStorageSheetOpen, setGlobalStorageSheetOpen] = createSignal<boolean>(false);
export const [debugLogs, setDebugLogs] = createSignal<string[]>([]);
export const addDebugLog = (msg: string) => {
  setDebugLogs(prev => [...prev, `${new Date().toISOString().substring(11, 23)} - ${msg}`].slice(-15));
};

export const [globalLibrarySegment, setGlobalLibrarySegment] = createSignal<'albums' | 'playlists' | 'downloads'>('albums');
