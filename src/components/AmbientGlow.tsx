import { Component, createMemo } from 'solid-js';
import { audioPlayer } from '../services/audio';
import { api } from '../services/api';

export const AmbientGlow: Component = () => {
  const currentCoverArt = createMemo(() => {
    const track = audioPlayer.currentTrack();
    if (!track) return '';
    return api.getCoverArtUrl(track.coverArt || track.id, 100);
  });

  return (
    <div class="ambient-glow-bg">
      {currentCoverArt() ? (
        <>
          <img
            src={currentCoverArt()}
            alt=""
            class="ambient-glow-img"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-black/35 pointer-events-none" />
        </>
      ) : (
        <div class="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-60" />
      )}
    </div>
  );
};
