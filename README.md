# 🎵 NaviOS

An Apple TV-inspired music client built for [Navidrome](https://www.navidrome.org/) (Subsonic API), designed to bring an elegant, responsive listening experience to both the living room and mobile devices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![webOS](https://img.shields.io/badge/platform-LG%20webOS%20(.ipk)-red.svg)
![Android](https://img.shields.io/badge/platform-Android%20(.apk)-3DDC84.svg?logo=android&logoColor=white)
![SolidJS](https://img.shields.io/badge/framework-SolidJS-4d87cd.svg)
![TailwindCSS](https://img.shields.io/badge/styling-Tailwind%20v4-38bdf8.svg)

> [!NOTE]
> **Online-Only Client**: NaviOS streams directly from your personal Navidrome / Subsonic server. There is **no offline playback or local caching of music files** available. Both the webOS and Android builds require an active network connection to your server.

---

## 📌 About the Project

NaviOS is a personal, open-source hobby project created to solve a simple itch: enjoying a self-hosted Navidrome music library on an LG Smart TV with a clean remote-friendly interface, while also having an equally fluid client on Android phones, tablets, and foldable devices. 

It is free software under the MIT license, built purely for utility and the self-hosting community—no ads, no analytics, no commercial intentions.

---

## ✨ Features

### 🖥️ Dual-Interface Architecture (Adaptive Shell)
A single SolidJS codebase that automatically detects device context at launch:
- **TV Shell (`TVShell`)**: Tailored for TV remotes and 1080p/4K screens. Powered by a custom spatial D-pad focus engine, instant navigation without sluggish transition jank, and an Apple TV-inspired dark aesthetic.
- **Mobile Shell (`MobileShell`)**: Optimized for touchscreens, featuring an iOS/Apple Music-inspired mini-player, slide-over queue drawers, context action sheets, and pull-down dismissals.
- **Foldable & Tablet Aware**: Native tabletop posture detection (`androidx.window` on Android). When bent half-opened on a desk, controls smoothly adapt into a dedicated tabletop control deck.

### 🎶 Playback & Queue Management
- **Hierarchical 3-Tier Queue**:
  1. *User Queue Next* (songs inserted explicitly to play next)
  2. *Context Queue* (the active album or playlist playing passively)
  3. *User Queue Last* (tracks appended to play after the current context ends)
- **Played History & Rewind**: Dedicated history tracking allowing you to step back through recently played tracks without losing your active playlist position.
- **Scrubbing & Precise Seeking**: Smooth timeline seeking with time preview badges and quick skip intervals.
- **Playback Modes**: Full shuffle and repeat modes (`Off`, `All`, `One`).
- **Media Session Integration**: Background playback with lock screen and notification controls on Android via Capacitor Media Session, plus standard browser media session support on webOS.

### 👥 Multi-User Profiles
- Store multiple accounts/credentials on the same device.
- Instant switching between profiles with custom gradient avatars.
- Optional boot profile selector for shared living-room TVs.
- Independent favorites, pinned playlists, and listening contexts per profile.

### 🔍 Discovery & Browsing
- **Daily Top Picks**: Rotates dynamic genre mixes, "Album of the Day", and time-of-context playlists (Morning, Afternoon, Evening, Late Night) every 24 hours.
- **Dynamic Mixes**: Instantly generate dynamic multi-album genre mixes directly from the home screen.
- **On-Screen Search**: Quick search across artists, albums, and tracks, complete with a remote-friendly on-screen keyboard for TV remotes.
- **Playlist Management**: Browse server playlists, pin favorites to the top, and edit tracklists directly.

---

## ⚡ Smart Playlists (`.nsp`)

Navidrome supports **Smart Playlists**—lightweight JSON files saved with an `.nsp` extension in your music folder that dynamically generate track selections based on rules (e.g., play count, rating, release year, or genre).

NaviOS integrates directly with smart playlists to surface dynamic recommendations on the home screen.

### Example Rules

To create a smart playlist, create a `.nsp` file inside your Navidrome music library (for example, `/music/Playlists/ForgottenGems.nsp`):

**Forgotten Gems** (tracks rated 4+ stars not played in the last 90 days):
```json
{
  "name": "Forgotten Gems",
  "comment": "Top rated tracks not played in 90 days",
  "all": [
    { "gt": { "rating": 3 } },
    { "notInTheLast": { "lastPlayed": 90 } }
  ],
  "sort": "lastPlayed",
  "order": "asc",
  "limit": 35
}
```

**Top Rated Favorites** (4 and 5-star tracks):
```json
{
  "name": "Top Rated Favorites",
  "comment": "High-rated library favorites",
  "all": [
    { "gt": { "rating": 3 } }
  ],
  "sort": "rating",
  "order": "desc",
  "limit": 50
}
```

### Loading into Navidrome
1. Save your `.nsp` files in your library's playlist directory.
2. Trigger a scan in Navidrome (**Settings** $\rightarrow$ **Activity / Library** $\rightarrow$ **Quick Scan**).
3. The playlists will appear in NaviOS and automatically populate your daily rotation.

> [!TIP]
> If you'd like to build more elaborate smart playlists without writing JSON by hand, check out the community [Navidrome Smart Playlist Generator](https://github.com/WB2024/Navidrome-SmartPlaylist-Generator-nsp).

---

## 🎮 Navigation & Controls

| Input | TV Mode (Remote / Keyboard) | Mobile / Touch Mode |
| :--- | :--- | :--- |
| **D-Pad / Arrows** | Directional spatial navigation across cards & lists | Standard touch scroll & tap |
| **Enter / OK** | Select item / Play track (2nd click opens Now Playing) | Tap to play / Tap row |
| **Back / Esc** | Step back in view history / Dismiss full-screen player | Swipe down / Back button |
| **Play / Pause** | TV Remote Play/Pause media key | Mini-player / Player button |
| **Next / Previous** | Media track skip keys | Next / Prev buttons or lock screen |

---

## 🛠️ Building & Packaging

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm

---

### 1. LG webOS TV (`.ipk`)

The webOS package is created using a self-contained Node.js packaging script with zero required external dependencies (it will use the official `ares-package` CLI if installed, but automatically falls back to an internal archive builder if not).

```bash
# Install dependencies
npm install

# Build production assets and create the .ipk package
npm run package
```

The compiled package will be generated at:
```text
dist-webos/org.navios.tv_<version>_all.ipk
```

#### Installing on LG webOS TV:
- **Via GUI**: Use [webOS Dev Manager](https://github.com/webos-tools/cli-webOS-dev-manager) to connect to your TV and install the `.ipk`.
- **Via webOS CLI**:
  ```bash
  ares-install dist-webos/org.navios.tv_1.9.109_all.ipk -d <your-tv-name>
  ```

---

### 2. Android (`.apk`)

Android support is powered by [Capacitor](https://capacitorjs.com/). The project is pre-configured with network security policies to support both HTTP and HTTPS local/remote Navidrome instances.

#### Prerequisites for Android Build:
- **Java JDK**: OpenJDK 21
- **Android SDK**: API level 35 (Android 15) build tools

#### Build Steps:
```bash
# 1. Build web bundle
npm run build

# 2. Sync web assets into Android project
npx cap sync android

# 3. Compile the debug APK
cd android
./gradlew assembleDebug
```

The generated APK will be located at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Installing on Android Device:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Or open the `android` folder directly in Android Studio (`npx cap open android`) to build and run.

---

## 💻 Local Web Development

To test and run the UI in your desktop browser:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. By default, desktop browsers with fine pointer input will display the TV shell, while mobile viewport simulation or touch devices will automatically switch to the mobile shell.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
