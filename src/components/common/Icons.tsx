import { Component } from 'solid-js';

interface IconProps {
  class?: string;
  filled?: boolean;
}

/**
 * Standard Music Shuffle Icon (Curved Crossing Arrows)
 */
export const ShuffleIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H21" />
    <path d="M17 3.5L21 7L17 10.5" />
    <path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.1 8.6c.8 1.1 2 1.7 3.3 1.7H21" />
    <path d="M17 13.5L21 17L17 20.5" />
  </svg>
);

/**
 * Standard Add to Queue Icon (Playlist lines + plus badge)
 */
export const QueueAddIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 6h16M4 12h10M4 18h10M19 13v6m-3-3h6" />
  </svg>
);

/**
 * Standard Heart (Like / Star) Icon
 */
export const HeartIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    viewBox="0 0 24 24"
    fill={props.filled ? "currentColor" : "none"}
    stroke="currentColor"
    stroke-width={props.filled ? "0" : "2"}
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
  </svg>
);

/**
 * Play Icon
 */
export const PlayIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/**
 * Pause Icon
 */
export const PauseIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

/**
 * Skip Next Icon
 */
export const SkipNextIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

/**
 * Skip Previous Icon
 */
export const SkipPrevIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

/**
 * Up Next Queue List Icon (3 Horizontal Lines)
 */
export const QueueListIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

/**
 * Trash / Close / Remove Icon
 */
export const TrashIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const CloseIcon = TrashIcon;
export const XIcon = TrashIcon;

/**
 * Search Icon (Magnifying Glass)
 */
export const SearchIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

/**
 * Settings Icon (Gear)
 */
export const SettingsIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/**
 * Chevron Right Icon
 */
export const ChevronRightIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Arrow Left / Back Icon
 */
export const ArrowLeftIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

/**
 * Music Note Icon (Placeholder / Cover fallback)
 */
export const MusicNoteIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zm12 0c0 1.105-1.343 2-3 2s-3-.895-3-2 .895-2 3-2 3 .895 3 2zM9 10l12-2" />
  </svg>
);

/**
 * Backspace Icon
 */
export const BackspaceIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
  </svg>
);

/**
 * Playlists / Library Stack Icon
 */
export const PlaylistsIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

/**
 * Checkmark / Success Icon
 */
export const CheckIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

/**
 * Equalizer / Radio Mix Badge Icon
 */
export const EqualizerIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);

/**
 * Sparkles / Discovery Compass Star Icon
 */
export const SparklesIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
    <path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.85" />
    <path d="M5 2L5.8 4.2L8 5L5.8 5.8L5 8L4.2 5.8L2 5L4.2 4.2L5 2Z" opacity="0.85" />
  </svg>
);

/**
 * Repeat / Loop Icon
 */
export const RepeatIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

/**
 * Repeat One Icon (Loop single track)
 */
export const RepeatOneIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    <text
      x="12"
      y="14.5"
      fill="currentColor"
      stroke="none"
      font-size="8"
      font-weight="bold"
      font-family="sans-serif"
      text-anchor="middle"
      dominant-baseline="central"
    >
      1
    </text>
  </svg>
);

/**
 * Apple Music 'Listen Now' / Play Circle Home Icon
 */
export const HomeMusicIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
  </svg>
);

/**
 * Apple Music 'Browse' Grid / Window Icon
 */
export const BrowseIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
  </svg>
);

/**
 * Apple Music 'Radio' Antenna Icon
 */
export const RadioIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1a5 5 0 0 0-5 5c0 1.48.65 2.79 1.67 3.71L2 20.38 3.62 22 10.3 15.3A4.95 4.95 0 0 0 12 16a5 5 0 0 0 5-5c0-1.48-.65-2.79-1.67-3.71L22 3.62 20.38 2l-6.68 6.7A4.95 4.95 0 0 0 12 1zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
  </svg>
);

