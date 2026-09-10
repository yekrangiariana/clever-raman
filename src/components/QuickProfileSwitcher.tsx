import { Component, createSignal, For, onMount } from 'solid-js';
import { getProfiles, getActiveProfileId, UserProfile, GRADIENT_PRESETS } from '../services/profiles';
import { api } from '../services/api';

interface QuickProfileSwitcherProps {
  onClose: () => void;
  onOpenAddProfile: () => void;
  onManageProfiles: () => void;
}

export const QuickProfileSwitcher: Component<QuickProfileSwitcherProps> = (props) => {
  const [profiles, setProfiles] = createSignal<UserProfile[]>([]);
  const activeId = () => getActiveProfileId();

  onMount(() => {
    setProfiles(getProfiles());
  });

  const handleSelectProfile = (profile: UserProfile) => {
    if (profile.id === activeId()) {
      props.onClose();
      return;
    }

    api.switchProfile(profile.id);
    
    // For a household TV app, hard reloading guarantees 
    // zero state pollution between profiles seamlessly.
    sessionStorage.setItem('skipBootSelector', 'true');
    window.location.reload();
  };

  return (
    <div class="fixed inset-0 z-50 pointer-events-auto flex justify-end p-8 animate-fade-in bg-black/40">
      {/* Control Center Side Sheet Card */}
      <div 
        class="w-[440px] rounded-[2.5rem] bg-[#1a1c23]/95 border border-neutral-700/80 p-8 flex flex-col gap-6 shadow-2xl self-start mt-16 mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <h3 class="text-3xl font-black text-white tracking-tight">Profiles</h3>
          </div>
          <button
            onClick={props.onClose}
            class="w-10 h-10 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-black text-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Profile List */}
        <div class="flex flex-col gap-3 max-h-[380px] overflow-y-auto py-3 -my-3 px-3 -mx-3">
          <For each={profiles()}>
            {(profile, idx) => {
              const preset = GRADIENT_PRESETS[profile.gradientPreset] || GRADIENT_PRESETS.crimson;
              const isActive = () => profile.id === activeId();
              const initial = profile.name.charAt(0).toUpperCase();

              return (
                <button
                  type="button"
                  onClick={() => handleSelectProfile(profile)}
                  class={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                    isActive()
                      ? 'bg-neutral-800/90 border-white/40 text-white shadow-lg'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                  data-focusable="true"
                  data-section="profileQuickMenu"
                  data-index={idx()}
                >
                  <div class="flex items-center gap-4 min-w-0">
                    <div class={`w-14 h-14 rounded-2xl ${preset.bg} flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0`}>
                      {initial}
                    </div>
                    <div class="flex flex-col text-left min-w-0">
                      <span class="text-2xl font-black text-white truncate">{profile.name}</span>
                      <span class="text-base font-bold text-neutral-400 truncate">@{profile.username}</span>
                    </div>
                  </div>

                  {isActive() && (
                    <span class="px-4 py-1.5 rounded-full bg-white text-black text-sm font-black tracking-wider uppercase shadow-md shrink-0">
                      Active
                    </span>
                  )}
                </button>
              );
            }}
          </For>
        </div>

        {/* Bottom Options */}
        <div class="flex flex-col gap-2.5 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => {
              props.onClose();
              props.onOpenAddProfile();
            }}
            class="w-full py-4 rounded-2xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/50 text-white text-xl font-black flex items-center justify-center gap-3 cursor-pointer"
            data-focusable="true"
            data-section="profileQuickMenu"
            data-index={profiles().length}
          >
            <span class="text-2xl font-black">+</span>
            <span>Add Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              props.onClose();
              props.onManageProfiles();
            }}
            class="w-full py-3.5 rounded-2xl text-neutral-400 hover:text-white text-lg font-extrabold flex items-center justify-center cursor-pointer"
            data-focusable="true"
            data-section="profileQuickMenu"
            data-index={profiles().length + 1}
          >
            Manage Profiles
          </button>
        </div>
      </div>
    </div>
  );
};
