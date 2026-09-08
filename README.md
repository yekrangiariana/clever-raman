# 🎵 NaviOS for webOS

An elegant, fast, Apple TV-inspired webOS app designed specifically for smart TVs connected to a [Navidrome](https://www.navidrome.org/) music server.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![webOS](https://img.shields.io/badge/platform-LG%20webOS-red.svg)
![SolidJS](https://img.shields.io/badge/framework-SolidJS-4d87cd.svg)

---

## ✨ Features

- **Apple TV Aesthetics**: Clean, modern dark mode UI designed for 1080p and 4K TV displays.
- **D-Pad Native Focus Engine**: Flawless navigation using your standard TV remote control (directional buttons, Back, Select).
- **Daily Dynamic Top Picks**: Home screen features dynamic genre mixes and smart playlists that automatically rotate every 24 hours.
- **Smart Playlist (.nsp) Integration**: Full native support for Navidrome Smart Playlists.
- **Blazingly Fast Performance**: Off-thread image decoding (`decoding="async"`), client-side caching, and zero main-thread jank.
- **Inline Settings**: Easily manage server URL and credentials without clunky modals.

---

## ⚡ Smart Playlists & Daily Top Picks

NaviOS takes full advantage of Navidrome's **Smart Playlist (`.nsp`)** feature to automatically surface relevant music in your **Top Picks** section every single day.

### What are Smart Playlists?
Smart Playlists are dynamic, rule-based JSON files stored on your Navidrome server as `.nsp` files. Rather than containing static song lists, they dynamically query your library based on criteria like:
- **Forgotten Gems**: High-rated songs you haven't played in over 90 days.
- **Top Rated Favorites**: 4 and 5-star tracks across all genres.
- **Decade Hits**: 60s, 70s, 80s, 90s, 2000s, 2010s, and Modern Essentials.
- **Unplayed Graveyard**: Tracks sitting in your library that you haven't played yet.

---

### 🛠️ Setting Up Smart Playlists (2 Quick Methods)

Choose either method below to deploy smart playlists to your Navidrome server:

#### Method 1: Instant Script (Deploys 20 Essential Smart Playlists in 5 Seconds)
SSH into your server and run this single command (replace `/path/to/music` with your Navidrome music folder, e.g., `/home/user/Music`):

```bash
mkdir -p /path/to/music/Playlists

cat << 'EOF' > /path/to/music/Playlists/ForgottenGems.nsp
{"name":"Forgotten Gems","comment":"Top rated tracks not played in 90 days","all":[{"gt":{"rating":3}},{"notInTheLast":{"lastPlayed":90}}],"sort":"lastPlayed","order":"asc","limit":35}
EOF

cat << 'EOF' > /path/to/music/Playlists/TopRatedFavorites.nsp
{"name":"Top Rated Favorites","comment":"4 & 5-star rated tracks","all":[{"gt":{"rating":3}}],"sort":"rating","order":"desc","limit":50}
EOF

cat << 'EOF' > /path/to/music/Playlists/RecentlyAdded.nsp
{"name":"Recently Added","comment":"Songs added in the last 30 days","all":[{"inTheLast":{"dateAdded":30}}],"sort":"dateAdded","order":"desc","limit":50}
EOF

cat << 'EOF' > /path/to/music/Playlists/UnplayedGraveyard.nsp
{"name":"Unplayed Graveyard","comment":"Tracks sitting in your library you haven't played yet","all":[{"is":{"playCount":0}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/MostPlayedHits.nsp
{"name":"Most Played Hits","comment":"Your most frequently played tracks","all":[{"gt":{"playCount":2}}],"sort":"playCount","order":"desc","limit":50}
EOF

cat << 'EOF' > /path/to/music/Playlists/StarredFavorites.nsp
{"name":"Starred Favorites","comment":"Tracks you have starred/liked","all":[{"is":{"starred":true}}],"sort":"title","order":"asc","limit":50}
EOF

cat << 'EOF' > /path/to/music/Playlists/60sClassics.nsp
{"name":"60s Classics","comment":"Tracks released between 1960 and 1969","all":[{"inTheRange":{"year":[1960,1969]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/70sHits.nsp
{"name":"70s Hits","comment":"Classic tracks from the 1970s","all":[{"inTheRange":{"year":[1970,1979]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/80sPopSynth.nsp
{"name":"80s Synth & Pop","comment":"Favorite tracks from the 1980s","all":[{"inTheRange":{"year":[1980,1989]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/90sHits.nsp
{"name":"90s Hits","comment":"Classic alternative & pop from the 1990s","all":[{"inTheRange":{"year":[1990,1999]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/2000sEssentials.nsp
{"name":"2000s Essentials","comment":"Best tracks from the 2000s","all":[{"inTheRange":{"year":[2000,2009]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/2010sHits.nsp
{"name":"2010s Hits","comment":"Hits from 2010 to 2019","all":[{"inTheRange":{"year":[2010,2019]}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/ModernReleases.nsp
{"name":"Modern Releases","comment":"Recent music released from 2020 onwards","all":[{"gt":{"year":2019}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/ShortAndSweet.nsp
{"name":"Short & Sweet","comment":"Quick tracks under 3 minutes long","all":[{"lt":{"duration":181}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/ExtendedEpics.nsp
{"name":"Extended Epics","comment":"Long tracks over 6 minutes","all":[{"gt":{"duration":359}}],"sort":"duration","order":"desc","limit":30}
EOF

cat << 'EOF' > /path/to/music/Playlists/AcousticAndChill.nsp
{"name":"Acoustic & Chill","comment":"Mellow and acoustic tracks","any":[{"contains":{"genre":"Acoustic"}},{"contains":{"genre":"Folk"}},{"contains":{"genre":"Chill"}},{"contains":{"genre":"Ambient"}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/RockAndEnergy.nsp
{"name":"Rock & High Energy","comment":"Rock, Metal, and high energy beats","any":[{"contains":{"genre":"Rock"}},{"contains":{"genre":"Metal"}},{"contains":{"genre":"Punk"}},{"contains":{"genre":"Alternative"}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/JazzAndBlues.nsp
{"name":"Jazz & Blues Lounge","comment":"Smooth jazz and classic blues","any":[{"contains":{"genre":"Jazz"}},{"contains":{"genre":"Blues"}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/HipHopAndRnB.nsp
{"name":"Hip-Hop & R&B","comment":"Hip-Hop, Rap, and Soul tracks","any":[{"contains":{"genre":"Hip-Hop"}},{"contains":{"genre":"Rap"}},{"contains":{"genre":"R&B"}},{"contains":{"genre":"Soul"}}],"sort":"random","limit":40}
EOF

cat << 'EOF' > /path/to/music/Playlists/DailyRandomDiscovery.nsp
{"name":"Daily Random Discovery","comment":"A random mix of 40 tracks from your library","all":[{"gt":{"year":0}}],"sort":"random","limit":40}
EOF

echo "Done! Created 20 Smart Playlists in /path/to/music/Playlists"
```

#### Method 2: Interactive CLI Generator (Custom Playlists)
Alternatively, use the interactive generator by **WB2024**:
```bash
git clone https://github.com/WB2024/Navidrome-SmartPlaylist-Generator-nsp.git
cd Navidrome-SmartPlaylist-Generator-nsp
pip3 install rich
python3 navidrome_smart_playlist_creator.py
```

---

### 🔍 Verifying & Scanning

1. **Verify Files on Server**:
   ```bash
   ls -1 /path/to/music/Playlists/*.nsp | wc -l
   # Should output: 20
   ```

2. **Trigger Navidrome Scan**:
   - Open Navidrome Web UI (`http://your-server-ip:4533`).
   - Go to **Settings** -> **Activity / Library** -> **Quick Scan**.

3. **Enjoy on TV**:
   Open **NaviOS** on your LG TV! Your smart playlists will automatically cycle and surface in the **Top Picks** section every day at midnight.

---

## 🚀 Building & Installing on LG webOS TV

### Prerequisites
- Node.js (v18+)
- [webOS TV CLI (`ares-*`)](https://webostv.developer.lge.com/) or [webOS Dev Manager](https://github.com/webos-tools/cli-webOS-dev-manager)

### Development
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

### Build & Package IPK
```bash
# Build Vite production assets & package .ipk
npm run build
node scripts/pack-ipk.js
```

The compiled package will be generated at:
`dist-webos/org.navios.tv_X.X.X_all.ipk`

### Installation to TV
Install the `.ipk` file to your LG TV using **webOS Dev Manager** or via the official webOS CLI:
```bash
ares-install dist-webos/org.navios.tv_1.7.4_all.ipk -d <your-tv-name>
```

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
