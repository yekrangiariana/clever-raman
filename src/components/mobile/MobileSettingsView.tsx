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
        <div class="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 shadow-lg">
          
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1 pr-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Server Endpoint</span>
              <p class="text-sm font-bold text-white font-mono truncate mt-0.5">
                {config()?.serverUrl || 'Not configured'}
              </p>
              <p class="text-xs text-neutral-400 mt-0.5">
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
              class="px-3.5 py-1.5 bg-white/10 text-white rounded-full text-xs font-bold active:scale-95 shrink-0"
            >
              {isEditingServer() ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <Show when={isEditingServer()}>
            <div class="flex flex-col gap-2.5 pt-3 border-t border-white/10">
              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Server URL</label>
                <input
                  type="url"
                  value={serverUrlInput()}
                  onInput={(e) => setServerUrlInput((e.target as HTMLInputElement).value)}
                  placeholder="http://192.168.1.141:4533"
                  class="w-full h-10 px-3 bg-neutral-800 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#fa243c]"
                />
              </div>

              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Username</label>
                <input
                  type="text"
                  value={usernameInput()}
                  onInput={(e) => setUsernameInput((e.target as HTMLInputElement).value)}
                  placeholder="admin"
                  class="w-full h-10 px-3 bg-neutral-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#fa243c]"
                />
              </div>

              <div>
                <label class="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Password</label>
                <input
                  type="password"
                  value={passwordInput()}
                  onInput={(e) => setPasswordInput((e.target as HTMLInputElement).value)}
                  placeholder="Password"
                  class="w-full h-10 px-3 bg-neutral-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#fa243c]"
                />
              </div>

              <button
                onClick={handleSaveCredentials}
                class="w-full py-2.5 bg-[#fa243c] text-white rounded-xl text-xs font-bold shadow-md active:scale-98 mt-1"
              >
                Save & Connect
              </button>
            </div>
          </Show>

          <button
            onClick={handleTestConnection}
            disabled={isTesting()}
            class="w-full py-2.5 bg-neutral-800 border border-white/10 hover:bg-neutral-700 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 active:scale-98 transition-transform"
          >
            <SettingsIcon class="w-4 h-4" />
            <span>{isTesting() ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <Show when={statusMsg()}>
            <p class="text-xs font-semibold text-neutral-300 text-center pt-1">
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
        <div class="bg-neutral-900/80 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden shadow-lg">
          <div
            onClick={handleClearAllCaches}
            class="p-4 flex items-center justify-between text-neutral-300 hover:text-white active:bg-white/5 cursor-pointer"
          >
            <span class="text-xs font-bold">Clear Image & Album Cache</span>
            <span class="text-xs text-[#fa243c] font-bold">Clear</span>
          </div>
          <div class="p-4 flex items-center justify-between text-neutral-400 text-xs">
            <span>{APP_NAME} Version</span>
            <span class="font-mono text-neutral-300 font-bold">{pkg.version}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
