import { createRoot } from 'solid-js';
import { audioPlayer } from './src/services/audio';

createRoot(() => {
  // Simulate API responses if necessary, but we can just use dummy songs
  const A = { id: 'A', title: 'Track A', album: 'Album', artist: 'Artist', duration: 100 };
  const B = { id: 'B', title: 'Track B', album: 'Album', artist: 'Artist', duration: 100 };
  const C = { id: 'C', title: 'Track C', album: 'Album', artist: 'Artist', duration: 100 };
  const X = { id: 'X', title: 'Track X', album: 'Other', artist: 'Other', duration: 100 };

  // Play Album
  audioPlayer.playTrack(A, [A, B, C], 0);
  console.log("Play A:", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());

  // Add custom track
  audioPlayer.addToUserQueue(X);
  
  // Finish A, play next
  audioPlayer.nextTrack();
  console.log("Play X:", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());

  // Finish X, play next
  audioPlayer.nextTrack();
  console.log("Play B:", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());

  // Go back to X via previousTrack
  audioPlayer.previousTrack();
  console.log("Press Prev (to X):", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());

  // Go forward to B again
  audioPlayer.nextTrack();
  console.log("Play B again:", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());

  // Go back to X via history item
  audioPlayer.playHistoryItem(X);
  console.log("Click History X:", audioPlayer.currentTrack()?.id, "History:", audioPlayer.playedHistory().map(s => s.id), "UserQueue:", audioPlayer.userQueue().map(s => s.id), "ContextIndex:", audioPlayer.contextIndex());
});
