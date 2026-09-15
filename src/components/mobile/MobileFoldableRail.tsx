import { Component } from 'solid-js';
import { globalActiveTab, setGlobalActiveTab, MobileTab } from '../../services/uiState';
import {
  HomeMusicIcon,
  LibraryMusicIcon,
  SearchIcon,
  SettingsIcon,
} from '../common/Icons';

interface MobileFoldableRailProps {
  onCloseDetail?: () => void;
}

export const MobileFoldableRail: Component<MobileFoldableRailProps> = (props) => {
  const handleTabClick = (tab: MobileTab) => {
    props.onCloseDetail?.();
    setGlobalActiveTab(tab);
  };

  return (
    <aside class="fixed right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 p-2 bg-black/40 backdrop-blur-3xl border border-white/15 rounded-full shadow-2xl animate-fade-in pointer-events-auto">
      {/* Top Utility Items */}
      <button
        onClick={() => handleTabClick('home')}
        class={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
          globalActiveTab() === 'home'
            ? 'bg-white/20 border border-white/25 text-[#fa243c] shadow-lg backdrop-blur-md'
            : 'text-neutral-400 hover:text-white border border-transparent'
        }`}
        title="Listen Now"
      >
        <HomeMusicIcon class="w-6 h-6" />
      </button>

      <button
        onClick={() => handleTabClick('library')}
        class={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
          globalActiveTab() === 'library'
            ? 'bg-white/20 border border-white/25 text-[#fa243c] shadow-lg backdrop-blur-md'
            : 'text-neutral-400 hover:text-white border border-transparent'
        }`}
        title="Library"
      >
        <LibraryMusicIcon class="w-6 h-6" />
      </button>

      <button
        onClick={() => handleTabClick('search')}
        class={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
          globalActiveTab() === 'search'
            ? 'bg-white/20 border border-white/25 text-[#fa243c] shadow-lg backdrop-blur-md'
            : 'text-neutral-400 hover:text-white border border-transparent'
        }`}
        title="Search"
      >
        <SearchIcon class="w-6 h-6" />
      </button>

      <button
        onClick={() => handleTabClick('settings')}
        class={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
          globalActiveTab() === 'settings'
            ? 'bg-white/20 border border-white/25 text-[#fa243c] shadow-lg backdrop-blur-md'
            : 'text-neutral-400 hover:text-white border border-transparent'
        }`}
        title="Settings"
      >
        <SettingsIcon class="w-6 h-6" />
      </button>
    </aside>
  );
};
