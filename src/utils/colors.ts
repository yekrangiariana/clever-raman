export const TOP_PICK_GRADIENTS = [
  'linear-gradient(145deg, #5c0d24 0%, #2b0938 55%, #0a0a0a 100%)', // Deep Crimson Wine
  'linear-gradient(145deg, #163269 0%, #0d1b3e 55%, #080a12 100%)', // Midnight Sapphire
  'linear-gradient(145deg, #0b4534 0%, #06281e 55%, #050d0a 100%)', // Deep Emerald Pine
  'linear-gradient(145deg, #6b3310 0%, #3d1508 55%, #0a0806 100%)', // Dark Amber Bronze
  'linear-gradient(145deg, #4c1d70 0%, #220e3d 55%, #09060e 100%)', // Royal Violet Plum
  'linear-gradient(145deg, #5e1358 0%, #2d0b33 55%, #0a050c 100%)', // Velvet Orchid
  'linear-gradient(145deg, #252869 0%, #141740 55%, #070712 100%)', // Midnight Indigo
  'linear-gradient(145deg, #0d4a4c 0%, #062629 55%, #040d0e 100%)', // Oceanic Teal
  'linear-gradient(145deg, #632617 0%, #301016 55%, #0a0606 100%)', // Dark Terracotta Rust
  'linear-gradient(145deg, #3d1c6e 0%, #1e0d3d 55%, #07050d 100%)', // Deep Twilight Amethyst
  'linear-gradient(145deg, #522e19 0%, #26140d 55%, #080605 100%)', // Dark Espresso
  'linear-gradient(145deg, #69152f 0%, #33081e 55%, #090407 100%)', // Deep Mulberry Garnet
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

