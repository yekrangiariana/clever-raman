# NaviOS TV — Design Guide & AI Architectural Rulebook

This document serves as the authoritative design system and architectural guideline for **NaviOS** (LG webOS TV Navidrome Client). Any developer or AI assistant modifying this codebase **MUST** follow these rules strictly.

---

## 1. Universal Border Radius & Focus Ring Rule (CRITICAL)

> [!CAUTION]
> **No Square Hover/Focus Outlines & No Horizontal Container Clipping!**
> 1. Every element with `data-focusable="true"` MUST have its `rounded-*` border-radius utility class applied **directly** on the focus container itself (`rounded-full`, `rounded-3xl`, `rounded-2xl`).
> 2. ALL album artwork images across Home, Albums grid, Search, and Now Playing MUST use uniform rounded corners (`rounded-3xl` / `rounded-2xl`). NEVER render 0px sharp square artwork.
> 3. List items (`data-variant="list"`, e.g. track rows) MUST use `transform: none` on focus to prevent left/right overflow clipping against parent scroll containers. List focus highlights via solid white background pill (`bg-white text-black font-extrabold`).

### Core CSS Enforcement (`src/index.css`):
```css
[data-focusable="true"] {
  outline: none;
  will-change: transform;
  border-radius: 1.5rem;
}

[data-focusable="true"].focused {
  outline: none !important;
  transform: scale3d(1.06, 1.06, 1) !important;
  z-index: 30;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 3.5px rgba(255, 255, 255, 0.85) !important;
}

/* Prevent list row horizontal clipping */
[data-focusable="true"][data-variant="list"].focused {
  transform: none !important;
  background-color: #ffffff !important;
  color: #000000 !important;
}
```

---

## 2. Card Design Standard (No Grey Boxes)

> [!IMPORTANT]
> **No Artificial Grey Container Boxes Around Standard Album Cards!**
> Standard album cards in grids or horizontal rows MUST consist ONLY of the high-res artwork (`rounded-2xl shadow-xl`) with typography rendered cleanly underneath outside the artwork container.

- **Standard Album Card**: Square artwork (`aspect-square rounded-2xl`), title (`text-2xl font-bold text-white mt-3`), artist (`text-xl font-medium text-neutral-400 mt-0.5`).
- **Hero Mix Card**: Tall card (`aspect-[3/4] rounded-2xl overflow-hidden`) featuring a 2x2 album cover collage grid with dynamic gradient overlay and title block. Clicking a Mix card plays a dynamic genre playlist directly!

---

## 3. Album Detail Stage (`media_1788699294128.jpg`)

- **Top-Left**: `< Back` navigation button.
- **Left Stage**: 520x520px Album Artwork with rounded corners (`rounded-3xl shadow-2xl`).
- **Right Stage**:
  - Title (`text-5xl font-black text-white`)
  - Artist (`text-3xl font-bold text-neutral-300`)
  - Subtitle ("Genre • Year • Track Count")
  - Action Row: `▶ Play` (white pill button `rounded-full`), `🔀 Shuffle` (dark pill button `rounded-full`), `+` (star button `rounded-full`), `•••` (more button `rounded-full`).
  - Embedded Tracklist: Displayed directly on the right half by default showing track numbers, song titles, durations, and current playing indicator dot `•`.
  - **Smart Track Click**: 1st click on track plays song in background; 2nd click on currently playing track opens full-screen `NowPlayingView` player.

---

## 4. Mandatory Component Hierarchy (`src/components/common/`)

To prevent code duplication and inconsistent design:

1. **`AlbumCard.tsx`**: Reusable component for all album items.
2. **`SongRow.tsx`**: Reusable track row component for album tracklists, search results, and queue lists.
3. **`MixCard.tsx`**: Reusable dynamic genre/tag mix card for Home Top Picks.
4. **`SectionHeader.tsx`**: Reusable category tag + title section header.

---

## 5. Performance Guidelines

- **Zero Animations**: Disable CSS keyframe animations and transitions (`transition: none !important; animation: none !important;`) to guarantee instant 60 FPS D-pad navigation on LG webOS TV hardware.
- **Virtual Keyboard**: Focus engine must NOT call `.focus()` on `<input>` fields during D-pad navigation to prevent webOS OSK popups until explicit ENTER key press.
