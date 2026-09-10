import { Component, createSignal, For, onMount } from 'solid-js';
import { UserProfile, GRADIENT_PRESETS, saveProfile, getActiveProfileId, deleteProfile } from '../services/profiles';
import { api } from '../services/api';
import { focusEngine } from '../services/focus';

interface AddProfileModalProps {
  initialProfile?: UserProfile | null;
  onClose: () => void;
  onSaved?: (profile: UserProfile) => void;
}

export const AddProfileModal: Component<AddProfileModalProps> = (props) => {
  const isEditing = () => !!props.initialProfile;

  const [name, setName] = createSignal(props.initialProfile?.name || '');
  const [username, setUsername] = createSignal(props.initialProfile?.username || '');
  const [password, setPassword] = createSignal(props.initialProfile?.password || '');
  const [gradient, setGradient] = createSignal(props.initialProfile?.gradientPreset || 'crimson');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [statusMsg, setStatusMsg] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);

  const presets = Object.keys(GRADIENT_PRESETS);

  onMount(() => {
    focusEngine.setActiveModal('addProfileModal');
    setTimeout(() => focusEngine.setFocus('addProfileModal', 0), 50);
  });

  const handleDelete = () => {
    if (props.initialProfile) {
      deleteProfile(props.initialProfile.id);
      
      // If we deleted the active profile, reload to trigger boot selector or home
      if (props.initialProfile.id === getActiveProfileId()) {
        window.location.reload();
        return;
      }

      props.onClose();
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    setStatusMsg('');

    if (!name().trim()) {
      setErrorMsg('Please enter a profile name.');
      return;
    }
    if (!username().trim()) {
      setErrorMsg('Please enter a username.');
      return;
    }

    setIsSaving(true);
    setStatusMsg('Verifying credentials...');

    try {
      const serverUrl = api.getConfig()?.serverUrl || '';
      if (!serverUrl) {
        setStatusMsg('');
        setErrorMsg('Please configure the Server URL in Settings first.');
        setIsSaving(false);
        return;
      }

      const ok = await api.ping({
        serverUrl,
        username: username().trim(),
        password: password(),
      });

      if (!ok) {
        setStatusMsg('');
        setErrorMsg('Authentication failed for this account.');
        setIsSaving(false);
        return;
      }

      const profile: UserProfile = {
        id: props.initialProfile?.id || `profile_${Date.now()}`,
        name: name().trim(),
        username: username().trim(),
        password: password(),
        gradientPreset: gradient(),
        createdAt: props.initialProfile?.createdAt || Date.now(),
      };

      saveProfile(profile);
      
      if (!isEditing()) {
        // If it's a brand new profile, switch to it and reload
        api.switchProfile(profile.id);
        sessionStorage.setItem('skipBootSelector', 'true');
        window.location.reload();
        return;
      } else if (profile.id === getActiveProfileId()) {
        // If we edited the currently active profile, update the running config
        api.switchProfile(profile.id);
      }

      setIsSaving(false);
      if (props.onSaved) props.onSaved(profile);
      props.onClose();
    } catch (err: any) {
      setStatusMsg('');
      setErrorMsg(`Error: ${err.message || err}`);
      setIsSaving(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-8">
      <div class="w-[640px] rounded-[2.5rem] bg-[#1c1e24] border border-neutral-700/80 p-10 flex flex-col gap-6 shadow-2xl">
        <div class="flex flex-col gap-1">
          <h2 class="text-4xl font-black text-white tracking-tight">
            {isEditing() ? 'Edit Profile' : 'Add Profile'}
          </h2>
          <p class="text-xl font-bold text-neutral-400">
            Customise profile credentials and colour.
          </p>
        </div>

        {errorMsg() && (
          <div class="px-6 py-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold text-xl">
            {errorMsg()}
          </div>
        )}
        
        {statusMsg() && !errorMsg() && (
          <div class="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-extrabold text-xl">
            {statusMsg()}
          </div>
        )}

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-base font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">
              Profile Name
            </label>
            <input
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="e.g. Ariana, Partner"
              class="w-full px-7 py-4 rounded-2xl bg-neutral-900 border border-neutral-700 text-2xl text-white focus:outline-none focus:border-white font-medium"
              data-focusable="true"
              data-section="addProfileModal"
              data-index="0"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-base font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                placeholder="Username"
                class="w-full px-7 py-4 rounded-2xl bg-neutral-900 border border-neutral-700 text-2xl text-white focus:outline-none focus:border-white font-medium"
                data-focusable="true"
                data-section="addProfileModal"
                data-index="1"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-base font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="••••••••"
                class="w-full px-7 py-4 rounded-2xl bg-neutral-900 border border-neutral-700 text-2xl text-white focus:outline-none focus:border-white font-medium"
                data-focusable="true"
                data-section="addProfileModal"
                data-index="2"
              />
            </div>
          </div>

          {/* Colour Gradient Picker */}
          <div class="flex flex-col gap-2 pt-1">
            <label class="text-base font-extrabold text-neutral-400 ml-2 uppercase tracking-wider">
              Profile Colour
            </label>
            <div class="flex items-center gap-3">
              <For each={presets}>
                {(presetKey, idx) => {
                  const preset = GRADIENT_PRESETS[presetKey];
                  const isSelected = () => gradient() === presetKey;
                  return (
                    <button
                      type="button"
                      onClick={() => setGradient(presetKey)}
                      class={`w-14 h-14 rounded-2xl ${preset.bg} flex items-center justify-center cursor-pointer transition-transform ${
                        isSelected() ? 'ring-4 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      data-focusable="true"
                      data-section="addProfileModal"
                      data-index={3 + idx()}
                    >
                      {isSelected() && <span class="text-white text-xl font-black">✓</span>}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>

        <div class="flex gap-4 pt-4">
          {isEditing() && (
            <button
              type="button"
              onClick={handleDelete}
              class="flex-1 py-4 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-2xl font-extrabold transition-colors cursor-pointer"
              data-focusable="true"
              data-section="addProfileModal"
              data-index={3 + presets.length}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={props.onClose}
            class="flex-1 py-4 rounded-2xl bg-neutral-800 text-neutral-300 hover:text-white text-2xl font-extrabold transition-colors cursor-pointer"
            data-focusable="true"
            data-section="addProfileModal"
            data-index={isEditing() ? 4 + presets.length : 3 + presets.length}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving()}
            class="flex-1 py-4 rounded-2xl bg-white text-black text-2xl font-black hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
            data-focusable="true"
            data-section="addProfileModal"
            data-index={isEditing() ? 5 + presets.length : 4 + presets.length}
          >
            {isSaving() ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};
