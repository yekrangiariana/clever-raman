import { Component, Show } from 'solid-js';
import { focusEngine } from '../../services/focus';

export const ExitConfirmModal: Component = () => {
  const isOpen = () => focusEngine.activeModal() === 'exitConfirm';

  return (
    <Show when={isOpen()}>
      <div class="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-8">
        <h2 class="text-4xl font-semibold text-white tracking-normal mb-9 text-center">
          Do you want to exit NaviOS?
        </h2>

        <div class="flex flex-col gap-3.5 items-center w-full">
          <button
            onClick={() => focusEngine.exitApp()}
            class="w-[420px] py-4 rounded-2xl text-2xl font-bold text-center cursor-pointer select-none"
            data-focusable="true"
            data-section="exitConfirm"
            data-index="0"
          >
            Exit
          </button>

          <button
            onClick={() => focusEngine.cancelExit()}
            class="w-[420px] py-4 rounded-2xl text-2xl font-bold text-center cursor-pointer select-none"
            data-focusable="true"
            data-section="exitConfirm"
            data-index="1"
          >
            Cancel
          </button>
        </div>
      </div>
    </Show>
  );
};
