# NaviOS

NaviOS is an Apple TV-inspired music player built for [Navidrome](https://www.navidrome.org/) and compatible Subsonic music servers. It provides an interface tailored for television displays and remote controls on LG webOS, as well as Android mobile and tablet devices.

The application targets two platforms: LG webOS smart TVs via an installable `.ipk` package, and Android devices via an `.apk`. NaviOS is strictly an online streaming client. Music is streamed directly from your server over the network; there is no offline caching or local file download functionality. An active network connection to your Navidrome server is required.

> [!NOTE]
> NaviOS is under active development. Architecture, interface design, and functionality are continuously evolving and may change between releases.

---

## How It Works

NaviOS is built on a web application stack rather than native Android (Kotlin) or webOS (C/QML) toolchains. The user interface is written in **SolidJS**, bundled with **Vite**, and styled with **Tailwind CSS**. 

The same codebase targets both environments through adaptive architecture:
- **LG webOS TV**: Runs directly inside the TV's native Chromium runtime (targeting Chrome 79+ compatibility). NaviOS uses a custom spatial navigation engine in JavaScript that maps standard remote D-pad directional keys, enter, and back button events without requiring a pointer or mouse cursor.
- **Android**: Wrapped using **Capacitor 8**. A native Java shell (`MainActivity.java`) embeds the web application inside Android WebView with full hardware acceleration, background audio services (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`), and cleartext HTTP/HTTPS networking. It includes a custom Java plugin leveraging Android's `androidx.window` library to detect foldable hinge angles and adapt the layout into a tabletop deck when propped open.

NaviOS communicates with Navidrome exclusively through the **Subsonic REST API** (`/rest/*.view`). Audio tracks stream directly through the browser audio subsystem, while album covers and library metadata are cached in client memory and IndexedDB to minimize network roundtrips.

### Key Features

- **Adaptive Shell**: Automatically detects device characteristics to serve a couch-friendly TV layout with high-contrast focus rings for remotes, or a touch-oriented mobile layout with gesture sheets and mini-player controls.
- **Three-Tier Queue**: Supports priority queueing with "Play Next" (inserted ahead of the current playlist), a background "Context Queue" (the playing album or playlist), and "Play Last" (appended to play after the active context finishes).
- **Session History & Rewind**: Tracks played songs during a session, allowing you to skip backwards through tracks without desynchronizing the active album.
- **Media Session Controls**: Integrates with system notification drawers and lock screens on Android and smart TV media keys.
- **Multi-User Profiles**: Switch between different server credentials and user accounts on the same device, each with their own avatar colors, favorites, and pinned playlists.
- **Daily Top Picks**: Rotates curated recommendations every 24 hours, including an Album of the Day, time-of-day listening sets (morning, afternoon, evening, late night), and random genre mixes.
- **On-Screen Search**: Real-time filtering across artists, albums, and tracks with a virtual on-screen keyboard optimized for TV remotes.

---

## Smart Playlists (.nsp)

Navidrome supports dynamic, rule-based playlists stored as `.nsp` JSON files on your server. Rather than maintaining static song lists, smart playlists automatically query your library based on criteria such as track ratings, play counts, or release dates. NaviOS uses these playlists to dynamically populate its daily recommendation categories.

To add a smart playlist, place a `.nsp` file inside your Navidrome playlists directory.

### Examples

**Forgotten Gems** (tracks with a rating above 3 stars that have not been played in 90 days):
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

**Top Rated Favorites** (songs rated 4 or 5 stars):
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

### Loading Playlists
1. Save your `.nsp` files in the server playlist directory.
2. In the Navidrome web interface, navigate to **Settings** > **Activity / Library** and trigger a **Quick Scan**.
3. The playlists will appear in NaviOS and automatically rotate into the daily home screen picks.

For generating custom rule sets without writing raw JSON, see the community-created [Navidrome Smart Playlist Generator](https://github.com/WB2024/Navidrome-SmartPlaylist-Generator-nsp).

---

## Building and Installation

### Prerequisites
- Node.js 18 or newer
- npm
- OpenJDK 21 and Android SDK (API 35) for Android builds

---

### LG webOS TV (.ipk)

The packaging script compiles the frontend and generates an installable `.ipk` package. It uses `ares-package` if available on your path, and otherwise falls back to an internal Node-based Debian/ar archive packager:

```bash
npm install
npm run package
```

The output package will be created at:
```text
dist-webos/org.navios.tv_<version>_all.ipk
```

You can install it using [webOS Dev Manager](https://github.com/webos-tools/cli-webOS-dev-manager) or the command line:
```bash
ares-install dist-webos/org.navios.tv_<version>_all.ipk -d <tv-device-name>
```

---

### Android (.apk)

Compile the web application, sync assets to the Capacitor Android project, and build the APK using Gradle:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

The compiled package will be located at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a connected device via ADB:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Local Browser Development

To run the development server with live reloading:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. By default, desktop browsers render the TV layout. Switching to responsive device view or touch emulation will automatically display the mobile interface.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
