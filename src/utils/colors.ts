export const APPLE_PASTEL_GRADIENTS = [
  'from-pink-400 via-rose-500 to-purple-800',       // Pastel Rose & Magenta
  'from-sky-300 via-blue-500 to-indigo-800',        // Apple Powder Blue
  'from-teal-300 via-emerald-500 to-slate-900',     // Sage Mint
  'from-amber-300 via-orange-400 to-rose-700',      // Soft Peach Sunset
  'from-purple-300 via-violet-500 to-indigo-950',    // Lavender Violet
  'from-fuchsia-300 via-pink-500 to-rose-900',      // Neon Orchid
  'from-indigo-300 via-purple-500 to-slate-900',     // Soft Periwinkle
  'from-emerald-300 via-teal-500 to-cyan-950',      // Ice Mint
  'from-orange-300 via-rose-400 to-purple-900',     // Soft Tangerine Coral
  'from-violet-300 via-fuchsia-500 to-purple-950',   // Lilac Glow
  'from-amber-200 via-yellow-500 to-stone-900',     // Champagne Gold
  'from-rose-300 via-orange-500 to-slate-900',      // Apple Coral Dusk
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
