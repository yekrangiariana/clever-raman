export const TOP_PICK_GRADIENTS = [
  // 0. Electric Coral & Magenta Wine
  'linear-gradient(135deg, #f43f5e 0%, #be123c 40%, #881337 75%, #4c0519 100%)',
  // 1. Cobalt Sapphire & Deep Royal
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 40%, #1e3a8a 75%, #0f172a 100%)',
  // 2. Emerald Jade & Deep Pine
  'linear-gradient(135deg, #10b981 0%, #059669 40%, #064e3b 75%, #022c22 100%)',
  // 3. Sunset Tangerine & Cinnamon Ember
  'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #9a3412 75%, #431407 100%)',
  // 4. Royal Violet & Velvet Plum
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 40%, #4c1d95 75%, #2e1065 100%)',
  // 5. Velvet Fuchsia & Midnight Orchid
  'linear-gradient(135deg, #ec4899 0%, #be185d 40%, #831843 75%, #500724 100%)',
  // 6. Neon Indigo & Deep Twilight
  'linear-gradient(135deg, #6366f1 0%, #4338ca 40%, #312e81 75%, #1e1b4b 100%)',
  // 7. Oceanic Cyan & Deep Sea Marine
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 40%, #155e75 75%, #083344 100%)',
  // 8. Crimson Ruby & Deep Cabernet
  'linear-gradient(135deg, #e11d48 0%, #9f1239 45%, #700c27 75%, #3d0515 100%)',
  // 9. Purple Iris & Deep Blackberry
  'linear-gradient(135deg, #a855f7 0%, #7e22ce 40%, #581c87 75%, #3b0764 100%)',
  // 10. Tuscan Gold & Roasted Chestnut
  'linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #92400e 75%, #451a03 100%)',
  // 11. Electric Teal & Arctic Midnight
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 40%, #115e59 75%, #042f2e 100%)',
];

// Retain alias for backwards compatibility
export const APPLE_PASTEL_GRADIENTS = TOP_PICK_GRADIENTS;

export function getCardGradient(name: string, colorIndex?: number): string {
  if (colorIndex !== undefined && colorIndex >= 0) {
    return TOP_PICK_GRADIENTS[colorIndex % TOP_PICK_GRADIENTS.length];
  }
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return TOP_PICK_GRADIENTS[Math.abs(hash) % TOP_PICK_GRADIENTS.length];
}

