import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { MobileShell } from './components/mobile/MobileShell';
import { TVShell } from './components/tv/TVShell';
import { Capacitor } from '@capacitor/core';
import { ServerStatusBanner } from './components/common/ServerStatusBanner';

export const App: Component = () => {
  const detectMobile = () => {
    if (typeof window === 'undefined') return false;
    
    // Always treat native mobile app (Capacitor Android / iOS) as mobile
    if (Capacitor.isNativePlatform()) return true;

    const isTVUserAgent = /Web0S|webOS.TV|LG Browser|SmartTV/i.test(navigator.userAgent);
    if (isTVUserAgent) return false;

    // Detect if device supports touch (TVs usually don't)
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Mobile / phone check
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 850;
    
    return isMobileUA || isSmallScreen || isTouchDevice;
  };

  const [isMobile, setIsMobile] = createSignal<boolean>(detectMobile());

  onMount(() => {
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener('resize', handleResize);

    // Unconditionally dismiss splash overlay on mount so screen is never locked
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 400);
    }

    if (isMobile() && Capacitor.isNativePlatform()) {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      });

      // Pre-warm Chromium's audio pipeline by playing a silent 50ms WAV clip.
      // This forces WebMediaPlayerImpl to initialize AudioTrack and bring the
      // Android audio hardware out of sleep mode — so the first real track
      // starts instantly rather than waiting for hardware warm-up.
      const warmUpAudio = () => {
        try {
          // Minimal valid WAV: 44-byte header + empty data chunk (zero samples = silence)
          const silence = new Audio(
            'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
          );
          silence.volume = 0;
          silence.play().catch(() => {});
        } catch (e) {}
      };
      // Small delay so the user-gesture context from the initial tap is available
      setTimeout(warmUpAudio, 500);
    }

    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });


  return (
    <>
      <ServerStatusBanner />
      <Show when={isMobile()} fallback={<TVShell />}>
        <MobileShell />
      </Show>
    </>
  );
};

export default App;
