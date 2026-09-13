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
    <div class="flex flex-col cursor-pointer select-none w-full scroll-mb-24 @container [content-visibility:auto] [contain-intrinsic-size:19.5rem_27.5rem]" data-card-wrapper="true">
      <span class="font-extrabold tracking-tight mb-2 md:mb-3 ml-1.5 md:ml-2 truncate uppercase md:normal-case text-[clamp(0.875rem,7cqi,1.5rem)] text-neutral-400 md:text-neutral-300">
        {props.categoryLabel || 'Top Pick'}
      </span>

      {/* Focusable Card Stage */}
      <div
        onClick={() => props.onClick()}
        class="w-full aspect-[10/14] rounded-xl md:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col bg-[#1c1e22] border border-white/5"
        data-focusable="true"
        data-variant="topPick"
        data-section={props.section}
        data-index={props.index}
      >
        {/* VARIANT 1: ALBUM (Dynamic ambient blur + floating 3D cover + Apple Music editorial typography) */}
        {props.variant === 'album' && (
          <div class="w-full h-full relative flex flex-col p-4 md:p-5 overflow-hidden bg-neutral-950">
            {/* Dynamic Ambient Background (Removed blur for webOS performance) */}
            <Show when={props.coverArtUrl}>
              <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={props.coverArtUrl}
                  alt=""
                  class="w-full h-full object-cover scale-150 opacity-20 transform-gpu"
                />
              </div>
            </Show>

            {/* Dark Ambient Gradient Mask for legibility & contrast */}
            <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black/95 pointer-events-none" />

            {/* Brand Tag Top-Right */}
            <div class="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full bg-black/80 text-white/95 border border-white/10 shadow-md pointer-events-none">
              <span class="font-black tracking-wider uppercase text-[clamp(10px,4cqi,1rem)]">NaviOS</span>
            </div>

            {/* Floating Artwork Container with 3D shadow & glass ring */}
            <div class="relative z-20 w-full flex items-center justify-center pt-2 md:pt-3 pb-1 flex-1">
              <Show
                when={props.coverArtUrl}
                fallback={
                  <div class="rounded-xl bg-neutral-800 flex items-center justify-center text-white/50 shadow-2xl border border-white/10 w-[clamp(6rem,30cqi,9rem)] h-[clamp(6rem,30cqi,9rem)]">
                    <MusicNoteIcon class="w-[clamp(2.5rem,12cqi,4rem)] h-[clamp(2.5rem,12cqi,4rem)]" />
                  </div>
                }
              >
                <img
                  src={props.coverArtUrl}
                  alt={props.title}
                  class="object-cover rounded-xl shadow-2xl shadow-black/80 ring-1 ring-white/20 w-[clamp(6rem,30cqi,9rem)] h-[clamp(6rem,30cqi,9rem)]"
                  loading="eager"
                />
              </Show>
            </div>

            {/* Bottom Typography Stage */}
            <div class="relative z-20 w-full flex flex-col items-center text-center pt-2 pb-1 px-1">
              <h3 class="font-black text-white tracking-tight leading-tight line-clamp-2 md:line-clamp-1 w-full drop-shadow-md text-[clamp(1.25rem,9cqi,1.875rem)]">
                {props.title}
              </h3>
              <p class="font-bold text-white/90 truncate w-full mt-1 drop-shadow text-[clamp(0.875rem,6cqi,1.25rem)]">
                {props.subtitle}
              </p>
              <Show when={props.metadata}>
                <p class="font-semibold text-white/70 truncate w-full mt-0.5 text-[clamp(11px,4.5cqi,0.875rem)]">
                  {props.metadata}
                </p>
              </Show>
            </div>
          </div>
        )}

        {/* VARIANT 2: STATION (Concentric red pulse circles + play icon + bottom title) */}
        {props.variant === 'station' && (
          <div class="w-full h-full flex flex-col bg-gradient-to-b from-[#e51d48] to-[#be123c]">
            <div class="w-full aspect-square relative flex items-center justify-center overflow-hidden">
              {/* Brand Tag Top-Right */}
              <div class="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-black/40 text-white/95 shadow-md">
                <span class="font-black tracking-wider uppercase text-[clamp(10px,4cqi,1rem)]">NaviOS</span>
              </div>

              {/* Concentric Pulse Circles with Play Button */}
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="rounded-full bg-white/10 flex items-center justify-center w-[clamp(8rem,40cqi,12rem)] h-[clamp(8rem,40cqi,12rem)]">
                  <div class="rounded-full bg-white/15 flex items-center justify-center w-[clamp(6rem,30cqi,9rem)] h-[clamp(6rem,30cqi,9rem)]">
                    <div class="rounded-full bg-white/25 flex items-center justify-center shadow-inner w-[clamp(4rem,20cqi,6rem)] h-[clamp(4rem,20cqi,6rem)]">
                      <div class="rounded-full bg-white/35 flex items-center justify-center shadow-md w-[clamp(2.5rem,10cqi,3rem)] h-[clamp(2.5rem,10cqi,3rem)]">
                        <PlayIcon class="text-white ml-0.5 w-[clamp(1.25rem,5cqi,1.5rem)] h-[clamp(1.25rem,5cqi,1.5rem)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full flex-1 bg-[#d01039] flex flex-col items-center justify-center px-3 md:px-4 py-2 text-center border-t border-black/10">
              <h3 class="font-black text-white leading-snug tracking-tight text-center truncate w-full text-[clamp(1.25rem,9cqi,1.875rem)]">
                {props.title}
              </h3>
              <Show when={props.subtitle}>
                <p class="font-extrabold text-white/90 truncate w-full mt-0.5 md:mt-1 text-[clamp(0.75rem,5cqi,1rem)]">{props.subtitle}</p>
              </Show>
            </div>
          </div>
        )}

        {/* VARIANT 3: PLAYLIST (Top square playlist art with brand + bottom matte panel) */}
        {props.variant === 'playlist' && (
          <>
            <div class="w-full aspect-square relative bg-neutral-950 flex items-center justify-center overflow-hidden">
              {/* Brand Tag Top-Right */}
              <div class="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-black/80 text-white/95 border border-white/10 shadow-sm">
                <span class="font-black tracking-wider uppercase text-[clamp(10px,4cqi,0.875rem)]">NaviOS</span>
              </div>

              <Show
                when={props.coverArtUrl}
                fallback={
                  <div class="w-full h-full flex items-center justify-center bg-[#252830] text-neutral-500">
                    <MusicNoteIcon class="w-[clamp(3rem,16cqi,4rem)] h-[clamp(3rem,16cqi,4rem)]" />
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
            <div class="w-full flex-1 bg-[#242928] flex flex-col items-center justify-center px-3 md:px-4 py-2 text-center">
              <h3 class="font-black text-white tracking-tight leading-tight truncate w-full text-[clamp(1.125rem,9cqi,1.875rem)]">
                {props.title}
              </h3>
              <p class="font-semibold text-neutral-200 truncate w-full mt-0.5 md:mt-1 text-[clamp(0.75rem,5cqi,1.25rem)]">
                {props.subtitle || 'Classics & essentials'}
              </p>
            </div>
          </>
        )}

        {/* VARIANT 4: MESH MIX (Full-bleed fluid mesh gradient + bold title + artist roster) */}
        {props.variant === 'meshMix' && (
          <div
            class="w-full h-full relative flex flex-col p-4 md:p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #4338ca 100%)',
            }}
          >
            {/* Brand Tag Top-Right */}
            <div class="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-black/40 text-white/95 shadow-md">
              <span class="font-black tracking-wider uppercase text-[clamp(10px,4cqi,1rem)]">NaviOS</span>
            </div>

            {/* Large Stacked Headline */}
            <div class="relative z-20 pt-2 md:pt-4">
              <h3 class="font-black text-white leading-[1.06] tracking-tight text-[clamp(1.875rem,15cqi,3rem)]">
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
            <div class="relative z-20 mt-auto pt-2 md:pt-4">
              <p class="font-semibold text-white/90 line-clamp-2 md:line-clamp-3 leading-snug tracking-normal text-[clamp(0.875rem,6cqi,1.125rem)]">
                {props.metadata}
              </p>
            </div>
          </div>
        )}

        {/* VARIANT 5: GENRE MIX (Apple-inspired bold typography + gradient + smart word wrapping) */}
        {props.variant === 'genreMix' && (() => {
          const genreText = props.title.replace(/ mix$/i, '');
          const words = genreText.split(/\s+/);
          const maxWordLen = Math.max(...words.map(w => w.length));
          const fontClass =
            maxWordLen > 11 || genreText.length > 18
              ? 'text-[clamp(1.5rem,10cqi,1.875rem)]'
              : maxWordLen > 8 || genreText.length > 12
              ? 'text-[clamp(1.875rem,12cqi,2.25rem)]'
              : maxWordLen > 5 || genreText.length > 7
              ? 'text-[clamp(2.25rem,15cqi,3rem)]'
              : 'text-[clamp(3rem,20cqi,3.75rem)]';

          return (
            <div
              class="w-full h-full relative flex flex-col p-4 md:p-6 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)',
              }}
            >
              {/* Brand Tag Top-Right */}
              <div class="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-black/40 text-white/95 shadow-md">
                <span class="font-black tracking-wider uppercase text-[clamp(10px,4cqi,1rem)]">NaviOS</span>
              </div>
              <div class="relative z-20 mt-auto mb-auto flex flex-col items-center justify-center text-center w-full px-1">
                <h3
                  class={`font-black text-white leading-[1.05] tracking-tighter uppercase w-full break-words [overflow-wrap:anywhere] hyphens-auto ${fontClass}`}
                >
                  {words.map((word, i) => (
                    <>
                      {word}
                      {i < words.length - 1 && <br />}
                    </>
                  ))}
                </h3>
                <p class="font-extrabold text-white/95 uppercase tracking-[0.25em] mt-2 md:mt-3 text-[clamp(1.125rem,7cqi,1.5rem)]">
                  Mix
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
