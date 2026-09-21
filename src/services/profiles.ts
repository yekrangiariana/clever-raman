import { createSignal } from 'solid-js';
import { DEV_CONFIG } from '../config/devConfig';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  password: string;
  gradientPreset: string; // 'crimson' | 'violet' | 'cyan' | 'amber' | 'emerald' | 'indigo'
  serverUrl?: string;
  createdAt: number;
}

export const GRADIENT_PRESETS: Record<string, { bg: string; text: string; label: string }> = {
  crimson: { bg: 'bg-gradient-to-br from-rose-500 to-amber-500', text: 'text-rose-400', label: 'Crimson' },
  violet: { bg: 'bg-gradient-to-br from-purple-600 to-pink-500', text: 'text-purple-400', label: 'Violet' },
  cyan: { bg: 'bg-gradient-to-br from-cyan-500 to-blue-600', text: 'text-cyan-400', label: 'Cyan' },
  amber: { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-amber-400', label: 'Amber' },
  emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-emerald-400', label: 'Emerald' },
  indigo: { bg: 'bg-gradient-to-br from-indigo-600 to-purple-600', text: 'text-indigo-400', label: 'Indigo' },
};

const PROFILES_STORAGE_KEY = 'navios_profiles';
const ACTIVE_PROFILE_ID_KEY = 'navios_active_profile_id';
const SHOW_BOOT_SELECTOR_KEY = 'navios_show_profile_selector_on_boot';
const LEGACY_STORAGE_KEY = 'navios_config';
const OLD_LEGACY_STORAGE_KEY = 'navidrome_tv_config';

export function getShowBootSelector(): boolean {
  try {
    const val = localStorage.getItem(SHOW_BOOT_SELECTOR_KEY);
    return val !== null ? val === 'true' : false;
  } catch (e) {
    return false;
  }
}

// Reactive signals for active profile, profiles list, and boot toggle
const [profilesSignal, setProfilesSignal] = createSignal<UserProfile[]>([]);
const [activeProfileSignal, setActiveProfileSignal] = createSignal<UserProfile | null>(null);
const [sessionVersionSignal, setSessionVersionSignal] = createSignal<number>(0);
const [showBootSelectorSignal, setShowBootSelectorSignal] = createSignal<boolean>(getShowBootSelector());
const [editingProfileSignal, setEditingProfileSignal] = createSignal<UserProfile | null>(null);
const [addProfileReturnState, setAddProfileReturnState] = createSignal<'settings' | 'selector' | 'topBar'>('topBar');

export { 
  profilesSignal, 
  activeProfileSignal, 
  sessionVersionSignal, 
  showBootSelectorSignal,
  editingProfileSignal,
  setEditingProfileSignal,
  addProfileReturnState,
  setAddProfileReturnState
};

export function setShowBootSelector(show: boolean): void {
  try {
    localStorage.setItem(SHOW_BOOT_SELECTOR_KEY, String(show));
    setShowBootSelectorSignal(show);
  } catch (e) {
    console.error('Failed to set show boot selector', e);
  }
}

export function getProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load profiles', e);
  }
  return [];
}

export function saveProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    setProfilesSignal([...profiles]);
  } catch (e) {
    console.error('Failed to save profiles', e);
  }
}

export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  } catch (e) {
    return null;
  }
}

export function getScopedKey(baseKey: string): string {
  const pid = getActiveProfileId() || 'default';
  return `${baseKey}_${pid}`;
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
    const profiles = getProfiles();
    const found = profiles.find((p) => p.id === id) || profiles[0] || null;
    setActiveProfileSignal(found);
  } catch (e) {
    console.error('Failed to set active profile ID', e);
  }
}

export function getActiveProfile(): UserProfile | null {
  const profiles = getProfiles();
  if (!profiles.length) return null;
  const activeId = getActiveProfileId();
  if (activeId) {
    const found = profiles.find((p) => p.id === activeId);
    if (found) return found;
  }
  return profiles[0];
}

export function saveProfile(profile: UserProfile): UserProfile[] {
  const profiles = getProfiles();
  const existingIdx = profiles.findIndex((p) => p.id === profile.id);
  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.push(profile);
  }
  saveProfiles(profiles);
  if (!getActiveProfileId() || profiles.length === 1) {
    setActiveProfileId(profile.id);
  }
  return profiles;
}

export function deleteProfile(id: string): UserProfile[] {
  let profiles = getProfiles();
  profiles = profiles.filter((p) => p.id !== id);
  saveProfiles(profiles);
  if (getActiveProfileId() === id) {
    if (profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    } else {
      localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      setActiveProfileSignal(null);
    }
  }
  return profiles;
}

export function bumpSessionVersion(): void {
  setSessionVersionSignal((v) => v + 1);
}

export function initProfiles(): UserProfile[] {
  let profiles = getProfiles();
  if (profiles.length > 0) {
    // If active profile is missing serverUrl but DEV_CONFIG has it, fill it in
    if (DEV_CONFIG?.serverUrl) {
      let modified = false;
      profiles = profiles.map((p) => {
        if (!p.serverUrl) {
          modified = true;
          return { ...p, serverUrl: DEV_CONFIG.serverUrl, password: p.password || DEV_CONFIG.password || '' };
        }
        return p;
      });
      if (modified) saveProfiles(profiles);
    }

    const activeId = getActiveProfileId();
    if (!activeId || !profiles.some((p) => p.id === activeId)) {
      setActiveProfileId(profiles[0].id);
    } else {
      const active = profiles.find((p) => p.id === activeId);
      setActiveProfileSignal(active || profiles[0]);
    }
    setProfilesSignal(profiles);
    return profiles;
  }

  // Auto-migration or default profile from devConfig
  let initialConfig: { serverUrl?: string; username?: string; password?: string } | null = null;
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY) || localStorage.getItem(OLD_LEGACY_STORAGE_KEY);
    if (saved) {
      initialConfig = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading legacy config', e);
  }

  if ((!initialConfig || !initialConfig.username) && DEV_CONFIG && DEV_CONFIG.serverUrl && DEV_CONFIG.username) {
    initialConfig = DEV_CONFIG;
  }

  if (initialConfig && initialConfig.username) {
    const defaultProfile: UserProfile = {
      id: 'default_admin',
      name: initialConfig.username.charAt(0).toUpperCase() + initialConfig.username.slice(1),
      username: initialConfig.username,
      password: initialConfig.password || '',
      gradientPreset: 'crimson',
      serverUrl: initialConfig.serverUrl,
      createdAt: Date.now(),
    };

    profiles = [defaultProfile];
    saveProfiles(profiles);
    setActiveProfileId(defaultProfile.id);
    return profiles;
  }

  return [];
}
