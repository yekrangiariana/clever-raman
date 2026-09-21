# NaviOS

NaviOS is an Apple TV-inspired music client built specifically for personal Navidrome and Subsonic music servers. It gives self-hosters a clean, distraction-free way to listen to their music collection on smart TVs and Android devices.

The project currently targets two platforms: LG webOS smart TVs as an installable `.ipk` package, and Android phones, tablets, and foldable devices as an `.apk`. NaviOS is an online-only streaming player. It streams music directly from your home server over the network and does not offer offline downloads or local file storage. Both builds require an active connection to your Navidrome instance to function.

> [!NOTE]
> NaviOS is under active development. Features, user interface details, and setup procedures are continuously being refined and may change between releases.

---

## About the Project

NaviOS started as a personal weekend project to fix a simple frustration: listening to self-hosted music on a living room television using a regular remote control was clunky, while existing mobile players often felt bloated or overly commercial. This app is free, open source under the MIT license, and built strictly for personal utility and the self-hosting community. There are no advertisements, no tracking, and no monetization.

---

## How It Works

NaviOS adapts automatically depending on whether you are using a television or a mobile device. When running on an LG smart TV, it presents an interface designed for viewing from the couch, navigated entirely with the remote control's directional arrow buttons, select button, and back key. Navigation is tuned for instant response without heavy transition animations that can bog down TV processors.

When launched on an Android phone or tablet, the app presents a touch-oriented interface with an expandable mini-player, full-screen playback screen, and gesture-driven sheets. On foldable devices, NaviOS recognizes when the phone is propped open in tabletop mode and separates the album artwork onto the upright screen while placing playback controls flat on the lower surface.

Playback includes a layered queue system. You can queue songs to play immediately next, let an album or playlist run its course in the background, or append tracks to play once your current music finishes. The player also keeps track of your listening history during the session, allowing you to back up through previously heard songs without scrambling your active playlist. You can shuffle, toggle repeat modes, scrub through tracks with live time previews, and control playback directly from your device's lock screen or notification drawer.

For households sharing a single TV, NaviOS includes a profile manager. Multiple accounts can be saved on the same device, each with their own server login, custom avatar gradient, pinned playlists, and favorites. An optional launch screen lets you pick who is listening before entering the library.

Every day, the home screen automatically rotates through a selection of dynamic picks. It highlights an album of the day, curates a mix suited for the current time of day (morning, afternoon, evening, or late night), and surfaces rotating genre mixes drawn from your library.

---

## Smart Playlists

Navidrome includes built-in support for rule-based playlists stored as `.nsp` files on your server. Instead of a fixed list of songs, a smart playlist automatically updates based on criteria you define, such as song ratings, release years, or how recently a track was played. NaviOS reads these playlists and uses them to power the rotating daily picks on your home screen.

Setting up a smart playlist only requires dropping a small text file into your Navidrome playlists folder and running a quick library scan from the Navidrome web settings. For example, to create a playlist of four- and five-star songs you haven't heard in the last three months, you can save a file named `ForgottenGems.nsp` containing:

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

Once scanned by Navidrome, the playlist will show up inside NaviOS alongside your standard playlists and start cycling into your daily recommendations. You can create playlists for particular decades, forgotten favorites, or high-energy genres. If you prefer not to write the configuration rules manually, community tools like the [Navidrome Smart Playlist Generator](https://github.com/WB2024/Navidrome-SmartPlaylist-Generator-nsp) can generate them interactively.

---

## Building and Installation

NaviOS is built using Node.js (version 18 or newer), SolidJS, and Capacitor. 

### Building for LG webOS TV

To compile the webOS application, install project dependencies and run the package script:

```bash
npm install
npm run package
```

This compiles the production assets and generates an installable `.ipk` file inside the `dist-webos/` folder (named `dist-webos/org.navios.tv_<version>_all.ipk`). The packaging script uses the official webOS TV command line tools if they are detected on your system, but also includes an internal fallback builder so you do not need the full webOS SDK installed just to generate an IPK.

You can install the resulting `.ipk` onto your LG TV using the open-source [webOS Dev Manager](https://github.com/webos-tools/cli-webOS-dev-manager) application or with the official CLI command:

```bash
ares-install dist-webos/org.navios.tv_<version>_all.ipk -d <your-tv-name>
```

### Building for Android

Building the Android APK requires OpenJDK 21 and the Android SDK (API level 35).

First, build the web application and sync it into the Android project wrapper:

```bash
npm run build
npx cap sync android
```

Next, build the debug package using Gradle:

```bash
cd android
./gradlew assembleDebug
```

The completed APK will be created at `android/app/build/outputs/apk/debug/app-debug.apk`. You can install it directly onto a connected device using `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` or open the `android` directory in Android Studio using `npx cap open android`.

The Android application is configured with permissions to communicate over both encrypted HTTPS and plain HTTP connections, so you can connect to local network Navidrome instances without certificate issues.

### Local Development

If you want to run or inspect the application in a standard desktop web browser during development, run:

```bash
npm install
npm run dev
```

Then navigate to `http://localhost:3000`. By default, desktop browsers will display the TV remote interface, while resizing your browser to a mobile width or toggling touch emulation in developer tools will switch to the touch interface.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
