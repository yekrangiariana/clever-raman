import { Component } from 'solid-js';

interface SectionHeaderProps {
  category?: string;
  title: string;
  subtitle?: string;
}

export const SectionHeader: Component<SectionHeaderProps> = (props) => {
  return (
    <div class="flex flex-col gap-1 mb-4">
      {props.category && (
        <span class="text-xl font-bold text-neutral-400 tracking-wide">
          {props.category}
        </span>
      )}
      <h2 class="text-4xl font-extrabold text-white tracking-tight leading-tight">
        {props.title}
      </h2>
      {props.subtitle && (
        <p class="text-xl font-medium text-neutral-400 mt-0.5">{props.subtitle}</p>
      )}
    </div>
  );
};
