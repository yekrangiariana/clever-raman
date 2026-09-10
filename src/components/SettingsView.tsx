import { Component, createSignal, For, Show } from 'solid-js';
import { api } from '../services/api';
import { focusEngine } from '../services/focus';
import { profilesSignal, activeProfileSignal, showBootSelectorSignal, setShowBootSelector, UserProfile, GRADIENT_PRESETS, setEditingProfileSignal, setAddProfileReturnState } from '../services/profiles';
import { clearHomeCache } from './HomeView';
import { clearSearchCache } from './SearchView';
import { clearAlbumCache } from './MainGrid';
import { SettingsIcon, ChevronRightIcon } from './common/Icons';

export const SettingsView: Component = () => {
  const [statusMsg, setStatusMsg] = createSignal<string>('');
  const [isTesting, setIsTesting] = createSignal<boolean>(false);

  const config = () => api.getConfig();
  const profiles = () => profilesSignal();
  const activeProfile = () => activeProfileSignal();
  const showBootSelector = () => showBootSelectorSignal();

  const [editServerUrl, setEditServerUrl] = createSignal(config()?.serverUrl || '');

  const openServerModal = () => {
    setEditServerUrl(config()?.serverUrl || '');
    focusEngine.setActiveModal('settingsServer');
    setTimeout(() => focusEngine.setFocus('settingsModal', 0), 50);
  };

  const closeModal = (returnRowIndex: number) => {
    focusEngine.setActiveModal('none');
    setTimeout(() => focusEngine.setFocus('settings', returnRowIndex), 50);
  };

  const handleTestConnection = async () => {
    const cfg = config();
    if (!cfg) {
      setStatusMsg('Not configured.');
      return;
    }
    setIsTesting(true);
    setStatusMsg('Testing connection...');
    try {
      const ok = await api.ping({
        serverUrl: cfg.serverUrl,
        username: cfg.username,
        password: cfg.password,
      });
      setStatusMsg(ok ? '✓ Connected successfully.' : 'Ping failed.');
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveServer = async () => {
    if (!editServerUrl()) {
      setStatusMsg('Enter server URL.');
      return;
    }

    if (profiles().length === 0) {
      api.setCredentials(editServerUrl(), '', '');
      setStatusMsg('✓ Server URL saved! Now add a profile.');
      closeModal(0);
      return;
    }

    const cfg = config();
    const user = cfg?.username || 'admin';
    const pass = cfg?.password || '';

    setIsTesting(true);
    setStatusMsg('Verifying server...');
    try {
      const ok = await api.ping({
        serverUrl: editServerUrl(),
        username: user,
        password: pass,
      });
      if (!ok) {
        setStatusMsg('Server ping failed.');
        setIsTesting(false);
        return;
      }
      api.setCredentials(editServerUrl(), user, pass);
      clearHomeCache();
      clearSearchCache();
      clearAlbumCache();
      setStatusMsg('✓ Server URL saved!');
      closeModal(0);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefreshCache = () => {
    clearHomeCache();
    clearSearchCache();
    clearAlbumCache();
    setStatusMsg('Library cache refreshed! Reloading...');
    sessionStorage.setItem('skipBootSelector', 'true');
    setTimeout(() => window.location.reload(), 600);
  };

  const handleOpenAddProfile = () => {
    setEditingProfileSignal(null);
    setAddProfileReturnState('settings');
    focusEngine.setActiveModal('addProfileModal');
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfileSignal(profile);
    setAddProfileReturnState('settings');
    focusEngine.setActiveModal('addProfileModal');
  };

  const handleToggleBootSelector = () => {
    const nextVal = !showBootSelector();
    setShowBootSelector(nextVal);
    setStatusMsg(nextVal ? 'Profile switcher on launch: ON' : 'Profile switcher on launch: OFF');
  };

  return (
    <main class="flex-1 w-full pt-4 px-16 pb-64 flex z-10">
      {/* Left Stage */}
      <div class="w-1/2 flex flex-col items-end justify-start pt-8 pr-12">
        <SettingsIcon class="w-[520px] h-[520px] text-white/90 drop-shadow-2xl shrink-0" />

        <Show when={statusMsg()}>
          <div class="mt-6 px-8 py-4 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-200 text-2xl font-extrabold shadow-2xl text-center max-w-[460px]">
            {statusMsg()}
          </div>
        </Show>
      </div>

      {/* Right Stage */}
      <div class="w-1/2 pl-12">
        <div class="w-full pr-8 flex flex-col gap-3 pb-16 py-4 px-3 -my-4 -mx-3">
          {/* SERVER CONFIGURATION */}
          <div class="text-xl font-black text-neutral-400/90 tracking-wider uppercase mt-4 mb-2 ml-6">
            Server Configuration
          </div>

          <button
            onClick={openServerModal}
            class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
            data-focusable="true"
            data-variant="list"
            data-section="settings"
            data-index="0"
          >
            <span class="text-3xl font-extrabold tracking-tight shrink-0">Server URL</span>
            <div class="flex items-center gap-4 text-neutral-300 font-bold text-2xl min-w-0">
              <span class="truncate max-w-md">{config()?.serverUrl || 'Not configured'}</span>
              <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
            </div>
          </button>

          <button
            onClick={handleTestConnection}
            class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
            data-focusable="true"
            data-variant="list"
            data-section="settings"
            data-index="1"
          >
            <span class="text-3xl font-extrabold tracking-tight">Test Connection</span>
            <div class="flex items-center gap-4 text-neutral-300 font-bold text-2xl">
              <span>{isTesting() ? 'Testing...' : 'Ping Server'}</span>
              <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
            </div>
          </button>

          {/* PROFILES */}
          <div class="text-xl font-black text-neutral-400/90 tracking-wider uppercase mt-6 mb-2 ml-6">
            Profiles
          </div>

          <For each={profiles()}>
            {(profile, idx) => {
              const preset = GRADIENT_PRESETS[profile.gradientPreset] || GRADIENT_PRESETS.crimson;
              const isActive = () => profile.id === activeProfile()?.id;
              const initial = profile.name.charAt(0).toUpperCase();

              return (
                <div
                  onClick={() => handleEditProfile(profile)}
                  class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
                  data-focusable="true"
                  data-variant="list"
                  data-section="settings"
                  data-index={2 + idx()}
                >
                  <div class="flex items-center gap-4 min-w-0">
                    <div class={`w-10 h-10 rounded-full ${preset.bg} flex items-center justify-center text-white font-black text-lg shadow-md shrink-0`}>
                      {initial}
                    </div>
                    <span class="text-3xl font-extrabold tracking-tight truncate">{profile.name}</span>
                    <span class="text-xl font-bold text-neutral-400 truncate">@{profile.username}</span>
                  </div>

                  <div class="flex items-center gap-4">
                    {isActive() && (
                      <span class="px-4 py-1 rounded-full bg-white text-black text-sm font-black uppercase tracking-wider">
                        Active
                      </span>
                    )}
                    <span class="text-xl font-bold text-neutral-400">Edit</span>
                    <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
                  </div>
                </div>
              );
            }}
          </For>

          {/* ADD PROFILE BUTTON */}
          <button
            onClick={handleOpenAddProfile}
            class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
            data-focusable="true"
            data-variant="list"
            data-section="settings"
            data-index={2 + profiles().length}
          >
            <span class="text-3xl font-extrabold tracking-tight text-white">+ Add Profile</span>
            <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
          </button>

          {/* BOOT SELECTOR TOGGLE BUTTON */}
          <button
            onClick={handleToggleBootSelector}
            class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
            data-focusable="true"
            data-variant="list"
            data-section="settings"
            data-index={3 + profiles().length}
          >
            <span class="text-3xl font-extrabold tracking-tight text-white">Show Switcher on Launch</span>
            <div class={`w-16 h-9 rounded-full p-1 transition-colors duration-300 ${showBootSelector() ? 'bg-emerald-500' : 'bg-neutral-600'}`}>
              <div class={`bg-white w-7 h-7 rounded-full shadow-md transform transition-transform duration-300 ${showBootSelector() ? 'translate-x-7' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* DATA & CACHE */}
          <div class="text-xl font-black text-neutral-400/90 tracking-wider uppercase mt-6 mb-2 ml-6">
            Data & Cache
          </div>

          <button
            onClick={handleRefreshCache}
            class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
            data-focusable="true"
            data-variant="list"
            data-section="settings"
            data-index={4 + profiles().length}
          >
            <span class="text-3xl font-extrabold tracking-tight">Refresh Library Cache</span>
            <div class="flex items-center gap-4 text-neutral-300 font-bold text-2xl">
              <span>Clear & Reload</span>
              <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
            </div>
          </button>

          {/* ABOUT */}
          <div class="text-xl font-black text-neutral-400/90 tracking-wider uppercase mt-6 mb-2 ml-6">
            About
          </div>

          <div class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white shadow-md overflow-hidden">
            <span class="text-3xl font-extrabold tracking-tight">NaviOS</span>
            <span class="text-2xl font-bold text-neutral-400">Version 1.9.92</span>
          </div>
        </div>
      </div>

      {/* SERVER MODAL DIALOG OVERLAY */}
      <Show when={focusEngine.activeModal() === 'settingsServer'}>
        <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div class="w-[640px] rounded-[2.5rem] bg-[#1c1e24] border border-neutral-700/80 p-10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-2">
              <h2 class="text-4xl font-black text-white tracking-tight">Server URL</h2>
              <p class="text-xl font-bold text-neutral-400">Enter your Navidrome server endpoint.</p>
            </div>

            <div class="flex flex-col gap-3">
              <input
                type="url"
                value={editServerUrl()}
                onInput={(e) => setEditServerUrl(e.currentTarget.value)}
                placeholder="http://192.168.1.100:4533"
                class="w-full px-8 py-5 rounded-2xl bg-neutral-900 border border-neutral-700 text-3xl text-white focus:outline-none focus:border-white font-medium"
                data-focusable="true"
                data-section="settingsModal"
                data-index="0"
              />
            </div>

            <div class="flex gap-4 pt-4">
              <button
                onClick={() => closeModal(0)}
                class="flex-1 py-5 rounded-2xl bg-neutral-800 text-neutral-300 hover:text-white text-2xl font-extrabold transition-colors"
                data-focusable="true"
                data-section="settingsModal"
                data-index="1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveServer}
                disabled={isTesting()}
                class="flex-1 py-5 rounded-2xl bg-white text-black text-2xl font-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
                data-focusable="true"
                data-section="settingsModal"
                data-index="2"
              >
                {isTesting() ? 'Saving...' : 'Save Server'}
              </button>
            </div>
          </div>
        </div>
      </Show>


    </main>
  );
};
