import { Component, Show } from 'solid-js';
import { APP_NAME } from "../../config/constants";
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

      {/* Focusable Card Stage */}
      <div
        onClick={() => props.onClick()}
        class="w-full aspect-[10/14] rounded-3xl overflow-hidden shadow-2xl shadow-black/80 relative flex flex-col bg-neutral-950 border border-white/10 group hover:border-white/20 active:scale-[0.98] transition-all duration-200"
        data-focusable="true"
        data-variant="topPick"
        data-section={props.section}
        data-index={props.index}
      >
        {/* ─── VARIANT 1: ALBUM — Full-bleed editorial cover art ─── */}
        {props.variant === 'album' && (
          <div class="w-full h-full relative overflow-hidden">
            {/* Full-bleed cover — single image, no duplicate for blur (webOS perf) */}
            <Show
              when={props.coverArtUrl}
              fallback={
                <div class="absolute inset-0 flex items-center justify-center bg-neutral-800">
                  <MusicNoteIcon class="w-16 h-16 text-neutral-600" />
                </div>
              }
            >
              <img
                src={props.coverArtUrl}
                alt={props.title}
                class="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            </Show>

            {/* Gradient overlay — heavy at bottom for text, light at top */}
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />

            {/* Brand tag */}
            <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/60 border border-white/10">
              <span class="font-black tracking-wider uppercase text-white/90 text-[clamp(9px,3.5cqi,11px)]">{APP_NAME}</span>
            </div>

            {/* Bottom text strip */}
            <div class="absolute bottom-0 left-0 right-0 z-20 p-3 md:p-4">
              <Show when={props.categoryLabel}>
                <p class="font-bold text-white/70 uppercase tracking-widest text-[clamp(0.55rem,3.5cqi,0.65rem)] mb-0.5">
                  {props.categoryLabel}
                </p>
              </Show>
              <h3 class="font-black text-white tracking-tight leading-tight line-clamp-2 text-[clamp(0.875rem,6.5cqi,1.125rem)]">
                {props.title}
              </h3>
              <Show when={props.subtitle}>
                <p class="font-semibold text-white/75 truncate mt-0.5 text-[clamp(0.675rem,4cqi,0.8rem)]">
                  {props.subtitle}
                </p>
              </Show>
            </div>
          </div>
        )}

        {/* ─── VARIANT 2: STATION — Concentric red pulse circles ─── */}
        {props.variant === 'station' && (
          <div class="w-full h-full flex flex-col bg-gradient-to-b from-[#e51d48] to-[#be123c]">
            <div class="w-full flex-1 relative flex items-center justify-center overflow-hidden">
              {/* Brand tag */}
              <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/40">
                <span class="font-black tracking-wider uppercase text-white/90 text-[clamp(9px,3.5cqi,11px)]">{APP_NAME}</span>
              </div>

              {/* Concentric pulse circles */}
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

            {/* Bottom strip */}
            <div class="w-full bg-[#d01039] flex flex-col items-center justify-center px-3 py-2.5 text-center border-t border-black/10 shrink-0">
              <h3 class="font-black text-white leading-snug tracking-tight truncate w-full text-[clamp(0.875rem,6.5cqi,1.125rem)]">
                {props.title}
              </h3>
              <Show when={props.subtitle}>
                <p class="font-semibold text-white/80 truncate w-full mt-0.5 text-[clamp(0.675rem,4cqi,0.8rem)]">{props.subtitle}</p>
              </Show>
            </div>
          </div>
        )}

        {/* ─── VARIANT 3: PLAYLIST — Full art top, dark bottom panel ─── */}
        {props.variant === 'playlist' && (
          <>
            <div class="w-full aspect-square relative bg-neutral-950 flex items-center justify-center overflow-hidden shrink-0">
              {/* Brand tag */}
              <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/70 border border-white/10">
                <span class="font-black tracking-wider uppercase text-white/90 text-[clamp(9px,3.5cqi,11px)]">{APP_NAME}</span>
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
            <div class="w-full flex-1 bg-[#1e1e24] flex flex-col items-center justify-center px-3 py-2 text-center">
              <h3 class="font-black text-white tracking-tight leading-tight truncate w-full text-[clamp(0.875rem,6.5cqi,1.125rem)]">
                {props.title}
              </h3>
              <p class="font-semibold text-neutral-300 truncate w-full mt-0.5 text-[clamp(0.675rem,4cqi,0.8rem)]">
                {props.subtitle || 'Classics & essentials'}
              </p>
            </div>
          </>
        )}

        {/* ─── VARIANT 4: MESH MIX — Purple gradient + bold stacked title ─── */}
        {props.variant === 'meshMix' && (
          <div
            class="w-full h-full relative flex flex-col p-4 md:p-5 overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #4338ca 100%)' }}
          >
            {/* Brand tag */}
            <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/40">
              <span class="font-black tracking-wider uppercase text-white/90 text-[clamp(9px,3.5cqi,11px)]">{APP_NAME}</span>
            </div>

            {/* Stacked headline */}
            <div class="relative z-20 pt-2 md:pt-3">
              <h3 class="font-black text-white leading-[1.06] tracking-tight text-[clamp(1.5rem,12cqi,2.5rem)]">
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

            {/* Artist roster at bottom */}
            <div class="relative z-20 mt-auto pt-3">
              <p class="font-medium text-white/80 line-clamp-3 leading-snug text-[clamp(0.675rem,4.5cqi,0.875rem)]">
                {props.metadata}
              </p>
            </div>
          </div>
        )}

        {/* ─── VARIANT 5: GENRE MIX — Bold genre word + gradient ─── */}
        {props.variant === 'genreMix' && (() => {
          const genreText = props.title.replace(/ mix$/i, '');
          const words = genreText.split(/\s+/);
          const maxWordLen = Math.max(...words.map(w => w.length));
          const fontClass =
            maxWordLen > 11 || genreText.length > 18
              ? 'text-[clamp(1.25rem,9cqi,1.625rem)]'
              : maxWordLen > 8 || genreText.length > 12
              ? 'text-[clamp(1.5rem,10cqi,1.875rem)]'
              : maxWordLen > 5 || genreText.length > 7
              ? 'text-[clamp(1.875rem,13cqi,2.5rem)]'
              : 'text-[clamp(2.5rem,17cqi,3.25rem)]';

          return (
            <div
              class="w-full h-full relative flex flex-col p-4 md:p-5 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #e11d48 100%)' }}
            >
              {/* Brand tag */}
              <div class="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/40">
                <span class="font-black tracking-wider uppercase text-white/90 text-[clamp(9px,3.5cqi,11px)]">{APP_NAME}</span>
              </div>

              {/* Centered genre word(s) */}
              <div class="relative z-20 flex-1 flex flex-col items-center justify-center text-center w-full px-1">
                <Show when={props.categoryLabel}>
                  <p class="font-bold text-white/70 uppercase tracking-widest text-[clamp(0.55rem,3.5cqi,0.65rem)] mb-1.5">
                    {props.categoryLabel}
                  </p>
                </Show>
                <h3 class={`font-black text-white leading-[1.05] tracking-tighter uppercase w-full break-words [overflow-wrap:anywhere] hyphens-auto ${fontClass}`}>
                  {words.map((word, i) => (
                    <>
                      {word}
                      {i < words.length - 1 && <br />}
                    </>
                  ))}
                </h3>

                {/* Subtle waveform icon instead of "Mix" text */}
                <div class="mt-3 flex items-end gap-[3px] h-5 opacity-60">
                  {[3, 5, 8, 6, 10, 7, 4, 9, 5, 3].map(h => (
                    <div class="w-[3px] bg-white rounded-full" style={{ height: `${h * 2}px` }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
