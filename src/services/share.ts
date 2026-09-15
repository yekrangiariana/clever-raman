import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { api, Song } from './api';
import { setIsSharingMedia } from './uiState';

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Unknown';
}

export async function shareSongFile(song: Song) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    setIsSharingMedia(true);
    const downloadUrl = api.getDownloadUrl(song.id);
    const safeTitle = sanitizeFilename(song.title);
    const safeArtist = sanitizeFilename(song.artist);
    const extension = song.suffix || 'mp3';
    const fileName = `${safeArtist} - ${safeTitle}.${extension}`;
    
    const result = await Filesystem.downloadFile({
      url: downloadUrl,
      path: fileName,
      directory: Directory.Cache,
    });

    if (result.path) {
      const fileUrl = result.path.startsWith('file://') ? result.path : `file://${result.path}`;
      await Share.share({
        title: `Share ${song.title}`,
        text: `${song.title} by ${song.artist}`,
        url: fileUrl,
        dialogTitle: 'Share Song File'
      });
    }
  } catch (error) {
    console.error('Failed to share song file:', error);
  } finally {
    setIsSharingMedia(false);
  }
}

export async function shareAlbumFiles(songs: Song[], albumTitle: string, artistName: string) {
  if (!Capacitor.isNativePlatform() || songs.length === 0) return;

  try {
    setIsSharingMedia(true);
    const fileUrls: string[] = [];
    
    const songsToShare = songs;
    
    for (const song of songsToShare) {
      const downloadUrl = api.getDownloadUrl(song.id);
      const safeTitle = sanitizeFilename(song.title);
      const safeArtist = sanitizeFilename(song.artist);
      const extension = song.suffix || 'mp3';
      const fileName = `${safeArtist} - ${safeTitle}.${extension}`;
      
      const result = await Filesystem.downloadFile({
        url: downloadUrl,
        path: fileName,
        directory: Directory.Cache,
      });
      if (result.path) {
        fileUrls.push(result.path.startsWith('file://') ? result.path : `file://${result.path}`);
      }
    }

    if (fileUrls.length > 0) {
      await Share.share({
        title: `Share ${albumTitle}`,
        text: `Check out ${albumTitle} by ${artistName}`,
        files: fileUrls,
        dialogTitle: 'Share Album Files'
      });
    }
  } catch (error) {
    console.error('Failed to share album files:', error);
  } finally {
    setIsSharingMedia(false);
  }
}
