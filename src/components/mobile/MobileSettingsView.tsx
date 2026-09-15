import { Component, createSignal, Show } from 'solid-js';
import { APP_NAME } from "../../config/constants";
import { api } from '../../services/api';
import {
  activeProfileSignal,
  saveProfile,
} from '../../services/profiles';
import { clearHomeCache } from '../HomeView';
import { clearSearchCache } from '../SearchView';
import { clearAlbumCache } from '../MainGrid';
import pkg from '../../../package.json';
import { SettingsIcon } from '../common/Icons';
import { MobileStorageSheet } from './MobileStorageSheet';
import { globalStorageSheetOpen, setGlobalStorageSheetOpen } from '../../services/uiState';

export const MobileSettingsView: Component = () => {
  const [statusMsg, setStatusMsg] = createSignal<string>('');
  const [isTesting, setIsTesting] = createSignal<boolean>(false);
  const [isEditingServer, setIsEditingServer] = createSignal<boolean>(false);

  const config = () => api.getConfig();
  const activeProfile = () => activeProfileSignal();

  const [serverUrlInput, setServerUrlInput] = createSignal(config()?.serverUrl || 'http://192.168.1.141:4533');
  const [usernameInput, setUsernameInput] = createSignal(config()?.username || 'admin');
  const [passwordInput, setPasswordInput] = createSignal(config()?.password || '123');

  const handleTestConnection = async () => {
    const cfg = config();
    setIsTesting(true);
    setStatusMsg('Testing connection...');
    try {
      const ok = await api.ping(cfg ? {
        serverUrl: cfg.serverUrl,
        username: cfg.username,
        password: cfg.password,
      } : {
        serverUrl: serverUrlInput(),
        username: usernameInput(),
        password: passwordInput(),
      });
      setStatusMsg(ok ? '✓ Connected successfully to Navidrome!' : 'Ping failed.');
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = () => {
    const url = serverUrlInput().trim();
    const u = usernameInput().trim();
    const p = passwordInput();
    if (!url || !u) {
      setStatusMsg('Please enter both server URL and username.');
      return;
    }

    const current = activeProfile();
    if (current) {
      saveProfile({
        ...current,
        serverUrl: url,
        username: u,
        password: p,
      });
      api.switchProfile(current.id);
    } else {
      api.setCredentials(url, u, p);
    }
    setStatusMsg('✓ Saved & Reconnected to ' + url);
    setIsEditingServer(false);
  };

  const handleClearAllCaches = () => {
    clearHomeCache();
    clearSearchCache();
    clearAlbumCache();
    setStatusMsg('✓ Local album & image cache cleared.');
  };

  return (
    <div class="w-full flex flex-col gap-5 pb-32 pt-2 px-4">
      
      {/* Connected Server Card */}
      <div>
        <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 px-1">
          Navidrome Connection
        </h2>
        <div class="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 flex flex-col gap-3.5 shadow-lg">
          
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1 pr-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Server Endpoint</span>
              <p class="text-sm font-bold text-white font-mono truncate mt-0.5">
                {config()?.serverUrl || 'Not configured'}
              </p>
              <p class="text-xs text-neutral-300 mt-0.5">
                User: <span class="text-white font-semibold">{config()?.username || 'admin'}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setServerUrlInput(config()?.serverUrl || '');
                setUsernameInput(config()?.username || '');
                setPasswordInput(config()?.password || '');
                setIsEditingServer(!isEditingServer());
              }}
              class="px-3.5 py-1.5 bg-white/15 hover:bg-white/20 border border-white/15 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shrink-0 shadow-sm"
            >
              {isEditingServer() ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <Show when={isEditingServer()}>
            <div class="flex flex-col gap-3 pt-3 border-t border-white/10">
              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Server URL</label>
                <input
                  type="url"
                  value={serverUrlInput()}
                  onInput={(e) => setServerUrlInput((e.target as HTMLInputElement).value)}
                  placeholder="http://192.168.1.141:4533"
                  class="w-full h-11 px-3 bg-white/10 border border-white/15 rounded-2xl text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#fa243c] transition-all"
                />
              </div>

              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Username</label>
                <input
                  type="text"
                  value={usernameInput()}
                  onInput={(e) => setUsernameInput((e.target as HTMLInputElement).value)}
                  placeholder="admin"
                  class="w-full h-11 px-3 bg-white/10 border border-white/15 rounded-2xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#fa243c] transition-all"
                />
              </div>

              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Password</label>
                <input
                  type="password"
                  value={passwordInput()}
                  onInput={(e) => setPasswordInput((e.target as HTMLInputElement).value)}
                  placeholder="Password"
                  class="w-full h-11 px-3 bg-white/10 border border-white/15 rounded-2xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#fa243c] transition-all"
                />
              </div>

              <button
                onClick={handleSaveCredentials}
                class="w-full py-3 bg-[#fa243c] hover:bg-[#e01e35] text-white rounded-2xl text-xs font-bold shadow-xl active:scale-95 transition-all mt-1"
              >
                Save & Connect
              </button>
            </div>
          </Show>

          <button
            onClick={handleTestConnection}
            disabled={isTesting()}
            class="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            <SettingsIcon class="w-4 h-4" />
            <span>{isTesting() ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <Show when={statusMsg()}>
            <p class="text-xs font-semibold text-neutral-200 text-center pt-1">
              {statusMsg()}
            </p>
          </Show>
        </div>
      </div>

      {/* Storage & Maintenance */}
      <div>
        <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2 px-1">
          Maintenance & Info
        </h2>
        <div class="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl divide-y divide-white/10 overflow-hidden shadow-lg">
          <div
            onClick={() => setGlobalStorageSheetOpen(true)}
            class="p-4 flex items-center justify-between text-neutral-200 hover:text-white active:bg-white/10 transition-colors cursor-pointer"
          >
            <span class="text-xs font-bold">Offline Storage</span>
            <div class="flex items-center gap-1 text-neutral-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          <div
            onClick={handleClearAllCaches}
            class="p-4 flex items-center justify-between text-neutral-200 hover:text-white active:bg-white/10 transition-colors cursor-pointer"
          >
            <span class="text-xs font-bold">Clear Image & Album Cache</span>
            <span class="text-xs text-[#fa243c] font-bold">Clear</span>
          </div>
          <div class="p-4 flex items-center justify-between text-neutral-300 text-xs">
            <span>{APP_NAME} Version</span>
            <span class="font-mono text-white font-bold">{pkg.version}</span>
          </div>
        </div>
      </div>

      <MobileStorageSheet 
        isOpen={globalStorageSheetOpen()} 
        onClose={() => setGlobalStorageSheetOpen(false)} 
      />
    </div>
  );
};

