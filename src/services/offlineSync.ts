import { createSignal } from 'solid-js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { api, Song } from './api';

// Manifest format: { [collectionId]: { type: 'album'|'playlist', metadata: any, songs: { [songId]: 'localPath' } } }
type OfflineManifest = Record<string, {
  type: 'album' | 'playlist';
  metadata: any;
  songs: Record<string, string>;
}>;

const MANIFEST_KEY = 'navios_offline_manifest';

const loadManifest = (): OfflineManifest => {
  try {
    const data = localStorage.getItem(MANIFEST_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

let saveTimeout: any;
const saveManifest = (manifest: OfflineManifest) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  }, 1000);
};

export const forceSaveManifest = (manifest: OfflineManifest) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
};

export const [offlineManifest, setOfflineManifest] = createSignal<OfflineManifest>(loadManifest());
export const [activeDownloads, setActiveDownloads] = createSignal<Set<string>>(new Set());
export const [downloadProgress, setDownloadProgress] = createSignal<Record<string, { current: number, total: number }>>({});

export interface StorageStats {
  totalBytes: number;
  deviceTotalBytes: number; // Added this
  songCount: number;
  collections: {
    id: string;
    type: 'album' | 'playlist';
    name: string;
    coverArt: string;
    bytes: number;
    songCount: number;
  }[];
}

export const getStorageStats = async (): Promise<StorageStats> => {
  if (!Capacitor.isNativePlatform()) {
    return { totalBytes: 0, deviceTotalBytes: 100 * 1024 * 1024 * 1024, songCount: 0, collections: [] };
  }
  
  const manifest = offlineManifest();
  const fileSizes = new Map<string, number>();
  
  for (const cid of Object.keys(manifest)) {
    if (manifest[cid].songs) {
      for (const path of Object.values(manifest[cid].songs)) {
        if (!fileSizes.has(path)) {
          fileSizes.set(path, 0);
        }
      }
    }
  }

  let totalBytes = 0;
  for (const path of fileSizes.keys()) {
    try {
      let stat;
      if (path.startsWith('file://') || path.startsWith('/')) {
        stat = await Filesystem.stat({ path });
      } else {
        stat = await Filesystem.stat({ path, directory: Directory.Data });
      }
      fileSizes.set(path, stat.size);
      totalBytes += stat.size;
    } catch (e) {
      // file missing
      console.warn('Could not stat file', path, e);
    }
  }

  // Get total device space using @capacitor-community/device if available
  let deviceTotalBytes = Math.max(64 * 1024 * 1024 * 1024, totalBytes * 2); // fallback
  try {
    const { CommunityDevice } = await import('@capacitor-community/device');
    const info = await CommunityDevice.getInfo();
    if (info.realDiskTotal && info.realDiskTotal > 0) {
      deviceTotalBytes = info.realDiskTotal;
    } else if (info.diskTotal && (info.diskTotal as number) > 0) {
      deviceTotalBytes = (info.diskTotal as number);
    } else if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota && est.quota > 0) {
        deviceTotalBytes = est.quota;
      }
    }
  } catch (e) {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.quota && est.quota > 0) {
          deviceTotalBytes = est.quota;
        }
      } catch (e) {}
    }
  }

  const collections = Object.keys(manifest).map(cid => {
    const m = manifest[cid];
    let bytes = 0;
    if (m.songs) {
      for (const path of Object.values(m.songs)) {
        bytes += (fileSizes.get(path) || 0);
      }
    }
    
    const name = m.metadata?.name || m.metadata?.title || (m.type === 'album' ? 'Unknown Album' : 'Unknown Playlist');
    const coverArt = m.metadata?.coverArt || m.metadata?.id || cid;

    return {
      id: cid,
      type: m.type,
      name,
      coverArt,
      bytes,
      songCount: Object.keys(m.songs || {}).length
    };
  });

  return {
    totalBytes,
    deviceTotalBytes,
    songCount: fileSizes.size,
    collections: collections.sort((a, b) => b.bytes - a.bytes)
  };
};

export const isAlbumDownloaded = (albumId: string) => {
  const manifest = offlineManifest();
  return !!manifest[albumId] && Object.keys(manifest[albumId].songs || {}).length > 0;
};

export const getGlobalSongPath = (songId: string): string | null => {
  const manifest = offlineManifest();
  for (const collectionId of Object.keys(manifest)) {
    if (manifest[collectionId].songs && manifest[collectionId].songs[songId]) {
      return manifest[collectionId].songs[songId];
    }
  }
  return null;
};

export const getLocalSongUrl = (songId: string): string | null => {
  if (!Capacitor.isNativePlatform()) return null;
  const path = getGlobalSongPath(songId);
  return path ? Capacitor.convertFileSrc(path) : null;
};

