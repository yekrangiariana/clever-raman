export const APPLE_PASTEL_GRADIENTS = [
  'from-rose-800 via-purple-900 to-neutral-950',       // Deep Crimson & Purple
  'from-blue-800 via-indigo-900 to-neutral-950',        // Deep Sapphire & Navy
  'from-teal-800 via-emerald-900 to-neutral-950',       // Deep Forest Emerald
  'from-amber-800 via-rose-900 to-neutral-950',         // Dark Amber & Crimson
  'from-purple-800 via-violet-950 to-neutral-950',      // Deep Royal Violet
  'from-fuchsia-800 via-pink-900 to-neutral-950',       // Dark Plum Orchid
  'from-indigo-800 via-purple-900 to-neutral-950',      // Midnight Indigo
  'from-emerald-800 via-teal-900 to-neutral-950',       // Deep Oceanic Jade
  'from-orange-800 via-red-950 to-neutral-950',         // Dark Terracotta Dusk
  'from-violet-800 via-fuchsia-950 to-neutral-950',     // Dark Velvet Amethyst
  'from-amber-900 via-stone-900 to-neutral-950',        // Dark Bronze
  'from-red-800 via-rose-950 to-neutral-950',           // Deep Wine Garnet
];

export function getCardGradient(name: string, colorIndex?: number): string {
  if (colorIndex !== undefined && colorIndex >= 0) {
    return APPLE_PASTEL_GRADIENTS[colorIndex % APPLE_PASTEL_GRADIENTS.length];
  }
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return APPLE_PASTEL_GRADIENTS[Math.abs(hash) % APPLE_PASTEL_GRADIENTS.length];
}
