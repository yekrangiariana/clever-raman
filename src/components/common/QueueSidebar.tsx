import { Component, For, Show } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { Song } from '../../services/api';
import { TrashIcon } from './Icons';

interface QueueSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (song: Song, index: number) => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const QueueSidebar: Component<QueueSidebarProps> = (props) => {
  const queue = () => audioPlayer.queue();
  const currentIndex = () => audioPlayer.currentIndex();

  return (
    <Show when={props.isOpen}>
      <aside
        class="fixed right-0 top-0 bottom-0 w-[480px] bg-neutral-950/95 border-l border-neutral-800 shadow-2xl z-50 flex flex-col p-8 backdrop-blur-xl animate-slide-left"
        data-sidebar="queue"
      >
        {/* Header */}
        <div class="flex items-center justify-between pb-6 border-b border-neutral-800 shrink-0">
          <div>
            <h2 class="text-3xl font-black text-white tracking-tight">Up Next Queue</h2>
            <p class="text-xl text-neutral-400 font-medium mt-1">
              {queue().length} {queue().length === 1 ? 'Track' : 'Tracks'} in Queue
            </p>
          </div>
          {queue().length > 0 && (
            <button
              onClick={() => audioPlayer.clearQueue()}
              class="px-4 py-2 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-lg font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tracklist Queue */}
        <div class="flex-1 overflow-y-auto mt-6 flex flex-col gap-3 pr-2">
          <For each={queue()}>
            {(song, index) => {
              const isPlaying = () => index() === currentIndex();
              return (
                <div
                  onClick={() => props.onSelectTrack(song, index())}
                  class={`p-5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${
                    isPlaying()
                      ? 'bg-white text-black font-extrabold border-white shadow-xl scale-[1.02]'
                      : 'bg-neutral-900/80 text-neutral-200 border-neutral-800 hover:bg-neutral-800'
                  }`}
                  data-focusable="true"
                  data-variant="list"
                  data-section="queue"
                  data-index={index()}
                >
                  <div class="flex items-center gap-4 truncate flex-1 min-w-0">
                    <span class={`font-mono text-xl font-bold w-6 text-right shrink-0 ${isPlaying() ? 'text-black' : 'text-neutral-500'}`}>
                      {index() + 1}.
                    </span>
                    <div class="flex flex-col truncate min-w-0 flex-1">
                      <span class="text-2xl font-extrabold truncate">{song.title}</span>
                      <span class={`text-lg truncate font-medium ${isPlaying() ? 'text-neutral-700' : 'text-neutral-400'}`}>
                        {song.artist}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 shrink-0 ml-4">
                    <span class={`font-mono text-lg font-extrabold ${isPlaying() ? 'text-black' : 'text-neutral-400'}`}>
                      {formatDuration(song.duration)}
                    </span>
                    {!isPlaying() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioPlayer.removeFromQueue(index());
                        }}
                        class="p-2 text-neutral-500 hover:text-red-400 rounded-full"
                        title="Remove"
                      >
                        <TrashIcon class="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </aside>
    </Show>
  );
};
