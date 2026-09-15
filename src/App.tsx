import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { MobileShell } from './components/mobile/MobileShell';
import { TVShell } from './components/tv/TVShell';
import { Capacitor } from '@capacitor/core';

export const App: Component = () => {
  const detectMobile = () => {
    if (typeof window === 'undefined') return false;
    
    const isTVUserAgent = /Web0S|webOS.TV|LG Browser|SmartTV/i.test(navigator.userAgent);
    if (isTVUserAgent) return false;

    // Detect if device supports touch (TVs usually don't)
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // Mobile / phone check
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 850;
    
    // An Android TV has 'Android' in UA but lacks a touch screen. 
    // We only want MobileShell if it's explicitly a touch device (Phone/Tablet).
    return (isMobileUA || isSmallScreen) && isTouchDevice;
  };

  const [isMobile, setIsMobile] = createSignal<boolean>(detectMobile());

  onMount(() => {
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener('resize', handleResize);

    // Ensure splash is dismissed and set status bar if running mobile shell
    if (isMobile()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        if (Capacitor.isNativePlatform()) {
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        }
      });
      const splash = document.getElementById('app-splash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 400);
      }
    }

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  return (
    <Show when={isMobile()} fallback={<TVShell />}>
      <MobileShell />
    </Show>
  );
};

export default App;
