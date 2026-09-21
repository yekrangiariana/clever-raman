import { createSignal } from 'solid-js';
import { api } from './api';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const [isServerReachable, setIsServerReachable] = createSignal<boolean>(true);
const [isCheckingServer, setIsCheckingServer] = createSignal<boolean>(false);

export { isServerReachable, isCheckingServer };

function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export async function checkServerReachability(): Promise<boolean> {
  if (isCheckingServer()) return isServerReachable();
  setIsCheckingServer(true);

  try {
    const config = api.getConfig();
    if (!config || !config.serverUrl) {
      setIsServerReachable(false);
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const cleanUrl = config.serverUrl.replace(/\/+$/, '');
    const hexPass = stringToHex(config.password);
    const auth = `u=${encodeURIComponent(config.username)}&p=enc:${hexPass}&v=1.16.1&c=NaviOS&f=json`;
    const url = `${cleanUrl}/rest/ping.view?${auth}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const status = data['subsonic-response']?.status;
      const reachable = status === 'ok';
      setIsServerReachable(reachable);
      return reachable;
    } else {
      setIsServerReachable(false);
      return false;
    }
  } catch (err) {
    setIsServerReachable(false);
    return false;
  } finally {
    setIsCheckingServer(false);
  }
}

export function updateServerReachability(reachable: boolean) {
  setIsServerReachable(reachable);
}

let monitorStarted = false;

export function startServerReachabilityMonitor() {
  if (monitorStarted) return;
  monitorStarted = true;

  // Initial ping check
  checkServerReachability();

  // Check every 15 seconds
  setInterval(() => {
    checkServerReachability();
  }, 15000);

  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkServerReachability();
      }
    });
  }

  window.addEventListener('online', () => {
    checkServerReachability();
  });
  window.addEventListener('offline', () => {
    setIsServerReachable(false);
  });
}