export const downloadCollection = async (
  collectionId: string, 
  songs: Song[], 
  type: 'album' | 'playlist',
  metadata: any
) => {
  if (!Capacitor.isNativePlatform() || songs.length === 0) return;
  
  setActiveDownloads(prev => new Set(prev).add(collectionId));
  setDownloadProgress(prev => ({ ...prev, [collectionId]: { current: 0, total: songs.length } }));

  try {
    const config = api.getConfig();
    setOfflineManifest(prev => {
      const next = { ...prev };
      next[collectionId] = next[collectionId] || { type, metadata, songs: {} };
      return next;
    });

    // Create global shared songs directory
    try {
      await Filesystem.mkdir({
        path: `navios_offline/songs`,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (e) {
      // Ignore if it already exists
    }

    let completed = 0;
    const MAX_CONCURRENT = 3;
    const downloadQueue = [...songs];
    const activePromises = new Set<Promise<void>>();

    const updateProgress = () => {
      completed++;
      setDownloadProgress(prev => ({ ...prev, [collectionId]: { current: completed, total: songs.length } }));
    };

    while (downloadQueue.length > 0 || activePromises.size > 0) {
      if (downloadQueue.length > 0 && activePromises.size < MAX_CONCURRENT) {
        const song = downloadQueue.shift()!;
        
        const task = (async () => {
          // Check if already in THIS collection
          if (offlineManifest()[collectionId]?.songs[song.id]) {
            updateProgress();
            return;
          }

          // Check if downloaded ANYWHERE ELSE globally
          const existingPath = getGlobalSongPath(song.id);
          if (existingPath) {
            // Link to existing file, skip download
            setOfflineManifest(prev => {
              const next = { ...prev };
              next[collectionId] = { ...next[collectionId] };
              next[collectionId].songs = { ...next[collectionId].songs, [song.id]: existingPath };
              saveManifest(next);
              return next;
            });
            updateProgress();
            return;
          }

          const downloadUrl = api.getDownloadUrl(song.id);
          const extension = song.suffix || 'mp3';
          const fileName = `navios_offline/songs/${song.id}.${extension}`;
          
          try {
            const result = await Filesystem.downloadFile({
              url: downloadUrl,
              path: fileName,
              directory: Directory.Data,
            });

            // Incrementally save state (debounced) to prevent data loss on crash
            setOfflineManifest(prev => {
              const next = { ...prev };
              next[collectionId] = { ...next[collectionId] };
              next[collectionId].songs = { ...next[collectionId].songs, [song.id]: result.path || fileName };
              saveManifest(next);
              return next;
            });
          } catch (e) {
            console.error('Failed to download song', song.id, e);
          }
          updateProgress();
        })();

        activePromises.add(task);
        task.finally(() => activePromises.delete(task));
      } else {
        // Wait for at least one active promise to resolve before queueing more
        await Promise.race(activePromises);
      }
    }
    
    // Force an immediate synchronous save when the entire collection is done
    forceSaveManifest(offlineManifest());
  } catch (error) {
    console.error('Failed to download collection:', error);
  } finally {
    setActiveDownloads(prev => {
      const next = new Set(prev);
      next.delete(collectionId);
      return next;
    });
    setDownloadProgress(prev => {
      const next = { ...prev };
      delete next[collectionId];
      return next;
    });
  }
};

export const removeCollection = async (collectionId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  
  const manifest = offlineManifest();
  if (!manifest[collectionId]) return;

  // 1. Get all file paths used by the collection being deleted
  const pathsToDelete = new Set(Object.values(manifest[collectionId].songs || {}));

  // 2. Remove the collection from the manifest
  const nextManifest = { ...manifest };
  delete nextManifest[collectionId];

  // 3. Find which paths are still in use by any other collection
  const pathsInUse = new Set<string>();
  for (const cid of Object.keys(nextManifest)) {
    if (nextManifest[cid].songs) {
      for (const path of Object.values(nextManifest[cid].songs)) {
        pathsInUse.add(path);
      }
    }
  }

  // 4. Delete orphan physical files
  for (const path of pathsToDelete) {
    if (!pathsInUse.has(path)) {
      try {
        await Filesystem.deleteFile({
          path,
          directory: Directory.Data
        });
      } catch (e) {
        console.warn('Failed to delete orphan file:', path, e);
      }
    }
  }

  // 5. Cleanup legacy folders (just in case they are completely empty now)
  // We MUST use recursive: false. If it's not empty (because some files are still shared), it will fail and keep the files safe.
  try {
    await Filesystem.rmdir({
      path: `navios_offline/${collectionId}`,
      directory: Directory.Data,
      recursive: false
    });
  } catch (e) {
    // Ignore, it means the directory is either already gone or still has shared files inside.
  }

  setOfflineManifest(nextManifest);
  saveManifest(nextManifest);
};
