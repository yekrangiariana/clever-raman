import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { getProfiles, getActiveProfileId, UserProfile, GRADIENT_PRESETS } from '../services/profiles';
import { api } from '../services/api';
import { focusEngine } from '../services/focus';

interface ProfileSelectorModalProps {
  onClose?: () => void;
  onOpenAddProfile?: () => void;
  showAddProfileCard?: boolean;
}

export const ProfileSelectorModal: Component<ProfileSelectorModalProps> = (props) => {
  const [profiles, setProfiles] = createSignal<UserProfile[]>([]);
  const activeId = () => getActiveProfileId();

  onMount(() => {
    setProfiles(getProfiles());
    // Auto focus first profile card
    setTimeout(() => focusEngine.setFocus('profileSelector', 0), 50);
  });

  const handleSelectProfile = (profile: UserProfile) => {
    if (profile.id === activeId()) {
      focusEngine.setActiveModal('none');
      focusEngine.setFocus('topBar', 0);
      if (props.onClose) props.onClose();
      return;
    }

    api.switchProfile(profile.id);
    
    // For a household TV app, hard reloading guarantees 
    // zero state pollution between profiles seamlessly.
    sessionStorage.setItem('skipBootSelector', 'true');
    window.location.reload();
  };

  return (
    <div class="fixed inset-0 z-50 bg-[#0e0e12] flex flex-col items-center justify-center p-12 overflow-hidden">
      <div class="relative z-10 flex flex-col items-center gap-10 max-w-5xl text-center">
        {/* Succinct British English Header */}
        <div class="flex flex-col items-center gap-2">
          <h1 class="text-6xl font-black text-white tracking-tight drop-shadow-md">
            Who's listening?
          </h1>
          <p class="text-2xl font-bold text-neutral-400">
            Select a profile to continue.
          </p>
        </div>

        {/* Squircle Avatars Row */}
        <div class="flex items-center justify-center gap-10 flex-wrap pt-4">
          <For each={profiles()}>
            {(profile, idx) => {
              const preset = GRADIENT_PRESETS[profile.gradientPreset] || GRADIENT_PRESETS.crimson;
              const isActive = () => profile.id === activeId();
              const initial = profile.name.charAt(0).toUpperCase();

              return (
                <div class="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectProfile(profile)}
                    class={`w-44 h-44 rounded-[2.5rem] ${preset.bg} flex items-center justify-center text-white font-black text-6xl shadow-2xl transition-transform cursor-pointer relative`}
                    data-focusable="true"
                    data-section="profileSelector"
                    data-index={idx()}
                  >
                    <span class="drop-shadow-lg">{initial}</span>
                    {isActive() && (
                      <div class="absolute top-3 right-3 px-3 py-1 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider shadow-md">
                        Active
                      </div>
                    )}
                  </button>

                  <div class="flex flex-col items-center">
                    <span class="text-3xl font-black text-white tracking-tight">{profile.name}</span>
                  </div>
                </div>
              );
            }}
          </For>

          {/* Add Profile Squircle Card (Only if showAddProfileCard is true) */}
          <Show when={props.showAddProfileCard && props.onOpenAddProfile}>
            <div class="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={props.onOpenAddProfile}
                class="w-44 h-44 rounded-[2.5rem] bg-neutral-900/60 border-3 border-dashed border-neutral-700 hover:border-white hover:bg-neutral-800/80 flex flex-col items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer shadow-xl"
                data-focusable="true"
                data-section="profileSelector"
                data-index={profiles().length}
              >
                <span class="text-6xl font-black">+</span>
              </button>

              <div class="flex flex-col items-center">
                <span class="text-3xl font-black text-white tracking-tight">Add Profile</span>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
