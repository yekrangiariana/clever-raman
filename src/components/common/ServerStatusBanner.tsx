import { Component, Show } from 'solid-js';
import { isServerReachable, isCheckingServer, checkServerReachability } from '../../services/serverReachability';

export const ServerStatusBanner: Component = () => {
  return (
    <Show when={!isServerReachable()}>
      <div class="fixed top-[calc(env(safe-area-inset-top,12px)+8px)] left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
        <div class="w-full max-w-md bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/15 text-white shadow-2xl rounded-full px-4 py-2.5 flex items-center justify-between gap-3 pointer-events-auto">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#fa243c]"></span>
            </span>

            <div class="flex flex-col min-w-0">
              <span class="text-xs font-extrabold text-white tracking-tight leading-none">
                Server Unreachable
              </span>
              <span class="text-[10px] font-medium text-white/60 truncate mt-0.5">
                Check server connection or Tailscale
              </span>
            </div>
          </div>

          <button
            onClick={() => checkServerReachability()}
            disabled={isCheckingServer()}
            class="px-3.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-full font-bold text-[11px] shrink-0 transition-all border border-white/10 disabled:opacity-50"
          >
            {isCheckingServer() ? 'Connecting...' : 'Retry'}
          </button>
        </div>
      </div>
    </Show>
  );
};
