import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { MobileShell } from './components/mobile/MobileShell';
import { TVShell } from './components/tv/TVShell';

export const App: Component = () => {
  const detectMobile = () => {
    if (typeof window === 'undefined') return false;
    // Check for TV user agent explicitly
    const isTVUserAgent = /Web0S|webOS.TV|LG Browser|SmartTV/i.test(navigator.userAgent);
    if (isTVUserAgent) return false;

    // Mobile / phone check
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 850;
    return isMobileUA || isSmallScreen;
  };

  const [isMobile, setIsMobile] = createSignal<boolean>(detectMobile());

  onMount(() => {
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener('resize', handleResize);

    // Ensure splash is dismissed if running mobile shell
    if (isMobile()) {
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
