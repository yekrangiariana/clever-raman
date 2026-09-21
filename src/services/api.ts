import { DEV_CONFIG } from '../config/devConfig';
import { APP_NAME } from "../config/constants";
import { initProfiles, getActiveProfile, setActiveProfileId, getProfiles, bumpSessionVersion } from './profiles';
import { updateServerReachability } from './serverReachability';
import { getCacheItem, setCacheItem, clearAllCache } from './dbCache';

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
  owner?: string;
  public?: boolean;
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
const CLIENT_NAME = APP_NAME;

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

  private safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('navios_cache_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.slice(0, Math.max(1, Math.floor(keysToRemove.length / 2))).forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (err) {
        // Silently ignore if quota exceeded
      }
    }
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

  private getAuthParams(includeFormat = true): string {
    if (!this.config) {
      this.loadConfig();
    }
    if (!this.config) throw new Error('Subsonic API not configured');
    const hexPass = stringToHex(this.config.password);
    const base = `u=${encodeURIComponent(this.config.username)}&p=enc:${hexPass}&v=${API_VERSION}&c=${CLIENT_NAME}`;
    return includeFormat ? `${base}&f=json` : base;
  }

  public serverOnline = true;

  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.config) {
      this.loadConfig();
    }
    if (!this.config) throw new Error('Subsonic API not configured');

    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    const auth = this.getAuthParams(true);
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.config.serverUrl}/rest/${endpoint}${separator}${auth}${query ? '&' + query : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      
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

      this.serverOnline = true;
      updateServerReachability(true);
      return response;
    } catch (e: any) {
      if (e.name === 'TypeError' || e.message === 'Failed to fetch' || e.name === 'AbortError') {
        this.serverOnline = false;
        updateServerReachability(false);
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
        const data = await res.json();
        const sub = data['subsonic-response'];
        if (sub?.status === 'ok') {
          this.serverOnline = true;
          return true;
        }
        if (sub?.error?.message) throw new Error(`Subsonic error: ${sub.error.message}`);
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        this.serverOnline = false;
      }
      throw new Error(err.message || 'Network error connecting to Navidrome server');
    }
  }

  /**
   * Get album list with full pagination support to browse all albums
   */
  private albumListCache = new Map<string, Album[]>();

  public getCachedAlbumList(
    type: 'recent' | 'random' | 'alphabeticalByName' | 'frequent' | 'newest' | 'starred' | 'byGenre' | 'byYear' = 'alphabeticalByName',
    size = 500,
    offset = 0,
    genre?: string
  ): Album[] {
    const cacheKey = `navios_cache_albumList_${type}_${size}_${offset}_${genre || ''}`;
    return this.albumListCache.get(cacheKey) || [];
  }

  public async getAlbumList(
    type: 'recent' | 'random' | 'alphabeticalByName' | 'frequent' | 'newest' | 'starred' | 'byGenre' | 'byYear' = 'alphabeticalByName',
    size = 500,
    offset = 0,
    genre?: string
  ): Promise<Album[]> {
    const params: Record<string, string | number> = { type, size, offset };
    if (genre) params.genre = genre;

    const cacheKey = `navios_cache_albumList_${type}_${size}_${offset}_${genre || ''}`;

    // Try getAlbumList2.view first
    try {
      const res = await this.request<{ albumList2?: { album?: Album[] }; albumList?: { album?: Album[] } }>('getAlbumList2.view', params);
      const list = res.albumList2?.album || res.albumList?.album;
      if (list && list.length > 0) {
        this.albumListCache.set(cacheKey, list);
        setCacheItem(cacheKey, list).catch(() => {});
        return list;
      }
    } catch (e: any) {
      console.warn('getAlbumList2.view failed, trying fallback getAlbumList.view', e);
      try {
        const res2 = await this.request<{ albumList?: { album?: Album[] } }>('getAlbumList.view', params);
        const list2 = res2.albumList?.album;
        if (list2 && list2.length > 0) {
          this.albumListCache.set(cacheKey, list2);
          setCacheItem(cacheKey, list2).catch(() => {});
          return list2;
        }
      } catch (e2) {
        console.warn('getAlbumList.view fallback failed', e2);
      }
    }

    const idbCached = await getCacheItem<Album[]>(cacheKey);
    if (idbCached) {
      this.albumListCache.set(cacheKey, idbCached);
      return idbCached;
    }

    return this.albumListCache.get(cacheKey) || [];
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
  public getCachedGenres(): Genre[] {
    try {
      const cached = localStorage.getItem('navios_cache_genres');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  }

  public async getGenres(): Promise<Genre[]> {
    const cacheKey = 'navios_cache_genres';

    try {
      const res = await this.request<{ genres?: { genre?: Genre[] } }>('getGenres.view');
      const list = res.genres?.genre || [];
      this.safeSetItem(cacheKey, JSON.stringify(list));
      return list;
    } catch (err) {
      return this.getCachedGenres();
    }
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
      console.warn('search3.view failed', e);
      return { albums: [], songs: [], artists: [] };
    }
  }

  private albumDetailsCache = new Map<string, { album: Album; songs: Song[] }>();
  private playlistDetailsCache = new Map<string, { playlist: Playlist; songs: Song[] }>();

  public clearDetailsCache(): void {
    this.albumDetailsCache.clear();
    this.playlistDetailsCache.clear();
  }

  public async clearAllCaches(): Promise<void> {
    this.albumListCache.clear();
    this.albumDetailsCache.clear();
    this.playlistDetailsCache.clear();
    this.playlistsMemoryCache = [];
    this.customCoverMemoryMap.clear();

    await clearAllCache();

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('navios_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  }

  public async getAlbum(id: string): Promise<{ album: Album; songs: Song[] }> {
    if (this.albumDetailsCache.has(id)) {
      return this.albumDetailsCache.get(id)!;
    }

    const cacheKey = `navios_cache_album_${id}`;

    let result: { album: Album; songs: Song[] };
    try {
      const res = await this.request<{ album?: Album & { song?: Song[] } }>('getAlbum.view', { id });
      const albumData = res.album;
      if (!albumData) throw new Error('Album not found');
      
      const songs = albumData.song || [];
      result = { album: albumData, songs };
      setCacheItem(cacheKey, result).catch(() => {});
    } catch (e) {
      const idbCached = await getCacheItem<{ album: Album; songs: Song[] }>(cacheKey);
      if (idbCached) {
        result = idbCached;
      } else {
        throw e;
      }
    }

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
  private playlistsMemoryCache: Playlist[] = [];

  public getCachedPlaylists(): Playlist[] {
    return this.playlistsMemoryCache;
  }

  public async getPlaylists(): Promise<Playlist[]> {
    const cacheKey = 'navios_cache_playlists';
    try {
      const res = await this.request<{ playlists?: { playlist?: Playlist | Playlist[] } }>('getPlaylists.view');
      const pl = res.playlists?.playlist;
      const list = pl ? (Array.isArray(pl) ? pl : [pl]) : [];
      if (list.length > 0) {
        // Organize playlists by last created date by default
        list.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
        this.playlistsMemoryCache = list;
        setCacheItem(cacheKey, list).catch(() => {});
        // Pre-warm custom cover art into memory
        list.forEach((p) => {
          if (!this.customCoverMemoryMap.has(p.id)) {
            getCacheItem<string>(`custom_cover_pl_${p.id}`).then((c) => {
              if (c) this.customCoverMemoryMap.set(p.id, c);
            });
          }
        });
      }
      return list;
    } catch (e) {
      const idbCached = await getCacheItem<Playlist[]>(cacheKey);
      if (idbCached) {
        idbCached.sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
        this.playlistsMemoryCache = idbCached;
        return idbCached;
      }
      return this.playlistsMemoryCache;
    }
  }

  /**
   * Get playlist details and tracks (getPlaylist.view) with in-memory LRU caching
   */
  public async getPlaylist(id: string): Promise<{ playlist: Playlist; songs: Song[] }> {
    if (this.playlistDetailsCache.has(id)) {
      return this.playlistDetailsCache.get(id)!;
    }

    const cacheKey = `navios_cache_playlist_${id}`;

    let result: { playlist: Playlist; songs: Song[] };
    try {
      const res = await this.request<{ playlist?: Playlist & { entry?: Song | Song[] } }>('getPlaylist.view', { id });
      const pl = res.playlist;
      if (!pl) throw new Error('Playlist not found');
      
      let songs: Song[] = [];
      if (pl.entry) {
        songs = Array.isArray(pl.entry) ? pl.entry : [pl.entry];
      }
      result = { playlist: pl, songs };
      setCacheItem(cacheKey, result).catch(() => {});
    } catch (e) {
      const idbCached = await getCacheItem<{ playlist: Playlist; songs: Song[] }>(cacheKey);
      if (idbCached) {
        result = idbCached;
      } else {
        throw e;
      }
    }

    if (this.playlistDetailsCache.size >= 15) {
      const firstKey = this.playlistDetailsCache.keys().next().value;
      if (firstKey) this.playlistDetailsCache.delete(firstKey);
    }
    this.playlistDetailsCache.set(id, result);

    return result;
  }

  public async getRandomSongs(size = 50, genre?: string): Promise<Song[]> {
    const cacheKey = `navios_cache_random_songs_${genre || 'all'}`;

    const params: Record<string, string | number> = { size };
    if (genre) params.genre = genre;
    try {
      const res = await this.request<{ randomSongs?: { song?: Song[] } }>('getRandomSongs.view', params);
      const list = res.randomSongs?.song || [];
      setCacheItem(cacheKey, list).catch(() => {});
      return list;
    } catch (e) {
      console.warn('getRandomSongs.view failed', e);
      const idbCached = await getCacheItem<Song[]>(cacheKey);
      return idbCached || [];
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
    try {
      const params: Record<string, string | number> = { name: name.trim() };
      let queryParams = '';
      if (songIds && songIds.length > 0) {
        queryParams = songIds.map((id) => `songId=${encodeURIComponent(id)}`).join('&');
      }
      await this.request(`createPlaylist.view?${queryParams}`, params);
      return true;
    } catch (e) {
      console.error('Create playlist failed', e);
      return false;
    }
  }

  /**
   * Test if a playlist is writable by sending a safe update request.
   */
  public async testPlaylistWritable(playlistId: string, currentName: string): Promise<boolean> {
    try {
      const params: Record<string, string | number> = { playlistId, name: currentName };
      await this.request('updatePlaylist.view', params);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Update an existing Subsonic playlist (updatePlaylist.view)
   */
  public async updatePlaylist(playlistId: string, songIdsToAdd: string[]): Promise<boolean> {
    if (!songIdsToAdd || songIdsToAdd.length === 0) return false;
    try {
      const params: Record<string, string | number> = { playlistId };
      const songQueryParams = songIdsToAdd.map((id) => `songIdToAdd=${encodeURIComponent(id)}`).join('&');
      await this.request(`updatePlaylist.view?${songQueryParams}`, params);
      this.playlistDetailsCache.delete(playlistId);
      return true;
    } catch (e) {
      console.error('Update playlist failed', e);
      return false;
    }
  }

  /**
   * Remove songs from an existing Subsonic playlist (updatePlaylist.view)
   */
  public async removeFromPlaylist(playlistId: string, songIndexesToRemove: number[]): Promise<boolean> {
    if (!songIndexesToRemove || songIndexesToRemove.length === 0) return false;
    try {
      const params: Record<string, string | number> = { playlistId };
      const songQueryParams = songIndexesToRemove.map((idx) => `songIndexToRemove=${idx}`).join('&');
      await this.request(`updatePlaylist.view?${songQueryParams}`, params);
      this.playlistDetailsCache.delete(playlistId);
      return true;
    } catch (e) {
      console.error('Remove from playlist failed', e);
      return false;
    }
  }

  /**
   * Delete an existing Subsonic playlist (deletePlaylist.view)
   */
  public async deletePlaylist(id: string): Promise<boolean> {
    try {
      await this.request('deletePlaylist.view', { id });
      this.playlistDetailsCache.delete(id);
      return true;
    } catch (e) {
      console.error('Delete playlist failed', e);
      return false;
    }
  }



  /**
   * Reorder a playlist by replacing all its tracks.
   * Sends songIndexToRemove for all old songs, and songIdToAdd for the new order in a single request.
   */
  public async replacePlaylist(playlistId: string, oldSongCount: number, newSongIds: string[]): Promise<boolean> {
    try {
      const params: Record<string, string | number> = { playlistId };
      const removeParams = Array.from({ length: oldSongCount }, (_, i) => `songIndexToRemove=${i}`).join('&');
      const addParams = newSongIds.map(id => `songIdToAdd=${encodeURIComponent(id)}`).join('&');
      const queryParams = [removeParams, addParams].filter(Boolean).join('&');
      
      await this.request(`updatePlaylist.view?${queryParams}`, params);
      this.playlistDetailsCache.delete(playlistId);
      return true;
    } catch (e) {
      console.error('Replace playlist failed', e);
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
    const cacheKey = 'navios_cache_starred';

    try {
      const res = await this.request<{
        starred2?: { album?: Album[]; song?: Song[] };
        starred?: { album?: Album[]; song?: Song[] };
      }>('getStarred2.view');
      const data = res.starred2 || res.starred;
      const result = {
        albums: data?.album || [],
        songs: data?.song || [],
      };
      setCacheItem(cacheKey, result).catch(() => {});
      return result;
    } catch (e: any) {
      try {
        const res2 = await this.request<{
          starred?: { album?: Album[]; song?: Song[] };
        }>('getStarred.view');
        const result = {
          albums: res2.starred?.album || [],
          songs: res2.starred?.song || [],
        };
        setCacheItem(cacheKey, result).catch(() => {});
        return result;
      } catch (e2) {
        const idbCached = await getCacheItem<{ albums: Album[]; songs: Song[] }>(cacheKey);
        return idbCached || { albums: [], songs: [] };
      }
    }
  }

  /**
   * Get direct streaming URL (stream.view?id=...)
   */
  public getStreamUrl(id: string, format?: string): string {
    if (!this.config) return '';
    const auth = this.getAuthParams(false);
    let url = `${this.config.serverUrl}/rest/stream.view?${auth}&id=${encodeURIComponent(id)}`;
    if (format) url += `&format=${format}`;
    return url;
  }

  /**
   * Get direct download URL (download.view?id=...)
   */
  public getDownloadUrl(id: string): string {
    if (!this.config) return '';
    const auth = this.getAuthParams(false);
    return `${this.config.serverUrl}/rest/download.view?${auth}&id=${encodeURIComponent(id)}`;
  }

  /**
   * Get album cover art URL (getCoverArt.view?id=...&size=500)
   */
  public getCoverArtUrl(id?: string, size = 500): string {
    if (!id) return '';
    if (!this.config) return '';
    const auth = this.getAuthParams(false);
    return `${this.config.serverUrl}/rest/getCoverArt.view?${auth}&id=${encodeURIComponent(id)}&size=${size}`;
  }

  /**
   * Get song cover art URL, prioritizing albumId to ensure 100% browser image cache reuse for tracks in the same album
   */
  public getSongCoverArtUrl(song?: Song | null, size = 500): string {
    if (!song) return '';
    const coverId = song.coverArt || song.albumId || song.id;
    return this.getCoverArtUrl(coverId, size);
  }

  /**
   * Custom local cover art for playlists (stored in IndexedDB)
   */
  private customCoverMemoryMap = new Map<string, string>();

  public setCustomPlaylistCover(playlistId: string, base64Image: string) {
    this.customCoverMemoryMap.set(playlistId, base64Image);
    setCacheItem(`custom_cover_pl_${playlistId}`, base64Image).catch(() => {});
  }

  public getCustomPlaylistCover(playlistId: string): string | null {
    if (this.customCoverMemoryMap.has(playlistId)) {
      return this.customCoverMemoryMap.get(playlistId)!;
    }
    getCacheItem<string>(`custom_cover_pl_${playlistId}`).then((res) => {
      if (res) this.customCoverMemoryMap.set(playlistId, res);
    });
    return null;
  }
}

export const api = new SubsonicApi();
