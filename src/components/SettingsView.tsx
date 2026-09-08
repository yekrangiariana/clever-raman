import { Component, createSignal, Show } from 'solid-js';
import { api } from '../services/api';
import { focusEngine } from '../services/focus';
import { clearHomeCache } from './HomeView';
import { clearSearchCache } from './SearchView';
import { clearAlbumCache } from './MainGrid';
import { SettingsIcon, ChevronRightIcon } from './common/Icons';

export const SettingsView: Component = () => {
  const [statusMsg, setStatusMsg] = createSignal<string>('');
  const [isTesting, setIsTesting] = createSignal<boolean>(false);

  const config = () => api.getConfig();

  const [editServerUrl, setEditServerUrl] = createSignal(config()?.serverUrl || '');
  const [editUsername, setEditUsername] = createSignal(config()?.username || '');
  const [editPassword, setEditPassword] = createSignal(config()?.password || '');

  const openServerModal = () => {
    setEditServerUrl(config()?.serverUrl || '');
    focusEngine.setActiveModal('settingsServer');
    setTimeout(() => focusEngine.setFocus('settingsModal', 0), 50);
  };

  const openAccountModal = () => {
    setEditUsername(config()?.username || '');
    setEditPassword(config()?.password || '');
    focusEngine.setActiveModal('settingsAccount');
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
    const cfg = config();
    const user = editUsername() || cfg?.username || 'admin';
    const pass = editPassword() || cfg?.password || '';

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

  const handleSaveCredentials = async () => {
    if (!editUsername()) {
      setStatusMsg('Enter username.');
      return;
    }
    const cfg = config();
    const server = editServerUrl() || cfg?.serverUrl || '';

    setIsTesting(true);
    setStatusMsg('Verifying user credentials...');
    try {
      const ok = await api.ping({
        serverUrl: server,
        username: editUsername(),
        password: editPassword(),
      });
      if (!ok) {
        setStatusMsg('Authentication failed.');
        setIsTesting(false);
        return;
      }
      api.setCredentials(server, editUsername(), editPassword());
      clearHomeCache();
      clearSearchCache();
      clearAlbumCache();
      setStatusMsg('✓ Account saved!');
      closeModal(2);
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
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <main class="flex-1 w-full pt-4 px-16 pb-64 flex z-10">
      {/* Left Stage: Exactly 50% width, content pushed to the right (towards center line) */}
      <div class="w-1/2 flex flex-col items-end justify-start pt-8 pr-12">
        <SettingsIcon class="w-[520px] h-[520px] text-white/90 drop-shadow-2xl shrink-0" />

        <Show when={statusMsg()}>
          <div class="mt-6 px-8 py-4 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-200 text-2xl font-extrabold shadow-2xl text-center max-w-[460px] animate-fade-in">
            {statusMsg()}
          </div>
        </Show>
      </div>

      {/* Right Stage: Exactly 50% width, content starts from the left (away from center line) */}
      <div class="w-1/2 pl-12">
        <div class="w-full pr-8 flex flex-col gap-3 pb-16 py-4 px-3 -my-4 -mx-3">
          {/* SERVER & CONNECTION */}
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

        {/* ACCOUNTS & USER CREDENTIALS */}
        <div class="text-xl font-black text-neutral-400/90 tracking-wider uppercase mt-6 mb-2 ml-6">
          User Account
        </div>

        <button
          onClick={openAccountModal}
          class="w-full h-20 px-8 rounded-full flex items-center justify-between bg-[#2a2c32]/80 border border-neutral-700/40 text-white hover:bg-neutral-700/80 transition-all duration-150 cursor-pointer shadow-md overflow-hidden"
          data-focusable="true"
          data-variant="list"
          data-section="settings"
          data-index="2"
        >
          <span class="text-3xl font-extrabold tracking-tight text-white">Active Account</span>
          <div class="flex items-center gap-4 text-neutral-300 font-bold text-2xl min-w-0">
            <span class="truncate max-w-sm">{config()?.username || 'Guest'}</span>
            <ChevronRightIcon class="w-7 h-7 text-neutral-400 shrink-0" />
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
          data-index="3"
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
          <span class="text-2xl font-bold text-neutral-400">Version 1.7.8</span>
        </div>
        </div>
      </div>

      {/* SERVER MODAL DIALOG OVERLAY */}
      <Show when={focusEngine.activeModal() === 'settingsServer'}>
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in">
          <div class="w-[640px] rounded-[2.5rem] bg-[#1c1e24] border border-neutral-700/80 p-10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-2">
              <h2 class="text-4xl font-black text-white tracking-tight">Server URL</h2>
              <p class="text-xl font-bold text-neutral-400">Enter your Navidrome or Subsonic server endpoint.</p>
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

      {/* ACCOUNT MODAL DIALOG OVERLAY */}
      <Show when={focusEngine.activeModal() === 'settingsAccount'}>
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in">
          <div class="w-[640px] rounded-[2.5rem] bg-[#1c1e24] border border-neutral-700/80 p-10 flex flex-col gap-8 shadow-2xl">
            <div class="flex flex-col gap-2">
              <h2 class="text-4xl font-black text-white tracking-tight">Active Account</h2>
              <p class="text-xl font-bold text-neutral-400">Enter user credentials for your server.</p>
            </div>

            <div class="flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-lg font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={editUsername()}
                  onInput={(e) => setEditUsername(e.currentTarget.value)}
                  placeholder="admin"
                  class="w-full px-8 py-5 rounded-2xl bg-neutral-900 border border-neutral-700 text-3xl text-white focus:outline-none focus:border-white font-medium"
                  data-focusable="true"
                  data-section="settingsModal"
                  data-index="0"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-lg font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={editPassword()}
                  onInput={(e) => setEditPassword(e.currentTarget.value)}
                  placeholder="••••••••"
                  class="w-full px-8 py-5 rounded-2xl bg-neutral-900 border border-neutral-700 text-3xl text-white focus:outline-none focus:border-white font-medium"
                  data-focusable="true"
                  data-section="settingsModal"
                  data-index="1"
                />
              </div>
            </div>

            <div class="flex gap-4 pt-4">
              <button
                onClick={() => closeModal(2)}
                class="flex-1 py-5 rounded-2xl bg-neutral-800 text-neutral-300 hover:text-white text-2xl font-extrabold transition-colors"
                data-focusable="true"
                data-section="settingsModal"
                data-index="2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCredentials}
                disabled={isTesting()}
                class="flex-1 py-5 rounded-2xl bg-white text-black text-2xl font-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
                data-focusable="true"
                data-section="settingsModal"
                data-index="3"
              >
                {isTesting() ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </main>
  );
};
