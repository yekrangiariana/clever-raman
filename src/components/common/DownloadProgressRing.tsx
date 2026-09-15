import { Component } from 'solid-js';

export const DownloadProgressRing: Component<{ progress: number, class?: string }> = (props) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  // Progress is clamped between 0 and 1
  const normalizedProgress = () => Math.max(0, Math.min(1, props.progress || 0));
  const offset = () => circumference - normalizedProgress() * circumference;

  return (
    <svg 
      class={`-rotate-90 ${props.class || 'w-6 h-6 text-[#fa243c]'}`} 
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        stroke-width="3"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="12"
        cy="12"
      />
      <circle
        class="transition-all duration-300 ease-out"
        stroke-width="3"
        stroke-dasharray={circumference}
        stroke-dashoffset={offset()}
        stroke-linecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="12"
        cy="12"
      />
    </svg>
  );
};
