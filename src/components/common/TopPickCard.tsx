import { Component } from 'solid-js';
import { getCardGradient } from '../../utils/colors';
import { EqualizerIcon } from './Icons';

export interface TopPickCardProps {
  title: string;
  subtitle?: string;
  badge: string;
  metadata: string;
  colorIndex?: number;
  section: string;
  index: number;
  onClick: () => void;
}

export const TopPickCard: Component<TopPickCardProps> = (props) => {
  return (
    <div class="flex flex-col cursor-pointer select-none w-full">
      <div
        onClick={() => props.onClick()}
        class="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl relative flex flex-col p-6 bg-neutral-900"
        data-focusable="true"
        data-variant="topPick"
        data-section={props.section}
        data-index={props.index}
      >
        {/* Deep Moody Gradient Background */}
        <div class={`absolute inset-0 bg-gradient-to-br ${getCardGradient(props.title, props.colorIndex)}`} />

        {/* Global darkening tint for comfortable OLED TV contrast */}
        <div class="absolute inset-0 bg-black/30 z-[5]" />

        {/* Soft bottom vignette for contrast & readability */}
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />

        {/* Top Brand / Category Tag with Equalizer Badge */}
        <div class="relative z-20 flex items-center gap-1.5 text-white/90">
          <EqualizerIcon class="w-5 h-5" />
          <span class="text-xs font-bold tracking-wider uppercase opacity-85">{props.badge}</span>
        </div>

        {/* Centered Typography for Title and Subtitle */}
        <div class="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <h3 class="text-3xl font-black text-white leading-tight tracking-tight line-clamp-3">
            {props.title}
          </h3>
          {props.subtitle && (
            <span class="font-medium opacity-90 text-2xl mt-1.5 tracking-tight text-white/90">
              {props.subtitle}
            </span>
          )}
        </div>

        {/* Bottom Metadata (e.g. Tracks / Albums count) */}
        <div class="relative z-20 mt-auto pt-4">
          <p class="text-lg font-extrabold text-white/90 truncate">
            {props.metadata}
          </p>
        </div>
      </div>
    </div>
  );
};
