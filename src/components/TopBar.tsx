import { Component, For } from 'solid-js';
import { focusEngine } from '../services/focus';
import { SearchIcon, SettingsIcon } from './common/Icons';
import { activeProfileSignal, GRADIENT_PRESETS } from '../services/profiles';

export const TopBar: Component = () => {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'albums', label: 'Albums' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'nowPlaying', label: 'Now Playing' },
    { id: 'search', label: 'Search', isSearch: true },
    { id: 'settings', label: 'Settings', isSettings: true },
  ];

  const activeProfile = () => activeProfileSignal();
  const activePreset = () => GRADIENT_PRESETS[activeProfile()?.gradientPreset || 'crimson'] || GRADIENT_PRESETS.crimson;

  const handleSelectTab = (tabId: string, index: number) => {
    if (tabId === 'nowPlaying') {
      focusEngine.setActiveModal('nowPlaying');
      focusEngine.setFocus('nowPlaying', 1);
    } else if (tabId === 'settings') {
      focusEngine.setActiveModal('none');
      focusEngine.setActiveTab('settings');
      focusEngine.setFocus('topBar', index);
    } else if (tabId === 'search') {
      focusEngine.setActiveModal('none');
      focusEngine.setActiveTab('search');
      focusEngine.setFocus('topBar', index);
    } else {
      focusEngine.setActiveModal('none');
      focusEngine.setActiveTab(tabId as any);
      focusEngine.setFocus('topBar', index);
    }
  };

  const handleOpenProfileMenu = () => {
    focusEngine.setActiveModal('profileQuickMenu');
    setTimeout(() => focusEngine.setFocus('profileQuickMenu', 0), 50);
  };

  return (
    <header class="w-full py-6 flex items-center justify-center pointer-events-auto shrink-0 z-20">
      {/* Centered Capsule */}
      <div class="bg-neutral-900/90 border border-neutral-800 rounded-full px-3 py-2 flex items-center gap-3 shadow-2xl">
        {/* Navigation Tabs */}
        <nav class="flex items-center gap-2">
          <For each={tabs}>
            {(tab, index) => {
              const isActive = () => focusEngine.activeTab() === tab.id;
              return (
                <button
                  onClick={() => handleSelectTab(tab.id, index())}
                  class={`px-6 py-2.5 rounded-full text-xl font-bold flex items-center justify-center gap-2 ${
                    isActive()
                      ? 'bg-white text-black shadow-lg scale-105 font-extrabold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                  }`}
                  data-focusable="true"
                  data-section="topBar"
                  data-index={index()}
                >
                  {tab.isSearch ? (
                    <SearchIcon class="w-6 h-6" />
                  ) : tab.isSettings ? (
                    <SettingsIcon class="w-6 h-6" />
                  ) : (
                    <span>{tab.label}</span>
                  )}
                </button>
              );
            }}
          </For>

          {/* Profile Avatar Badge Button */}
          <div class="w-px h-7 bg-neutral-800 my-auto mx-1" />
          
          <button
            onClick={handleOpenProfileMenu}
            class={`w-10 h-10 rounded-full ${activePreset().bg} flex items-center justify-center text-white font-black text-lg shadow-md border border-white/30 hover:scale-110 cursor-pointer shrink-0`}
            title={`Switch Profile (${activeProfile()?.name || 'Account'})`}
            data-focusable="true"
            data-section="topBar"
            data-index="6"
          >
            {activeProfile()?.name?.charAt(0).toUpperCase() || 'U'}
          </button>
        </nav>
      </div>
    </header>
  );
};
