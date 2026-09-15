import { Component, createResource, createMemo, Show, For, onCleanup, createEffect } from 'solid-js';
import { App } from '@capacitor/app';
import { getStorageStats, StorageStats } from '../../services/offlineSync';
import { PlaylistsIcon, MusicNoteIcon } from '../common/Icons';
import { api } from '../../services/api';
import { setGlobalSelectedAlbumId, setGlobalSelectedPlaylistId } from '../../services/uiState';

interface MobileStorageSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Segment colours matching iOS storage bar palette
const SEGMENT_COLOURS = [
  '#2c7be5', // blue  – albums
  '#8e44ef', // purple – playlists
  '#34c759', // green
  '#ff9500', // orange
  '#ff3b30', // red
  '#5ac8fa', // teal
  '#ff2d55', // pink
  '#af52de', // lavender
];

export const MobileStorageSheet: Component<MobileStorageSheetProps> = (props) => {
  const [stats] = createResource<StorageStats, boolean>(
    () => props.isOpen,
    async (isOpen) => {
      if (!isOpen) return { totalBytes: 0, deviceTotalBytes: 100 * 1024 * 1024 * 1024, songCount: 0, collections: [] };
      return await getStorageStats();
    }
  );

  // Format bytes exactly the way iOS does: 1 decimal place, GB preferred
  const formatBytes = (bytes: number, precision = 1): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    return `${i >= 3 ? value.toFixed(precision) : Math.round(value)} ${sizes[i]}`;
  };

  const colourFor = (index: number) => SEGMENT_COLOURS[index % SEGMENT_COLOURS.length];

  // Group segment widths as percentages of total by type (Albums vs Playlists)
  const segments = createMemo(() => {
    const data = stats();
    if (!data || data.totalBytes === 0) return [];
    
    let albumsBytes = 0;
    let playlistsBytes = 0;
    
    for (const col of data.collections) {
      if (col.type === 'album') albumsBytes += col.bytes;
      else if (col.type === 'playlist') playlistsBytes += col.bytes;
    }
    
    const result = [];
    if (albumsBytes > 0) {
      result.push({
        name: 'Albums',
        bytes: albumsBytes,
        colour: SEGMENT_COLOURS[0],
        pct: (albumsBytes / data.totalBytes) * 100
      });
    }
    if (playlistsBytes > 0) {
      result.push({
        name: 'Playlists',
        bytes: playlistsBytes,
        colour: SEGMENT_COLOURS[1],
        pct: (playlistsBytes / data.totalBytes) * 100
      });
    }
    
    return result;
  });

  // Handle Android hardware/swipe back button
  createEffect(() => {
    if (props.isOpen) {
      const listener = App.addListener('backButton', () => {
        props.onClose();
      });
      onCleanup(() => {
        listener.then(l => l.remove());
      });
    }
  });

  return (
    <Show when={props.isOpen}>
      {/* Full-screen native push navigation feel */}
      <div class="fixed inset-0 z-[200] flex flex-col bg-black text-white">
        
        {/* ── Navigation Bar ── iOS push nav bar style */}
        <div
          class="shrink-0 relative flex items-center px-2"
          style={{
            'padding-top': 'env(safe-area-inset-top, 14px)',
            'min-height': 'calc(44px + env(safe-area-inset-top, 14px))',
            background: 'rgba(14,14,18,0.94)',
            'backdrop-filter': 'blur(20px)',
            '-webkit-backdrop-filter': 'blur(20px)',
            'border-bottom': '0.5px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Back button — exact iOS style: chevron + parent screen name */}
          <button
            onClick={props.onClose}
            class="flex items-center gap-0.5 text-[#fa243c] active:opacity-40 transition-opacity h-11 pl-2 pr-4"
          >
            <svg class="w-[11px] h-[19px] shrink-0" viewBox="0 0 11 19" fill="none">
              <path d="M9.5 1L1 9.5L9.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="text-[17px] font-normal ml-0.5">Settings</span>
          </button>

          {/* Centred title */}
          <span class="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ top: 'env(safe-area-inset-top, 14px)', height: '44px' }}>
            <span class="text-[17px] font-semibold tracking-[-0.4px]">NaviOS Storage</span>
          </span>
        </div>

        {/* ── Scrollable Content ── */}
        <div class="flex-1 overflow-y-auto scrollbar-none" style={{ background: 'transparent' }}>

          {/* Loading skeleton */}
          <Show when={stats.loading}>
            <div class="px-4 pt-8 pb-4 flex flex-col gap-4">
              {/* Skeleton bar */}
              <div class="h-[28px] rounded-[6px] overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div class="flex justify-between">
                <div class="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div class="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div class="mt-6 h-3 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div class="rounded-[10px] overflow-hidden animate-pulse h-24" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </Show>

          <Show when={!stats.loading && stats()}>
            {(data) => {
              const totalPct = Math.min(100, Math.max(0, (data().totalBytes / data().deviceTotalBytes) * 100));

              return (
                <div class="flex flex-col">

                  {/* ── Storage Bar Section ── */}
                  <div class="px-4 pt-8 pb-5">

                    {/* Total used headline */}
                    <div class="mb-4">
                      <p class="text-[15px] text-[#8e8e93] font-normal leading-snug">
                        <span class="text-white font-semibold text-[17px]">{formatBytes(data().totalBytes)}</span>
                        {' '}used out of {formatBytes(data().deviceTotalBytes, 0)}
                      </p>
                      <p class="text-[13px] text-[#8e8e93] mt-0.5">
                        {data().songCount} {data().songCount === 1 ? 'song' : 'songs'} · {data().collections.length} {data().collections.length === 1 ? 'collection' : 'collections'}
                      </p>
                    </div>

                    {/* ── Segmented iOS storage bar ── */}
                    <div
                      class="w-full overflow-hidden flex"
                      style={{ height: '28px', 'border-radius': '6px', gap: '1.5px', background: '#2c2c2e' }}
                    >
                      <Show when={data().totalBytes === 0}>
                        <div class="flex-1 h-full bg-white/10" />
                      </Show>
                      <For each={segments()}>
                        {(seg) => (
                          <div
                            style={{
                              width: `${seg.pct * (totalPct / 100)}%`, // Proper proportion inside total width
                              'min-width': seg.bytes > 0 ? '2px' : '0px',
                              background: seg.colour,
                              height: '100%',
                              transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                            }}
                          />
                        )}
                      </For>
                      {/* Remaining Free Space */}
                      <Show when={totalPct < 100 && data().totalBytes > 0}>
                         <div class="flex-1 h-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      </Show>
                    </div>

                    {/* Colour legend */}
                    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                      <For each={segments()}>
                        {(seg) => (
                          <div class="flex items-center gap-1.5">
                            <div class="w-2 h-2 rounded-[2px] shrink-0" style={{ background: seg.colour }} />
                            <span class="text-[11px] text-[#8e8e93] font-medium truncate max-w-[110px]">{seg.name}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* ── Grouped Table Section ── iOS inset grouped list */}
                  <div class="px-4 pb-12">
                    <p
                      class="text-[13px] font-semibold uppercase tracking-wide mb-2 px-1"
                      style={{ color: '#8e8e93', 'letter-spacing': '0.06em' }}
                    >
                      Downloaded Collections
                    </p>

                    <Show when={data().collections.length === 0}>
                      <div
                        class="rounded-[10px] px-4 py-8 flex flex-col items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <svg class="w-10 h-10 text-[#3a3a3c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                        </svg>
                        <p class="text-[13px] text-[#8e8e93]">No offline downloads yet</p>
                      </div>
                    </Show>

                    <Show when={data().collections.length > 0}>
                      <div class="rounded-[10px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <For each={data().collections}>
                          {(col, index) => {
                            const colour = col.type === 'album' ? SEGMENT_COLOURS[0] : SEGMENT_COLOURS[1];
                            const cover = api.getCoverArtUrl(col.coverArt, 100);
                            return (
                              <>
                                {/* Separator (not before first item) */}
                                <Show when={index() > 0}>
                                  <div class="ml-[60px] h-[0.5px]" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                </Show>
                                <div 
                                  class="flex items-center px-4 py-2.5 gap-3 active:bg-white/10 transition-colors cursor-pointer"
                                  onClick={() => {
                                    if (col.type === 'album') setGlobalSelectedAlbumId(col.id);
                                    else if (col.type === 'playlist') setGlobalSelectedPlaylistId(col.id);
                                  }}
                                >
                                  {/* Icon — coloured rounded square like iOS app icon */}
                                  <div
                                    class="w-[44px] h-[44px] rounded-[10px] shrink-0 flex items-center justify-center overflow-hidden relative"
                                    style={{ background: colour + '22', 'border': `1px solid ${colour}44` }}
                                  >
                                    <Show
                                      when={cover}
                                      fallback={
                                        col.type === 'playlist'
                                          ? <PlaylistsIcon class="w-5 h-5" style={{ color: colour }} />
                                          : <MusicNoteIcon class="w-5 h-5" style={{ color: colour }} />
                                      }
                                    >
                                      <img
                                        src={cover}
                                        alt={col.name}
                                        class="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </Show>
                                  </div>

                                  {/* Text */}
                                  <div class="flex-1 min-w-0">
                                    <p class="text-[15px] font-normal text-white truncate leading-tight tracking-[-0.2px]">
                                      {col.name}
                                    </p>
                                    <p class="text-[13px] mt-[1px]" style={{ color: '#8e8e93' }}>
                                      {col.type === 'playlist' ? 'Playlist' : 'Album'} · {col.songCount} {col.songCount === 1 ? 'Song' : 'Songs'}
                                    </p>
                                  </div>

                                  {/* Size (right-aligned, secondary grey like iOS) */}
                                  <div class="flex flex-col items-end shrink-0 pl-2">
                                    <span class="text-[15px] font-normal text-white">{formatBytes(col.bytes)}</span>
                                  </div>
                                </div>
                              </>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>

                </div>
              );
            }}
          </Show>
        </div>
      </div>
    </Show>
  );
};
