import { Share } from '@capacitor/share';
import { Song } from './api';
import { setIsSharingMedia } from './uiState';

export async function shareSongFile(song: Song) {
  try {
    setIsSharingMedia(true);
    await Share.share({
      title: `Share ${song.title}`,
      text: `${song.title} by ${song.artist}`,
      dialogTitle: 'Share Song'
    });
  } catch (error) {
    console.error('Failed to share song:', error);
  } finally {
    setIsSharingMedia(false);
  }
}

export async function shareAlbumFiles(songs: Song[], albumTitle: string, artistName: string) {
  if (songs.length === 0) return;

  try {
    setIsSharingMedia(true);
    await Share.share({
      title: `Share ${albumTitle}`,
      text: `${albumTitle} by ${artistName}`,
      dialogTitle: 'Share Album'
    });
  } catch (error) {
    console.error('Failed to share album:', error);
  } finally {
    setIsSharingMedia(false);
  }
}