/**
 * Apple Music 'Library' Music Folders Icon
 */
export const LibraryMusicIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
  </svg>
);

/**
 * Apple Music Lyrics Quote Icon
 */
export const LyricsIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);

/**
 * AirPlay / Output Audio Icon
 */
export const AirPlayIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 22h12l-6-6-6 6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
  </svg>
);

/**
 * Chevron Down / Dismiss Icon
 */
export const ChevronDownIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

/**
 * Volume High Icon
 */
export const VolumeIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

/**
 * Ellipsis Horizontal (More Actions) Icon
 */
export const EllipsisIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);



export const ShareIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
  </svg>
);

/**
 * Standard Album Disc / Collection Icon
 */
export const AlbumIcon: Component<IconProps> = (props) => (
  <svg
    class={props.class || "w-6 h-6"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3" />
  </svg>
);

export const MinusCircleIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const ArrowDownTrayIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} fill="currentColor" viewBox="0 0 56 56">
    <path d="M 12.1797 44.4648 C 10.9610 44.4648 10.1406 45.3320 10.1406 46.5508 C 10.1406 47.7695 10.9610 48.6602 12.1797 48.6602 L 43.7734 48.6602 C 45.0156 48.6602 45.8594 47.7695 45.8594 46.5508 C 45.8594 45.3320 45.0156 44.4648 43.7734 44.4648 L 28.4922 44.4648 C 28.8906 44.3477 29.2422 44.1367 29.5703 43.7852 L 45.0859 28.2695 C 45.5547 27.7773 45.7656 27.2617 45.7656 26.6992 C 45.7656 25.5273 44.9219 24.6367 43.7266 24.6367 C 43.1641 24.6367 42.6250 24.8476 42.2266 25.2227 L 36.9766 30.4024 L 29.9219 38.1133 L 30.1094 33.0976 L 30.1094 9.4258 C 30.1094 8.2071 29.2188 7.3398 28 7.3398 C 26.7812 7.3398 25.9141 8.2071 25.9141 9.4258 L 25.9141 33.0976 L 26.0781 38.1367 L 19.0234 30.4024 L 13.7734 25.2227 C 13.3984 24.8476 12.8359 24.6367 12.2734 24.6367 C 11.1016 24.6367 10.2344 25.5273 10.2344 26.6992 C 10.2344 27.2617 10.4688 27.7773 10.9375 28.2695 L 26.4297 43.7852 C 26.7578 44.1367 27.1328 44.3477 27.5312 44.4648 Z" />
  </svg>
);

export const DragHandleIcon: Component<IconProps> = (props) => (
  <svg class={props.class || "w-6 h-6"} fill="currentColor" viewBox="0 0 56 56">
    <path d="M 6.0626 19.5390 L 49.9144 19.5390 C 50.8984 19.5390 51.7187 18.7656 51.7187 17.7812 C 51.7187 16.7968 50.8984 16 49.9144 16 L 6.0626 16 C 5.0782 16 4.2813 16.7968 4.2813 17.7812 C 4.2813 18.7656 5.0782 19.5390 6.0626 19.5390 Z M 6.0626 29.7578 L 49.9144 29.7578 C 50.8984 29.7578 51.7187 28.9843 51.7187 28 C 51.7187 26.9921 50.8984 26.1953 49.9144 26.1953 L 6.0626 26.1953 C 5.0782 26.1953 4.2813 26.9921 4.2813 28 C 4.2813 28.9843 5.0782 29.7578 6.0626 29.7578 Z M 6.0626 40 L 49.9144 40 C 50.8984 40 51.7187 39.2031 51.7187 38.1953 C 51.7187 37.2109 50.8984 36.4375 49.9144 36.4375 L 6.0626 36.4375 C 5.0782 36.4375 4.2813 37.2109 4.2813 38.1953 C 4.2813 39.2031 5.0782 40 6.0626 40 Z" />
  </svg>
);
