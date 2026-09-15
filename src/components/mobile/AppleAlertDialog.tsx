import { Component, Show } from 'solid-js';

interface AppleAlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const AppleAlertDialog: Component<AppleAlertDialogProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={props.onClose}
      >
        <div 
          class="w-[320px] max-w-[90vw] bg-white/8 border border-white/15 backdrop-blur-3xl rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl shadow-black/80 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 text-[#fa243c]">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <h3 class="font-extrabold text-xl text-white tracking-tight">{props.title}</h3>
          <p class="text-xs text-neutral-300 mt-2 leading-relaxed">{props.message}</p>

          <div class="flex items-center gap-3 w-full mt-6">
            <Show when={props.cancelText !== ''}>
              <button
                onClick={props.onClose}
                class="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md rounded-2xl text-sm font-extrabold text-white active:scale-95 transition-all"
              >
                {props.cancelText || 'Cancel'}
              </button>
            </Show>

            <button
              onClick={() => {
                props.onConfirm();
                props.onClose();
              }}
              class={`flex-1 py-3 px-4 rounded-2xl text-sm font-extrabold active:scale-95 transition-all shadow-md ${
                props.destructive
                  ? 'bg-[#fa243c] hover:bg-[#d91d34] text-white'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {props.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
