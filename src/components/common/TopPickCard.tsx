import { Component, Show } from 'solid-js';
import { PlayIcon, MusicNoteIcon } from './Icons';

export interface TopPickCardProps {
  title: string;
  subtitle?: string;
  metadata?: string;
  categoryLabel?: string;
  variant: 'album' | 'station' | 'playlist' | 'meshMix' | 'genreMix';
  coverArtUrl?: string;
  section: string;
  index: number;
  onClick: () => void;
}

export const TopPickCard: Component<TopPickCardProps> = (props) => {
  return (
    <div class="flex flex-col cursor-pointer select-none w-full scroll-mb-24" data-card-wrapper="true">
      {/* Overline Category Label (matching Apple TV reference above each card) */}
      <span class="text-xl font-bold text-neutral-400 tracking-tight mb-2.5 px-0.5 truncate">
        {props.categoryLabel || 'Top Pick'}
      </span>

      {/* Focusable Card Stage */}
      <div
        onClick={() => props.onClick()}
        class="w-full aspect-[10/14] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col bg-[#1c1e22] border border-white/5"
        data-focusable="true"
        data-variant="topPick"
        data-section={props.section}
        data-index={props.index}
      >
        {/* VARIANT 1: ALBUM (Top square artwork + bottom matte info panel) */}
        {props.variant === 'album' && (
          <>
            <div class="w-full aspect-square relative bg-neutral-950 flex items-center justify-center overflow-hidden">
              <Show
                when={props.coverArtUrl}
                fallback={
                  <div class="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                    <MusicNoteIcon class="w-16 h-16" />
                  </div>
                }
              >
                <img
                  src={props.coverArtUrl}
                  alt={props.title}
                  class="w-full h-full object-cover"
                  loading="eager"
                />
              </Show>
            </div>
            <div class="w-full flex-1 bg-[#262c28] flex flex-col items-center justify-center px-4 py-2 text-center">
              <h3 class="text-2xl font-bold text-white tracking-tight leading-tight truncate w-full">
                {props.title}
              </h3>
              <p class="text-lg font-medium text-neutral-300 truncate w-full mt-0.5">
                {props.subtitle}
              </p>
              {props.metadata && (
                <p class="text-sm font-medium text-neutral-400 truncate w-full mt-0.5">
                  {props.metadata}
                </p>
              )}
            </div>
          </>
        )}

        {/* VARIANT 2: STATION (Concentric red pulse circles + play icon + bottom title) */}
        {props.variant === 'station' && (
          <div class="w-full h-full flex flex-col bg-gradient-to-b from-[#e51d48] to-[#be123c]">
            <div class="w-full aspect-square relative flex items-center justify-center overflow-hidden">
              {/* Brand Tag Top-Right */}
              <div class="absolute top-3.5 right-4 z-20 flex items-center gap-1 opacity-90 text-white font-bold">
                <span class="text-sm font-black tracking-tight">NaviOS</span>
              </div>

              {/* Concentric Pulse Circles with Play Button */}
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center">
                  <div class="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center">
                    <div class="w-24 h-24 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
                      <div class="w-12 h-12 rounded-full bg-white/35 flex items-center justify-center shadow-md">
                        <PlayIcon class="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full flex-1 bg-[#d01039] flex flex-col items-center justify-center px-4 py-2 text-center border-t border-black/10">
              <h3 class="text-2xl font-black text-white leading-snug tracking-tight text-center truncate w-full">
                {props.title}
              </h3>
              <Show when={props.subtitle}>
                <p class="text-sm font-bold text-white/80 truncate w-full mt-0.5">{props.subtitle}</p>
              </Show>
            </div>
          </div>
        )}

        {/* VARIANT 3: PLAYLIST (Top square playlist art with brand + bottom matte panel) */}
        {props.variant === 'playlist' && (
          <>
            <div class="w-full aspect-square relative bg-neutral-950 flex items-center justify-center overflow-hidden">
              {/* Brand Tag Top-Right */}
              <div class="absolute top-3.5 right-4 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/55 text-white/95 shadow-sm">
                <span class="text-xs font-black tracking-wider uppercase">NaviOS</span>
              </div>

              <Show
                when={props.coverArtUrl}
                fallback={
                  <div class="w-full h-full flex items-center justify-center bg-[#252830] text-neutral-500">
                    <MusicNoteIcon class="w-16 h-16" />
                  </div>
                }
              >
                <img
                  src={props.coverArtUrl}
                  alt={props.title}
                  class="w-full h-full object-cover"
                  loading="eager"
                />
              </Show>
            </div>
            <div class="w-full flex-1 bg-[#242928] flex flex-col items-center justify-center px-4 py-2 text-center">
              <h3 class="text-2xl font-bold text-white tracking-tight leading-tight truncate w-full">
                {props.title}
              </h3>
              <p class="text-lg font-medium text-neutral-300 truncate w-full mt-0.5">
                {props.subtitle || 'Classics & essentials'}
              </p>
            </div>
          </>
        )}

        {/* VARIANT 4: MESH MIX (Full-bleed fluid mesh gradient + bold title + artist roster) */}
        {props.variant === 'meshMix' && (
          <div
            class="w-full h-full relative flex flex-col p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #4338ca 100%)',
            }}
          >
            {/* Film grain overlay */}
            <div
              class="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
              style={{ 'background-image': 'url(./noise.png)', 'background-repeat': 'repeat' }}
            />

            {/* Brand Tag Top-Left */}
            <div class="relative z-20 flex items-center gap-1 opacity-90 text-white font-bold">
              <span class="text-sm font-black tracking-tight">NaviOS</span>
            </div>

            {/* Large Stacked Headline */}
            <div class="relative z-20 pt-4">
              <h3 class="text-4xl font-black text-white leading-[1.08] tracking-tight">
                {props.title.includes(' ') ? (
                  <>
                    {props.title.split(' ')[0]}
                    <br />
                    {props.title.split(' ').slice(1).join(' ')}
                  </>
                ) : (
                  props.title
                )}
              </h3>
            </div>

            {/* Artist Roster at Bottom */}
            <div class="relative z-20 mt-auto pt-4">
              <p class="text-base font-medium text-white/80 line-clamp-3 leading-snug tracking-normal">
                {props.metadata}
              </p>
            </div>
          </div>
        )}

        {/* VARIANT 5: GENRE MIX (Apple-inspired bold typography + gradient) */}
        {props.variant === 'genreMix' && (
          <div
            class="w-full h-full relative flex flex-col p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)',
            }}
          >
            <div
              class="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
              style={{ 'background-image': 'url(./noise.png)', 'background-repeat': 'repeat' }}
            />
            <div class="relative z-20 flex items-center gap-1 opacity-90 text-white font-bold">
              <span class="text-sm font-black tracking-tight">NaviOS</span>
            </div>
            <div class="relative z-20 mt-auto mb-auto flex flex-col items-center justify-center text-center w-full">
              <h3
                class={`font-black text-white leading-[1.05] tracking-tighter uppercase w-full px-2 ${
                  props.title.replace(/ mix$/i, '').length > 12
                    ? 'text-4xl'
                    : props.title.replace(/ mix$/i, '').length > 8
                    ? 'text-5xl'
                    : 'text-6xl'
                }`}
              >
                {props.title.replace(/ mix$/i, '').split(' ').map((word, i, arr) => (
                  <>
                    {word}
                    {i < arr.length - 1 && <br />}
                  </>
                ))}
              </h3>
              <p class="text-2xl font-bold text-white/90 uppercase tracking-[0.2em] mt-2">
                Mix
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
