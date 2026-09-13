import { DEV_CONFIG } from '../config/devConfig';
import { initProfiles, getActiveProfile, setActiveProfileId, getProfiles, bumpSessionVersion } from './profiles';

export interface ServerConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  created?: string;
  year?: number;
  genre?: string;
  starred?: string;
}

export interface Song {
  id: string;
  parent?: string;
  title: string;
  album: string;
  artist: string;
  albumId?: string;
  artistId?: string;
  coverArt?: string;
  duration: number;
  track?: number;
  year?: number;
  genre?: string;
  contentType?: string;
  suffix?: string;
  path?: string;
  starred?: string;
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  songCount: number;
  duration: number;
  created?: string;
  changed?: string;
  coverArt?: string;
}

export interface Genre {
  value: string;
  songCount: number;
  albumCount: number;
}

export interface SearchResult {
  albums: Album[];
  songs: Song[];
  artists: { id: string; name: string; coverArt?: string }[];
}

const STORAGE_KEY = 'navios_config';
const API_VERSION = '1.16.1';
const CLIENT_NAME = 'NaviOS';

function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

class SubsonicApi {
  private config: ServerConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): ServerConfig | null {
    initProfiles();
    const activeProfile = getActiveProfile();

    let serverUrl = activeProfile?.serverUrl || DEV_CONFIG?.serverUrl || '';
    let username = activeProfile?.username || DEV_CONFIG?.username || '';
    let password = activeProfile?.password || DEV_CONFIG?.password || '';

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.serverUrl) serverUrl = parsed.serverUrl;
        if (parsed.username) username = parsed.username;
        if (parsed.password !== undefined) password = parsed.password;
      }
    } catch (e) {}

    if (serverUrl && username) {
      this.config = {
        serverUrl: this.sanitizeUrl(serverUrl),
        username: username,
        password: password,
      };
      return this.config;
    }

    return null;
  }

  public switchProfile(profileId: string): boolean {
    const profiles = getProfiles();
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return false;

    const currentServerUrl = this.config?.serverUrl || target.serverUrl || DEV_CONFIG?.serverUrl || '';

    setActiveProfileId(target.id);
    this.config = {
      serverUrl: this.sanitizeUrl(currentServerUrl),
      username: target.username,
      password: target.password || '',
    };
    this.clearDetailsCache();
    bumpSessionVersion();
    return true;
  }

  public sanitizeUrl(url: string): string {
    let clean = url.trim();
    clean = clean.replace(/^http:\/*/, 'http://');
    clean = clean.replace(/^https:\/*/, 'https://');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    return clean.replace(/\/+$/, '');
  }

  public setCredentials(serverUrl: string, username: string, password: string): ServerConfig {
    const config: ServerConfig = {
      serverUrl: this.sanitizeUrl(serverUrl),
      username: username.trim(),
      password,
    };
    this.config = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return config;
  }

  public clearConfig(): void {
    this.config = null;
    this.clearDetailsCache();
    localStorage.removeItem(STORAGE_KEY);
  }

  public isConfigured(): boolean {
    return !!(this.config && this.config.serverUrl && this.config.username);
  }

  public getConfig(): ServerConfig | null {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config;
  }

  private getAuthParams(): string {
    if (!this.config) {
      this.loadConfig();
    }
    if (!this.config) throw new Error('Subsonic API not configured');
    // p=enc:hexPass — password auth, no MD5, no tokens, no salt. Simple and reliable.
    const hexPass = stringToHex(this.config.password);
    return `u=${encodeURIComponent(this.config.username)}&p=enc:${hexPass}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;
  }

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.config) {
      this.loadConfig();
    }
    if (!this.config) throw new Error('Subsonic API not configured');

    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    const auth = this.getAuthParams();
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.config.serverUrl}/rest/${endpoint}${separator}${auth}${query ? '&' + query : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const response = data['subsonic-response'];

      if (!response) {
        throw new Error('Invalid Subsonic API response format');
      }

      if (response.status === 'failed') {
        const err = response.error?.message || 'Subsonic API request failed';
        throw new Error(err);
      }

      return response;
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error(`Request timed out after 12s (${url})`);
      }
      throw e;
    }
  }

  public async ping(customConfig?: { serverUrl: string; username: string; password: string }): Promise<boolean> {
    const targetConfig = customConfig || this.getConfig();
    if (!targetConfig || !targetConfig.serverUrl) {
      throw new Error('No server URL configured');
    }

    try {
      const cleanUrl = this.sanitizeUrl(targetConfig.serverUrl);
      const hexPass = stringToHex(targetConfig.password);
      const auth = `u=${encodeURIComponent(targetConfig.username.trim())}&p=enc:${hexPass}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;
      const url = `${cleanUrl}/rest/ping.view?${auth}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
      const data = await res.json();
      const sub = data['subsonic-response'];
      if (sub?.status === 'ok') return true;
      if (sub?.error?.message) throw new Error(`Subsonic error: ${sub.error.message}`);
      return false;
    } catch (err: any) {
      throw new Error(err.message || 'Network error connecting to Navidrome server');
    }
  }

  /**
   * Get album list with full pagination support to browse all albums
   */
  public async getAlbumList(
    type: 'recent' | 'random' | 'alphabeticalByName' | 'frequent' | 'newest' | 'starred' | 'byGenre' | 'byYear' = 'alphabeticalByName',
    size = 500,
    offset = 0,
    genre?: string
  ): Promise<Album[]> {
    const params: Record<string, string | number> = { type, size, offset };
    if (genre) params.genre = genre;

    // Try getAlbumList2.view first
    try {
      const res = await this.request<{ albumList2?: { album?: Album[] }; albumList?: { album?: Album[] } }>('getAlbumList2.view', params);
      const list = res.albumList2?.album || res.albumList?.album;
      if (list && list.length > 0) return list;
    } catch (e) {
      console.warn('getAlbumList2.view failed, trying fallback getAlbumList.view', e);
    }

    // Try getAlbumList.view fallback
    try {
      const res2 = await this.request<{ albumList?: { album?: Album[] } }>('getAlbumList.view', params);
      const list2 = res2.albumList?.album;
      if (list2 && list2.length > 0) return list2;
    } catch (e) {
      console.warn('getAlbumList.view fallback failed', e);
    }

    return [];
  }

  public getCachedAlbum(id: string): { album: Album; songs: Song[] } | undefined {
    return this.albumDetailsCache.get(id);
  }

  public getCachedPlaylist(id: string): { playlist: Playlist; songs: Song[] } | undefined {
    return this.playlistDetailsCache.get(id);
  }

  /**
   * Get real genre list from Navidrome
   */
  public async getGenres(): Promise<Genre[]> {
    const res = await this.request<{ genres?: { genre?: Genre[] } }>('getGenres.view');
    return res.genres?.genre || [];
  }

  /**
   * Get real artist list from Navidrome
   */
  public async getArtists(): Promise<{ id: string; name: string }[]> {
    try {
      const res = await this.request<{ artists?: { index?: { artist?: { id: string; name: string }[] }[] } }>('getArtists.view');
      const artists: { id: string; name: string }[] = [];
      res.artists?.index?.forEach((idx) => {
        if (idx.artist) artists.push(...idx.artist);
      });
      return artists;
    } catch (e) {
      return [];
    }
  }

  /**
   * Subsonic Search 3 for albums, songs, artists with robust local fallback
   */
  public async search3(query: string, songCount = 20, albumCount = 20, artistCount = 10): Promise<SearchResult> {
    const q = query.trim().toLowerCase();
    if (!q) return { albums: [], songs: [], artists: [] };

    try {
      const res = await this.request<{
        searchResult3?: {
          album?: Album[];
          song?: Song[];
          artist?: { id: string; name: string; coverArt?: string }[];
        };
      }>('search3.view', { query: query.trim(), songCount, albumCount, artistCount });

      const albums = res.searchResult3?.album || [];
      const songs = res.searchResult3?.song || [];
      const artists = res.searchResult3?.artist || [];

      return { albums, songs, artists };
    } catch (e) {
      console.warn('search3.view failed, falling back to local library search', e);
      // Fallback: Client-side search across all albums only on actual network or server error
      try {
        const allAlbums = await this.getAlbumList('alphabeticalByName', 500, 0);
        const matchedAlbums = allAlbums.filter(
          (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
        );
        return { albums: matchedAlbums, songs: [], artists: [] };
      } catch (e2) {
        return { albums: [], songs: [], artists: [] };
      }
    }
  }

  private albumDetailsCache = new Map<string, { album: Album; songs: Song[] }>();
  private playlistDetailsCache = new Map<string, { playlist: Playlist; songs: Song[] }>();

  public clearDetailsCache(): void {
    this.albumDetailsCache.clear();
    this.playlistDetailsCache.clear();
  }

  /**
   * Get album tracks (getAlbum.view) with in-memory LRU caching
   */
  public async getAlbum(id: string): Promise<{ album: Album; songs: Song[] }> {
    if (this.albumDetailsCache.has(id)) {
      return this.albumDetailsCache.get(id)!;
    }

    const res = await this.request<{ album?: Album & { song?: Song[] } }>('getAlbum.view', { id });
    const albumData = res.album;
    if (!albumData) {
      throw new Error('Album not found');
    }
    const songs = albumData.song || [];
    const result = {
      album: albumData,
      songs,
    };

    if (this.albumDetailsCache.size >= 30) {
      const firstKey = this.albumDetailsCache.keys().next().value;
      if (firstKey) this.albumDetailsCache.delete(firstKey);
    }
    this.albumDetailsCache.set(id, result);

    return result;
  }

  /**
   * Pre-warm album details in the background
   */
  public async prefetchAlbumDetails(ids: string[]): Promise<void> {
    const uncachedIds = ids.filter((id) => !this.albumDetailsCache.has(id));
    for (let i = 0; i < uncachedIds.length; i += 3) {
      const batch = uncachedIds.slice(i, i + 3);
      await Promise.allSettled(batch.map((id) => this.getAlbum(id)));
    }
  }

  /**
   * Get all user playlists (getPlaylists.view)
   */
  public async getPlaylists(): Promise<Playlist[]> {
    const res = await this.request<{ playlists?: { playlist?: Playlist[] } }>('getPlaylists.view');
    return res.playlists?.playlist || [];
  }

  /**
   * Get playlist details and tracks (getPlaylist.view) with in-memory LRU caching
   */
  public async getPlaylist(id: string): Promise<{ playlist: Playlist; songs: Song[] }> {
    if (this.playlistDetailsCache.has(id)) {
      return this.playlistDetailsCache.get(id)!;
    }

    const res = await this.request<{ playlist?: Playlist & { entry?: Song[] } }>('getPlaylist.view', { id });
    const pl = res.playlist;
    if (!pl) throw new Error('Playlist not found');
    const result = { playlist: pl, songs: pl.entry || [] };

    if (this.playlistDetailsCache.size >= 15) {
      const firstKey = this.playlistDetailsCache.keys().next().value;
      if (firstKey) this.playlistDetailsCache.delete(firstKey);
    }
    this.playlistDetailsCache.set(id, result);

    return result;
  }

  public async getRandomSongs(size = 50, genre?: string): Promise<Song[]> {
    const params: Record<string, string | number> = { size };
    if (genre) params.genre = genre;
    try {
      const res = await this.request<{ randomSongs?: { song?: Song[] } }>('getRandomSongs.view', params);
      return res.randomSongs?.song || [];
    } catch (e) {
      console.error('getRandomSongs failed', e);
      return [];
    }
  }

  /**
   * Pre-warm playlist details in the background
   */
  public async prefetchPlaylistDetails(ids: string[]): Promise<void> {
    const uncachedIds = ids.filter((id) => !this.playlistDetailsCache.has(id));
    for (let i = 0; i < uncachedIds.length; i += 2) {
      const batch = uncachedIds.slice(i, i + 2);
      await Promise.allSettled(batch.map((id) => this.getPlaylist(id)));
    }
  }

  /**
   * Create a new Subsonic playlist (createPlaylist.view)
   */
  public async createPlaylist(name: string, songIds: string[]): Promise<boolean> {
    if (!songIds || songIds.length === 0) return false;
    try {
      const params: Record<string, string | number> = { name: name.trim() };
      // Pass songIds as multiple songId query params
      const songQueryParams = songIds.map((id) => `songId=${encodeURIComponent(id)}`).join('&');
      await this.request(`createPlaylist.view?${songQueryParams}`, params);
      return true;
    } catch (e) {
      console.error('Create playlist failed', e);
      return false;
    }
  }

  /**
   * Star (Like) an album or track
   */
  public async star(id: string, isAlbum = false): Promise<boolean> {
    try {
      const param: Record<string, string> = isAlbum ? { albumId: id } : { id };
      await this.request('star.view', param);
      return true;
    } catch (e) {
      console.error('Star failed', e);
      return false;
    }
  }

  /**
   * Unstar (Unlike) an album or track
   */
  public async unstar(id: string, isAlbum = false): Promise<boolean> {
    try {
      const param: Record<string, string> = isAlbum ? { albumId: id } : { id };
      await this.request('unstar.view', param);
      return true;
    } catch (e) {
      console.error('Unstar failed', e);
      return false;
    }
  }

  /**
   * Get starred content (albums and songs) via getStarred2.view
   */
  public async getStarred2(): Promise<{ albums: Album[]; songs: Song[] }> {
    try {
      const res = await this.request<{
        starred2?: { album?: Album[]; song?: Song[] };
        starred?: { album?: Album[]; song?: Song[] };
      }>('getStarred2.view');
      const data = res.starred2 || res.starred;
      return {
        albums: data?.album || [],
        songs: data?.song || [],
      };
    } catch (e) {
      try {
        const res2 = await this.request<{
          starred?: { album?: Album[]; song?: Song[] };
        }>('getStarred.view');
        return {
          albums: res2.starred?.album || [],
          songs: res2.starred?.song || [],
        };
      } catch (e2) {
        console.error('Failed to get starred content', e2);
        return { albums: [], songs: [] };
      }
    }
  }

  /**
   * Get direct streaming URL (stream.view?id=...)
   */
  public getStreamUrl(id: string): string {
    if (!this.config) return '';
    const auth = this.getAuthParams();
    return `${this.config.serverUrl}/rest/stream.view?${auth}&id=${encodeURIComponent(id)}`;
  }

  /**
   * Get album cover art URL (getCoverArt.view?id=...&size=400)
   */
  public getCoverArtUrl(id?: string, size = 300): string {
    if (!this.config || !id) return '';
    const auth = this.getAuthParams();
    return `${this.config.serverUrl}/rest/getCoverArt.view?${auth}&id=${encodeURIComponent(id)}&size=${size}`;
  }

  /**
   * Get song cover art URL, prioritizing albumId to ensure 100% browser image cache reuse for tracks in the same album
   */
  public getSongCoverArtUrl(song?: Song | null, size = 300): string {
    if (!song) return '';
    const coverId = song.coverArt || song.albumId || song.id;
    return this.getCoverArtUrl(coverId, size);
  }
}

export const api = new SubsonicApi();
