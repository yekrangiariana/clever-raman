import { Component, Show } from 'solid-js';
import { audioPlayer } from '../../services/audio';
import { CheckIcon } from './Icons';

export const ToastNotification: Component = () => {
  return (
    <Show when={audioPlayer.toastMessage()}>
      <div class="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none">
        <div class="px-8 py-4 rounded-full bg-[#1c1e24]/95 border border-white/20 text-white font-extrabold text-2xl shadow-2xl flex items-center gap-3.5 ">
          <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckIcon class="w-4 h-4 text-white" />
          </div>
          <span class="tracking-tight">{audioPlayer.toastMessage()}</span>
        </div>
      </div>
    </Show>
  );
};
