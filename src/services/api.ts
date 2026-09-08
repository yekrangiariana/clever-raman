import { DEV_CONFIG } from '../config/devConfig';

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

const STORAGE_KEY = 'navidrome_tv_config';
const API_VERSION = '1.16.1';
const CLIENT_NAME = 'navidrome-tv';

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
    // DEV_CONFIG always wins — hardcoded credentials take priority over anything stored.
    if (DEV_CONFIG && DEV_CONFIG.serverUrl && DEV_CONFIG.username && DEV_CONFIG.password) {
      this.config = {
        serverUrl: DEV_CONFIG.serverUrl,
        username: DEV_CONFIG.username,
        password: DEV_CONFIG.password,
      };
      return this.config;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
        return this.config;
      }
    } catch (e) {
      console.error('Failed to load Subsonic config', e);
    }

    return null;
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
    return this.config;
  }

  private getAuthParams(): string {
    if (!this.config) throw new Error('Subsonic API not configured');
    // p=enc:hexPass — password auth, no MD5, no tokens, no salt. Simple and reliable.
    const hexPass = stringToHex(this.config.password);
    return `u=${encodeURIComponent(this.config.username)}&p=enc:${hexPass}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;
  }

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.config) throw new Error('Subsonic API not configured');

    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    const auth = this.getAuthParams();
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.config.serverUrl}/rest/${endpoint}${separator}${auth}${query ? '&' + query : ''}`;

    const res = await fetch(url);
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
  }

  public async ping(customConfig?: { serverUrl: string; username: string; password: string }): Promise<boolean> {
    if (customConfig) {
      try {
        const cleanUrl = this.sanitizeUrl(customConfig.serverUrl);
        const hexPass = stringToHex(customConfig.password);
        const auth = `u=${encodeURIComponent(customConfig.username.trim())}&p=enc:${hexPass}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;
        const url = `${cleanUrl}/rest/ping.view?${auth}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        const sub = data['subsonic-response'];
        if (sub?.status === 'ok') return true;
        if (sub?.error?.message) throw new Error(`Subsonic error: ${sub.error.message}`);
        return false;
      } catch (err: any) {
        throw new Error(err.message || 'Network error connecting to Navidrome server');
      }
    }

    try {
      const res = await this.request<{ status: string }>('ping.view');
      return res.status === 'ok';
    } catch (e) {
      return false;
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

    // If type wasn't alphabeticalByName, try alphabeticalByName as final safety net
    if (type !== 'alphabeticalByName') {
      try {
        const fallbackRes = await this.request<{ albumList2?: { album?: Album[] }; albumList?: { album?: Album[] } }>('getAlbumList2.view', { type: 'alphabeticalByName', size, offset });
        return fallbackRes.albumList2?.album || fallbackRes.albumList?.album || [];
      } catch (e) {}
    }

    return [];
  }

  /**
   * Get real genre list from Navidrome
   */
  public async getGenres(): Promise<Genre[]> {
    const res = await this.request<{ genres?: { genre?: Genre[] } }>('getGenres.view');
    return res.genres?.genre || [];
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

      if (albums.length > 0 || songs.length > 0 || artists.length > 0) {
        return { albums, songs, artists };
      }
    } catch (e) {
      console.warn('search3.view failed, falling back to local library search', e);
    }

    // Fallback: Client-side search across all albums
    try {
      const allAlbums = await this.getAlbumList('alphabeticalByName', 500, 0);
      const matchedAlbums = allAlbums.filter(
        (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
      );
      return { albums: matchedAlbums, songs: [], artists: [] };
    } catch (e) {
      return { albums: [], songs: [], artists: [] };
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
      const param = isAlbum ? { albumId: id } : { id };
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
      const param = isAlbum ? { albumId: id } : { id };
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
   * Get album cover art URL (getCoverArt.view?id=...&size=800)
   */
  public getCoverArtUrl(id?: string, size = 800): string {
    if (!this.config || !id) return '';
    const auth = this.getAuthParams();
    return `${this.config.serverUrl}/rest/getCoverArt.view?${auth}&id=${encodeURIComponent(id)}&size=${size}`;
  }
}

export const api = new SubsonicApi();
