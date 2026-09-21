import { createSignal, createEffect } from 'solid-js';

// Global memory cache of image URLs that have already finished loading in the browser
const globalLoadedImages = new Set<string>();

export function FadeImage(props: {
  src: string;
  alt?: string;
  class?: string;
  id?: string;
  onError?: (e: any) => void;
  loading?: 'lazy' | 'eager';
}) {
  const isAlreadyLoaded = () => Boolean(props.src && globalLoadedImages.has(props.src));

  const [currentSrc, setCurrentSrc] = createSignal(props.src);
  const [loaded, setLoaded] = createSignal(isAlreadyLoaded());
  const [error, setError] = createSignal(false);

  let imgRef: HTMLImageElement | undefined;

  createEffect(() => {
    const nextSrc = props.src;
    if (!nextSrc) return;

    // If this URL is already cached in memory, switch immediately with zero flash
    if (globalLoadedImages.has(nextSrc)) {
      setCurrentSrc(nextSrc);
      setLoaded(true);
      setError(false);
      return;
    }

    // If updating src to a new, non-cached image, preload it offscreen first
    // so the current image stays visible (no opacity-0 flash) while loading!
    const tempImg = new Image();
    tempImg.src = nextSrc;
    tempImg.onload = () => {
      globalLoadedImages.add(nextSrc);
      setCurrentSrc(nextSrc);
      setLoaded(true);
      setError(false);
    };
    tempImg.onerror = (e) => {
      setError(true);
      if (props.onError) props.onError(e);
    };
  });

  return (
    <div class={`relative overflow-hidden bg-[#18181a] ${props.class || ''}`}>
      <img
        ref={(el) => {
          imgRef = el;
          if (el && el.complete && el.naturalWidth > 0 && props.src) {
            globalLoadedImages.add(props.src);
            setLoaded(true);
          }
        }}
        id={props.id}
        src={currentSrc()}
        alt={props.alt || ''}
        class={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ease-in-out ${
          loaded() && !error() ? 'opacity-100' : 'opacity-0'
        }`}
        loading={props.loading}
        onLoad={() => {
          if (currentSrc()) globalLoadedImages.add(currentSrc());
          setLoaded(true);
        }}
        onError={(e) => {
          setError(true);
          if (props.onError) props.onError(e);
        }}
      />
    </div>
  );
}
